import type { CapacitorConfig } from '@capacitor/cli';

// Environment modes:
// - 'local': Uses bundled assets (for testing without backend)
// - 'development': Points to local Vite dev server (127.0.0.1:5173)
// - 'staging': Points to dev.peacepad.ca
// - 'production': Points to peacepad.ca (default for Play Store builds)
const getServerConfig = (): { url?: string; cleartext: boolean; allowNavigation: string[] } => {
  const env = process.env.CAPACITOR_ENV || 'production';
  const productionNavigation = [
    'https://peacepad.ca',
    'https://www.peacepad.ca',
    'https://api.peacepad.ca',
  ];

  if (env === 'local') {
    // No URL = load from bundled assets in android/app/src/main/assets/public
    return {
      cleartext: false,
      allowNavigation: productionNavigation,
    };
  }
  if (env === 'development') {
    return {
      url: 'http://127.0.0.1:5173',
      cleartext: true,
      allowNavigation: [
        ...productionNavigation,
        'http://127.0.0.1:5173',
        'http://localhost:5173',
      ],
    };
  }
  if (env === 'staging') {
    return {
      url: 'https://dev.peacepad.ca',
      cleartext: false,
      allowNavigation: [
        ...productionNavigation,
        'https://dev.peacepad.ca',
      ],
    };
  }
  // production (default) - load from server for proper auth/session handling
  return {
    url: 'https://peacepad.ca',
    cleartext: false,
    allowNavigation: productionNavigation,
  };
};

const serverConfig = getServerConfig();

const config: CapacitorConfig = {
  appId: 'ca.peacepad.family',
  appName: 'PeacePad',
  webDir: 'dist/public',
  server: {
    ...serverConfig,
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
      backgroundColor: '#00000000',
    },
  },
};

export default config;
