import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Let browser tests run beside the live demo server.
  distDir: process.env.PLAYWRIGHT_TEST === "true" ? ".next-e2e" : ".next",
  // shared/ and fixtures/ live one level up, at the repo root.
  turbopack: { root: path.join(__dirname, "..") },
};

export default nextConfig;
