import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

if (process.env.VERCEL === "1" && process.env.COS_MEDIA_ENABLED !== "true") {
  throw new Error("Set COS_MEDIA_ENABLED=true before deploying; public media files are excluded from the deployment bundle.");
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
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
