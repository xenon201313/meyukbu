/**
 * Changes whenever the canonical PNG renderer changes. The image response is
 * deliberately not immutable because the anonymous temperature aggregate is
 * live character data rather than part of a resume snapshot.
 */
export const resumeImageRendererVersion = 6;

export function resumeImageUrl(slug: string, versionNumber: number): string {
  return `/r/${encodeURIComponent(slug)}/image?v=${versionNumber}&layout=${resumeImageRendererVersion}`;
}
