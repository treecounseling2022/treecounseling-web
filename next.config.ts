import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
    ],
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

