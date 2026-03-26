import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "bookface-images.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "www.ycombinator.com",
      },
    ],
  },
};

export default nextConfig;
