import type { CapacitorConfig } from '@capacitor/cli';

// Authoritative Capacitor config.
// Modes:
// - local: load bundled assets only
// - development: local Vite server
// - production (default): hosted UI
const getServerConfig = (): { url?: string; cleartext: boolean; allowNavigation: string[] } => {
  const env = process.env.CAPACITOR_ENV || 'production';
  const productionNavigation = [
    'https://saywetin.app',
    'https://www.saywetin.app',
    'https://api.saywetin.app',
  ];

  if (env === 'local') {
    return {
      cleartext: false,
      allowNavigation: productionNavigation,
    };
  }

  if (env === 'development') {
    return {
      url: 'http://127.0.0.1:5174',
      cleartext: true,
      allowNavigation: [
        ...productionNavigation,
        'http://127.0.0.1:5174',
        'http://localhost:5174',
      ],
    };
  }

  return {
    url: 'https://saywetin.app',
    cleartext: false,
    allowNavigation: productionNavigation,
  };
};

const serverConfig = getServerConfig();

const config: CapacitorConfig = {
  appId: 'com.saywetin.app',
  appName: 'Saywetin',
  webDir: 'dist/public',
  server: {
    ...serverConfig,
    androidScheme: 'https',
    iosScheme: 'https',
  },
};

export default config;
