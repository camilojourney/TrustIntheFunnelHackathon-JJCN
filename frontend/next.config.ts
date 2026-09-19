import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // shared/ and fixtures/ live one level up, at the repo root.
  turbopack: { root: path.join(__dirname, "..") },
};

export default nextConfig;
