import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Let browser tests run beside the live demo server.
  distDir: process.env.PLAYWRIGHT_TEST === "true" ? ".next-e2e" : ".next",
  // Next 16 blocks 127.0.0.1 as a cross-origin host when the server binds as localhost.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // shared/ and fixtures/ live one level up, at the repo root.
  turbopack: { root: path.join(__dirname, "..") },
};

export default nextConfig;
