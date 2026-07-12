import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";

import { getEnvironment } from "@/lib/env";
import { createQrDataUri } from "@/lib/image/qr";
import { ResumeShareImage } from "@/lib/image/resume-share-image";
import { toPublicResumeView } from "@/server/services/public-view";
import { getPublicResume } from "@/server/services/resume-service";

export const runtime = "nodejs";

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
  const [qrDataUri, fontData, avatarDataUri] = await Promise.all([
    createQrDataUri(canonicalUrl),
    loadKoreanFonts(),
    loadAvatarDataUri(view.version.snapshot.profile.imageUrl),
  ]);
  return new ImageResponse(
    <ResumeShareImage
      resume={view}
      qrDataUri={qrDataUri}
      canonicalUrl={canonicalUrl}
      avatarDataUri={avatarDataUri}
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
        "Cache-Control": `public, max-age=31536000, immutable`,
      },
    },
  );
}
