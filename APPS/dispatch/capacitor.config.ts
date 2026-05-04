import type { CapacitorConfig } from '@capacitor/cli';

// Environment modes:
// - 'development': Points to local Vite dev server (127.0.0.1:5173)
// - 'production': Points to dispatch.unalabs.cloud (default for Play Store builds)
const getServerConfig = (): { url?: string; cleartext: boolean; allowNavigation: string[] } => {
  const env = process.env.CAPACITOR_ENV || 'production';
  const productionNavigation = [
    'https://dispatch.unalabs.cloud',
    'https://dispatch-admin.unalabs.cloud',
  ];

  if (env === 'development') {
    return {
      url: 'http://127.0.0.1:5173',
      cleartext: true,
      allowNavigation: [...productionNavigation, 'http://127.0.0.1:5173', 'http://localhost:5173'],
    };
  }

  return {
    url: 'https://dispatch.unalabs.cloud',
    cleartext: false,
    allowNavigation: productionNavigation,
  };
};

const serverConfig = getServerConfig();

const config: CapacitorConfig = {
  appId: 'ca.emergencyprompt.roadside',
  appName: 'Tow Signal',
  webDir: 'dist/public',
  server: {
    ...serverConfig,
    androidScheme: 'https',
  },
  plugins: {},
};

export default config;
