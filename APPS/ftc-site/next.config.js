const trimTrailingSlash = (value = "") => String(value || "").replace(/\/+$/, "");

const getAteamUpstreamOrigin = () => {
  const configuredOrigin = trimTrailingSlash(process.env.ATEAM_UPSTREAM_ORIGIN || "");
  if (configuredOrigin) return configuredOrigin;
  return process.env.NODE_ENV === "development" ? "http://127.0.0.1:3000" : "";
};

module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@ftc/supabase", "@ftc/config", "@ftc/types", "@ftc/auth"],
  async redirects() {
    return [
      {
        source: "/connect/vcard",
        destination: "/connect/fejiro-efiuvwere.vcf",
        permanent: false
      }
    ];
  },
  async rewrites() {
    const ateamUpstreamOrigin = getAteamUpstreamOrigin();
    const beforeFiles = ateamUpstreamOrigin
      ? [
          {
            source: "/ateam/operator",
            destination: `${ateamUpstreamOrigin}/`
          },
          {
            source: "/ateam/operator/:path*",
            destination: `${ateamUpstreamOrigin}/:path*`
          }
        ]
      : [];

    return {
      beforeFiles,
      afterFiles: [],
      fallback: []
    };
  },
  experimental: {
    externalDir: true
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
