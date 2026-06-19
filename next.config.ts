import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/tanky",
        destination: "/team/tanky",
        permanent: true,
      },
      {
        source: "/veronica",
        destination: "/team/veronica",
        permanent: true,
      },
      {
        source: "/joyce",
        destination: "/team/joyce",
        permanent: true,
      },
      {
        source: "/mfok",
        destination: "/team/mfok",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

