import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "JUST1DATE",
  slug: "just1date",
  platforms: ["ios", "android"],
  version: "0.1.0",
  scheme: "just1date",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: "com.just1date.app",
    supportsTablet: true,
    associatedDomains: ["applinks:just1date.com"],
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        "Choose photos to tell your story. Your photos are reviewed before appearing in discovery.",
      NSCameraUsageDescription: "Take a profile photo with your permission.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.just1date.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    permissions: ["POST_NOTIFICATIONS"],
    blockedPermissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "READ_CONTACTS",
      "RECORD_AUDIO",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          { scheme: "https", host: "just1date.com", pathPrefix: "/profile/" },
          { scheme: "https", host: "just1date.com", pathPrefix: "/messages/" },
          { scheme: "https", host: "just1date.com", pathPrefix: "/match/" },
          {
            scheme: "https",
            host: "just1date.com",
            pathPrefix: "/conversation/",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Select profile photos to upload for review.",
        cameraPermission: "Take a profile photo with your permission.",
        microphonePermission: false,
      },
    ],
    ["expo-notifications", { defaultChannel: "connections" }],
  ],
  extra: process.env.EAS_PROJECT_ID
    ? { eas: { projectId: process.env.EAS_PROJECT_ID } }
    : undefined,
  experiments: { typedRoutes: true },
};
export default config;
