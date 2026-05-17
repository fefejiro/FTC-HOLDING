import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
	webpack: (config) => {
		config.resolve = config.resolve || {};
		config.resolve.alias = {
			...(config.resolve.alias || {}),
			'@supabase/phoenix$': require.resolve('@supabase/phoenix'),
		};

		return config;
	},
};

export default nextConfig;
