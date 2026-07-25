import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/api/vocabulary-audio/*": ["public/**/*.mp3"],
  },
  outputFileTracingIncludes: {
    "/*": ["./src/data/vocabulary/flat-vocabulary.json"],
  },
  reactStrictMode: true,
  turbopack: {
    ignoreIssue: [
      {
        description: /Overly broad patterns/,
        path: "**/src/app/api/vocabulary-audio/**",
      },
    ],
  },
};

export default nextConfig;
