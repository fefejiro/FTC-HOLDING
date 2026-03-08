const path = require("path");
const isCloudflarePages = process.env.CF_PAGES === "1" || Boolean(process.env.CF_PAGES_BRANCH);

module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@ftc/logger", "@ftc/supabase", "@ftc/config", "@ftc/types", "@ftc/auth"],
  experimental: Object.assign(
    {
      externalDir: true,
    },
    isCloudflarePages
      ? {}
      : {
          outputFileTracingRoot: path.join(__dirname, "../../"),
        }
  ),
  eslint: {
    ignoreDuringBuilds: true,
  },
};
