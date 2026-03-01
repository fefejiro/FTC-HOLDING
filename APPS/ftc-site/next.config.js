const path = require("path");

module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@ftc/logger", "@ftc/supabase", "@ftc/config", "@ftc/types", "@ftc/auth"],
  experimental: {
    externalDir: true,
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ["example.com"],
  },
  async redirects() {
    return [
      {
        source: "/old-path",
        destination: "/new-path",
        permanent: true,
      },
    ];
  },
};
