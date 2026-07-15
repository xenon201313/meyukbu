import type { NextConfig } from "next";

const isolatedDistDir = process.env.MEYUKBU_NEXT_DIST_DIR;

type Header = { key: string; value: string };

const staticAssetHeaders: Header[] = [
  {
    key: "Cache-Control",
    value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
  },
];

const noStoreHeaders: Header[] = [
  { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
];

/**
 * Headers shared by every response. The CSP deliberately permits only the
 * image hosts supplied by APIs, while keeping browser API calls same-origin.
 */
export function securityHeadersForEnvironment(isProduction: boolean): Header[] {
  const scriptSource = isProduction
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    scriptSource,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ...(isProduction ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
  ];
}

/**
 * Makes dynamic or credential-bearing endpoints uncacheable at browsers and
 * CDN edges, while allowing only public image assets to use an explicit edge
 * cache. Next.js owns the immutable Cache-Control policy for /_next/static.
 */
export async function applicationHeaders() {
  const securityHeaders = securityHeadersForEnvironment(process.env.NODE_ENV === "production");

  return [
    { source: "/:path*", headers: securityHeaders },
    { source: "/api/:path*", headers: noStoreHeaders },
    { source: "/r/:slug/image", headers: noStoreHeaders },
    { source: "/images/:path*", headers: staticAssetHeaders },
  ];
}

const nextConfig: NextConfig = {
  ...(isolatedDistDir ? { distDir: isolatedDistDir } : {}),
  headers: applicationHeaders,
};

export default nextConfig;
