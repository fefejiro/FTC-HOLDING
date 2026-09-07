import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "cloud.unalabs.jobagent",
  appName: "UnaScout",
  webDir: "public",
  server: {
    url: "https://jobagent.unalabs.cloud/app",
    cleartext: false,
    allowNavigation: ["jobagent.unalabs.cloud"]
  },
  android: {
    allowMixedContent: false
  },
  ios: {
    contentInset: "automatic"
  }
};

export default config;
