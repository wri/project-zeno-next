import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration (stable in Next.js 15)
  turbopack: {
    rules: {
      // Additional optimizations for SVG handling
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Experimental features - @phosphor-icons/react is optimized by default
  experimental: {
    optimizePackageImports: ['@chakra-ui/react'],
  },
};

export default nextConfig;
