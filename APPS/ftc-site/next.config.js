module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@ftc/logger", "@ftc/supabase", "@ftc/config", "@ftc/types", "@ftc/auth"],
  async redirects() {
    return [
      {
        source: "/connect/vcard",
        destination: "/connect/fejiro-efiuvwere.vcf",
        permanent: false
      }
    ];
  },
  experimental: {
    externalDir: true
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
