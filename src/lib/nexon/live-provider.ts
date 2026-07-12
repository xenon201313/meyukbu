import type { NormalizedCharacterProfile } from "@/domain/character";
import type { AppEnvironment } from "@/lib/env";
import { NexonProviderError, type NexonErrorCode } from "@/lib/nexon/errors";
import { normalizeCharacterProfile } from "@/lib/nexon/normalize";
import {
  nexonCashItemEquipmentSchema,
  nexonCharacterBasicSchema,
  nexonCharacterStatSchema,
  nexonErrorSchema,
  nexonItemEquipmentSchema,
  nexonOcidSchema,
  nexonSetEffectSchema,
  nexonSymbolEquipmentSchema,
} from "@/lib/nexon/schemas";
import type { NexonProvider } from "@/lib/nexon/provider";

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const responseCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

function codeFromResponse(value: unknown): NexonErrorCode {
  const result = nexonErrorSchema.safeParse(value);
  if (!result.success) {
    return "NETWORK";
  }
  const code = result.data.error.name;
  switch (code) {
    case "OPENAPI00001":
    case "OPENAPI00002":
    case "OPENAPI00003":
    case "OPENAPI00004":
    case "OPENAPI00005":
    case "OPENAPI00006":
    case "OPENAPI00007":
    case "OPENAPI00009":
    case "OPENAPI00010":
    case "OPENAPI00011":
      return code;
    default:
      return "NETWORK";
  }
}

/** Server-only adapter for the documented NEXON character endpoints. */
export class LiveNexonProvider implements NexonProvider {
  readonly mode = "live" as const;

  constructor(private readonly environment: AppEnvironment) {}

  async resolveCharacter(name: string): Promise<{ ocid: string }> {
    const response = await this.request(`/id?character_name=${encodeURIComponent(name)}`);
    const parsed = nexonOcidSchema.safeParse(response);
    if (!parsed.success) {
      throw new NexonProviderError("INVALID_RESPONSE", "Invalid OCID response.");
    }
    return parsed.data;
  }

  async getProfile(ocid: string, options?: { date?: string }): Promise<NormalizedCharacterProfile> {
    const query = new URLSearchParams({ ocid });
    if (options?.date) {
      query.set("date", options.date);
    }
    const queryString = query.toString();
    const response = await this.request(`/character/basic?${queryString}`);
    const parsed = nexonCharacterBasicSchema.safeParse(response);
    if (!parsed.success) {
      throw new NexonProviderError("INVALID_RESPONSE", "Invalid character/basic response.");
    }

    // Base identity is required. The rest may be unavailable for a single character or
    // temporarily fail, so all supplementary requests are isolated from one another.
    const [stat, equipment, symbols, cashEquipment, setEffects] = await Promise.all([
      this.optionalRequest(`/character/stat?${queryString}`, nexonCharacterStatSchema),
      this.optionalRequest(`/character/item-equipment?${queryString}`, nexonItemEquipmentSchema),
      this.optionalRequest(`/character/symbol-equipment?${queryString}`, nexonSymbolEquipmentSchema),
      this.optionalRequest(`/character/cashitem-equipment?${queryString}`, nexonCashItemEquipmentSchema),
      this.optionalRequest(`/character/set-effect?${queryString}`, nexonSetEffectSchema),
    ]);

    return normalizeCharacterProfile(ocid, parsed.data, {
      ...(stat ? { stat } : {}),
      ...(equipment ? { equipment } : {}),
      ...(symbols ? { symbols } : {}),
      ...(cashEquipment ? { cashEquipment } : {}),
      ...(setEffects ? { setEffects } : {}),
    });
  }

  /** A non-basic endpoint cannot make a profile unwriteable when it is unavailable. */
  private async optionalRequest<T>(
    path: string,
    schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
  ): Promise<T | undefined> {
    try {
      const response = await this.request(path);
      const parsed = schema.safeParse(response);
      return parsed.success ? parsed.data : undefined;
    } catch {
      return undefined;
    }
  }

  private async request(path: string): Promise<unknown> {
    const cacheKey = path;
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const existing = inFlight.get(cacheKey);
    if (existing) {
      return existing;
    }

    const request = this.retryingFetch(path)
      .then((value) => {
        responseCache.set(cacheKey, { value, expiresAt: Date.now() + 60_000 });
        return value;
      })
      .finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, request);
    return request;
  }

  private async retryingFetch(path: string): Promise<unknown> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), this.environment.NEXON_REQUEST_TIMEOUT_MS);
        const response = await fetch(`${this.environment.NEXON_BASE_URL}${path}`, {
          headers: { "x-nxopen-api-key": this.environment.NEXON_OPEN_API_KEY ?? "" },
          signal: controller.signal,
          cache: "no-store",
        });
        const body: unknown = await response.json().catch(() => null);
        if (response.ok) {
          return body;
        }
        const code = codeFromResponse(body);
        if ((code === "OPENAPI00007" || code === "OPENAPI00001") && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 150 + Math.floor(Math.random() * 150)));
          continue;
        }
        throw new NexonProviderError(code, "NEXON request failed.", response.status);
      } catch (error) {
        if (error instanceof NexonProviderError) {
          throw error;
        }
        if (attempt === 1) {
          throw new NexonProviderError("NETWORK", "NEXON request failed.");
        }
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
      }
    }
    throw new NexonProviderError("NETWORK", "NEXON request failed.");
  }
}
