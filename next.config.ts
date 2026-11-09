import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=()" },
];

const nextConfig: NextConfig = {
  eslint: {
    // Lint dijalankan terpisah lewat `npm run lint` agar build CI tidak gagal ganda.
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["@react-pdf/renderer"],
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
