import { bossArtworkKeys, mapleTrackersArtworkSource } from "@/content/bosses";

export const runtime = "nodejs";

const sourceCacheSeconds = 60 * 60 * 6;
const maxSourceBytes = 5_000_000;
const maxImageBytes = 4_000_000;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contentTypeFromDataUrl(value: string): "image/png" | "image/jpeg" | "image/webp" | null {
  if (value.startsWith("data:image/png;base64,")) {
    return "image/png";
  }
  if (value.startsWith("data:image/jpeg;base64,")) {
    return "image/jpeg";
  }
  if (value.startsWith("data:image/webp;base64,")) {
    return "image/webp";
  }
  return null;
}

/**
 * Serves only user-authorized Maple Trackers artwork keys. The source stays remote
 * so the repository does not copy or permanently bundle the supplied image files.
 */
export async function GET(request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!bossArtworkKeys.has(key)) {
    return new Response("Not found", { status: 404 });
  }

  // Offline E2E runs still exercise the picker without depending on a public site.
  if (process.env.MEYUKBU_EXTERNAL_ART === "false") {
    const fallback =
      key === "blackmage" ? "/images/bosses/monthly-raid.png" : "/images/bosses/weekly-raid.png";
    return Response.redirect(new URL(fallback, request.url), 307);
  }

  try {
    const response = await fetch(mapleTrackersArtworkSource, {
      next: { revalidate: sourceCacheSeconds },
      headers: { Accept: "text/html" },
    });
    if (!response.ok) {
      return new Response("Artwork source unavailable", { status: 502 });
    }

    const source = await response.text();
    if (source.length > maxSourceBytes) {
      return new Response("Artwork source is too large", { status: 502 });
    }

    const dataUrlPattern = new RegExp(
      `"${escapeRegex(key)}"\\s*:\\s*"(data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)"`,
    );
    const dataUrl = dataUrlPattern.exec(source)?.[1];
    const contentType = dataUrl ? contentTypeFromDataUrl(dataUrl) : null;
    if (!dataUrl || !contentType) {
      return new Response("Artwork not found", { status: 404 });
    }

    const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const body = Buffer.from(encoded, "base64");
    if (!body.length || body.length > maxImageBytes) {
      return new Response("Artwork is invalid", { status: 502 });
    }

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": `public, max-age=${sourceCacheSeconds}, stale-while-revalidate=86400`,
      },
    });
  } catch {
    return new Response("Artwork source unavailable", { status: 502 });
  }
}
