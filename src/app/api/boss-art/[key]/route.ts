import { bossArtworkKeys, bossArtworkUrl } from "@/content/bosses";

/**
 * Keeps the former artwork endpoint working while serving a verified static asset.
 * The asset manifest was supplied by the Maple Trackers operator for this site.
 */
export async function GET(request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!bossArtworkKeys.has(key)) {
    return new Response("Not found", { status: 404 });
  }

  return Response.redirect(new URL(bossArtworkUrl(key), request.url), 308);
}
