import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.151.235.37'],
  experimental: {
    agentUpgrade: 'security',
  },
};

export default nextConfig;
