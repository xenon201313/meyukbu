import { z } from "zod";

const environmentSchema = z.object({
  NEXON_PROVIDER: z.enum(["mock", "live"]).default("mock"),
  NEXON_OPEN_API_KEY: z.string().trim().optional(),
  NEXON_BASE_URL: z.url().default("https://open.api.nexon.com/maplestory/v1"),
  NEXON_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(8_000),
  APP_ORIGIN: z.url().default("http://localhost:3000"),
  PROFILE_FRESH_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  PROFILE_PUBLIC_EXPIRY_DAYS: z.coerce.number().int().min(2).max(30).default(30),
  APP_SECRET: z.string().min(16).default("meyukbu-development-secret-change-me"),
  MEYUKBU_STORAGE: z.enum(["memory", "prisma"]).default("memory"),
});

export type AppEnvironment = z.infer<typeof environmentSchema>;

/** Parses only server-side process variables and supplies safe local mock defaults. */
export function getEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}): AppEnvironment {
  return environmentSchema.parse({
    NEXON_PROVIDER: process.env.NEXON_PROVIDER,
    NEXON_OPEN_API_KEY: process.env.NEXON_OPEN_API_KEY,
    NEXON_BASE_URL: process.env.NEXON_BASE_URL,
    NEXON_REQUEST_TIMEOUT_MS: process.env.NEXON_REQUEST_TIMEOUT_MS,
    APP_ORIGIN: process.env.APP_ORIGIN,
    PROFILE_FRESH_HOURS: process.env.PROFILE_FRESH_HOURS,
    PROFILE_PUBLIC_EXPIRY_DAYS: process.env.PROFILE_PUBLIC_EXPIRY_DAYS,
    APP_SECRET: process.env.APP_SECRET,
    MEYUKBU_STORAGE: process.env.MEYUKBU_STORAGE,
    ...overrides,
  });
}
