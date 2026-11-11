import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets the dev server's client scripts load when the page is opened via 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "crests.football-data.org" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
