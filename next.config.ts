import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

if (process.env.VERCEL === "1" && process.env.COS_MEDIA_ENABLED !== "true") {
  throw new Error("Set COS_MEDIA_ENABLED=true before deploying; public media files are excluded from the deployment bundle.");
}

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    ...(process.env.NEXT_ALLOWED_DEV_ORIGIN ? [process.env.NEXT_ALLOWED_DEV_ORIGIN] : []),
  ],
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
    "/api/admin/bbc-pdf-quiz": [
      "./node_modules/pdfjs-dist/package.json",
      "./node_modules/pdfjs-dist/legacy/build/pdf.mjs",
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-*/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      "./node_modules/pdfjs-dist/cmaps/**/*",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
      "./node_modules/pdfjs-dist/wasm/**/*",
    ],
    "/api/admin-primary-school-vocabulary-image": ["./node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf"],
    "/*": [
      "./src/data/vocabulary/flat-vocabulary.json",
      "./src/data/vocabulary/lookup-etymology/*.json.gz",
    ],
  },
  reactStrictMode: true,
  serverExternalPackages: ["pdfjs-dist"],
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
