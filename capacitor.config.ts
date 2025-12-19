import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.smarthome.app",
  appName: "smart-home",
  webDir: "dist",
  server: {
    allowNavigation: ["*.trycloudflare.com"],
  },
};

export default config;
