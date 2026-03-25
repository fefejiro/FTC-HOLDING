const trimTrailingSlash = (value = "") => String(value || "").replace(/\/+$/, "");
const truthy = (value = "") => ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

const getAteamUpstreamOrigin = () => {
  const configuredOrigin = trimTrailingSlash(process.env.ATEAM_UPSTREAM_ORIGIN || "");
  if (configuredOrigin) return configuredOrigin;
  return process.env.NODE_ENV === "development" ? "http://127.0.0.1:3000" : "";
};

const isAteamOperatorEnabled = () =>
  process.env.NODE_ENV === "development" ||
  truthy(process.env.ATEAM_OPERATOR_PROXY_ENABLED) ||
  truthy(process.env.NEXT_PUBLIC_ATEAM_OPERATOR_ENABLED);

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
    const beforeFiles = ateamUpstreamOrigin && isAteamOperatorEnabled()
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
