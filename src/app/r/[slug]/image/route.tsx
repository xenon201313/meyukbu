import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";

import { findBossOption } from "@/content/bosses";
import type { ResumeDraft } from "@/domain/resume";
import { getEnvironment } from "@/lib/env";
import { createQrDataUri } from "@/lib/image/qr";
import { ResumeShareImage } from "@/lib/image/resume-share-image";
import { toPublicResumeView } from "@/server/services/public-view";
import { getPublicMesoongiTemperatureSummary } from "@/server/services/mesoongi-temperature-survey-service";
import { getPublicResume } from "@/server/services/resume-service";

export const runtime = "nodejs";
/** The survey aggregate is live data, so a fixed resume version cannot be edge-cached forever. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface KoreanFonts {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
}

let koreanFonts: Promise<KoreanFonts> | undefined;

function toArrayBuffer(font: Buffer): ArrayBuffer {
  return font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) as ArrayBuffer;
}

function loadKoreanFonts(): Promise<KoreanFonts> {
  if (!koreanFonts) {
    const fontDirectory = path.join(process.cwd(), "node_modules", "webfont-nanum", "nanumbarungothic", "v1");
    koreanFonts = Promise.all([
      readFile(path.join(fontDirectory, "NanumBarunGothic-Regular.woff")),
      readFile(path.join(fontDirectory, "NanumBarunGothic-Bold.woff")),
    ]).then(([regular, bold]) => ({ regular: toArrayBuffer(regular), bold: toArrayBuffer(bold) }));
  }
  return koreanFonts;
}

/** Inlines a trusted NEXON avatar so a remote image failure cannot break the share card. */
async function loadAvatarDataUri(imageUrl: string | null): Promise<string | null> {
  if (!imageUrl) {
    return null;
  }
  try {
    const url = new URL(imageUrl);
    if (url.protocol !== "https:" || (url.hostname !== "nexon.com" && !url.hostname.endsWith(".nexon.com"))) {
      return null;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);
    const response = await fetch(url, { signal: controller.signal, cache: "force-cache" }).finally(() =>
      clearTimeout(timeout),
    );
    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (!response.ok || !contentType.startsWith("image/") || contentLength > 1_500_000) {
      return null;
    }
    const data = Buffer.from(await response.arrayBuffer());
    if (data.byteLength > 1_500_000) {
      return null;
    }
    return `data:${contentType};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Inlines the catalogued, user-authorized boss art used by the rendered resume. */
async function loadBossArtworkDataUri(draft: ResumeDraft): Promise<string | null> {
  const boss = draft.targetBossCadence
    ? findBossOption(draft.targetBossCadence, draft.targetBoss)
    : undefined;
  if (!boss) {
    return null;
  }

  try {
    const imagePath = path.join(process.cwd(), "public", "images", "bosses", `${boss.artworkKey}.png`);
    const image = await readFile(imagePath);
    if (!image.byteLength || image.byteLength > 500_000) {
      return null;
    }
    return `data:image/png;base64,${image.toString("base64")}`;
  } catch {
    return null;
  }
}

interface Context {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, context: Context) {
  const { slug } = await context.params;
  const versionText = request.nextUrl.searchParams.get("v");
  const version = versionText ? Number.parseInt(versionText, 10) : undefined;
  const result = await getPublicResume(slug, Number.isFinite(version) ? version : undefined);
  if (!result) {
    return new Response("Not found", { status: 404 });
  }
  const view = toPublicResumeView(result);
  const canonicalUrl = `${getEnvironment().APP_ORIGIN}/r/${slug}?v=${view.version.versionNumber}`;
  const [qrDataUri, fontData, avatarDataUri, bossArtworkDataUri, temperatureSummary] = await Promise.all([
    createQrDataUri(canonicalUrl),
    loadKoreanFonts(),
    loadAvatarDataUri(view.version.snapshot.profile.imageUrl),
    loadBossArtworkDataUri(view.version.draft),
    getPublicMesoongiTemperatureSummary(result.resume),
  ]);
  return new ImageResponse(
    <ResumeShareImage
      resume={view}
      temperatureSummary={temperatureSummary}
      qrDataUri={qrDataUri}
      canonicalUrl={canonicalUrl}
      avatarDataUri={avatarDataUri}
      bossArtworkDataUri={bossArtworkDataUri}
    />,
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Nanum Barun Gothic", data: fontData.regular, weight: 400, style: "normal" },
        { name: "Nanum Barun Gothic", data: fontData.bold, weight: 700, style: "normal" },
      ],
      headers: {
        "Content-Type": "image/png",
        // A survey response can change a character-wide temperature while the
        // resume snapshot/version stays the same. Do not serve an old PNG.
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    },
  );
}
