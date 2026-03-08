import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.auragallerykeeper',
  appName: 'PixelVault',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    appendUserAgent: 'PixelVault-Android',
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos'],
    },
    Filesystem: {
      permissions: ['publicStorage'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#fafafa',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#3b82f6',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
