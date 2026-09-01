import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/images/**",
            protocol: "https",
          },
        ]
      : [],
  },
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
