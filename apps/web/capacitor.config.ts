import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sergenikz.ttt3d',
  appName: '3D Tic-Tac-Toe',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
