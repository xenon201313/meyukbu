/**
 * Changes whenever the canonical PNG renderer changes. It keeps prior immutable
 * CDN responses from being reused after a visual renderer deployment.
 */
export const resumeImageRendererVersion = 4;

export function resumeImageUrl(slug: string, versionNumber: number): string {
  return `/r/${encodeURIComponent(slug)}/image?v=${versionNumber}&layout=${resumeImageRendererVersion}`;
}
