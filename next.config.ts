import type { NextConfig } from "next";

const isolatedDistDir = process.env.MEYUKBU_NEXT_DIST_DIR;

const nextConfig: NextConfig = {
  ...(isolatedDistDir ? { distDir: isolatedDistDir } : {}),
};

export default nextConfig;
