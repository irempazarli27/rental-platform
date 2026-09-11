import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lean production image: only the files a `next start` server actually
  // needs get copied into the runtime Docker stage (see frontend/Dockerfile).
  output: "standalone",
};

export default nextConfig;
