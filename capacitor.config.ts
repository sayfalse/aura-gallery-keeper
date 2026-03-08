import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.auragallerykeeper',
  appName: 'PixelVault',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  server: {
    url: 'https://4c2d6250-6a02-40d7-8639-0988ca6966e0.lovableproject.com',
    cleartext: true,
    androidScheme: 'https',
  },
};

export default config;
