import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
    ],
  },

  async redirects() {
    return [
      // The old sign-up form; /app sends anyone without accepted terms to
      // /welcome, keeping the query string.
      { source: "/onboarding", destination: "/app", permanent: false },
      // User Profile's old address.
      { source: "/dashboard", destination: "/settings", permanent: true },
    ];
  },

  // Experimental features - @phosphor-icons/react is optimized by default
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
};

export default nextConfig;
