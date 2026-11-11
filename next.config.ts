import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.151.235.37'],
  webpack: (config) => {
    const rootNodeModules = path.resolve(process.cwd(), "node_modules");
    config.resolve.modules = [
      rootNodeModules,
      "node_modules",
      ...(config.resolve.modules || []),
    ];
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-hook-form": path.resolve(rootNodeModules, "react-hook-form"),
      "html5-qrcode": path.resolve(rootNodeModules, "html5-qrcode"),
      "qrcode.react": path.resolve(rootNodeModules, "qrcode.react"),
      "lucide-react": path.resolve(rootNodeModules, "lucide-react"),
      "zod": path.resolve(rootNodeModules, "zod"),
    };
    return config;
  },
};

export default nextConfig;
