import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campusbites.shop',
  appName: 'Campus Bites KDS',
  webDir: 'public',
  server: {
    // Corrected route to /shop/login as /shop directory doesn't have a root page.tsx
    url: 'https://campus-bites-teal.vercel.app/shop/login', 
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
