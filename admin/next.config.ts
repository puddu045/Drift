import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This whole app is an authenticated client (Supabase session in the
  // browser, every page fetches from the NestJS API with a bearer token) —
  // nothing here benefits from server-side caching/prerendering, so Cache
  // Components' request-read/Suspense rules are turned off rather than
  // fought.
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
