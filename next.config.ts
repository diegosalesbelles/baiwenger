import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow iron-session to work in edge/server components
  },
};

export default nextConfig;
