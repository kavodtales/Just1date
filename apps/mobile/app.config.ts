import type { ExpoConfig } from "expo/config";
const config: ExpoConfig = {
  name: "JUST1DATE",
  slug: "just1date",
  owner: "bluechipwhale",
  platforms: ["ios", "android"],
  version: "0.1.0",
  scheme: "just1date",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  ios: {
    bundleIdentifier: "com.just1date.app",
    supportsTablet: true,
    associatedDomains: [
      "applinks:just1date.com",
      "applinks:just1date.vercel.app",
      "applinks:just1date-vert.vercel.app",
    ],
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        "Choose photos to tell your story. Your photos are reviewed before appearing in discovery.",
      NSCameraUsageDescription: "Take a profile photo with your permission.",
      NSMicrophoneUsageDescription:
        "Use your microphone only when you turn it on during a video call.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.just1date.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    permissions: ["POST_NOTIFICATIONS", "CAMERA", "RECORD_AUDIO"],
    blockedPermissions: [
      "SYSTEM_ALERT_WINDOW",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "READ_CONTACTS",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "just1date.vercel.app",
            pathPrefix: "/profile/",
          },
          {
            scheme: "https",
            host: "just1date.vercel.app",
            pathPrefix: "/messages/",
          },
          {
            scheme: "https",
            host: "just1date.vercel.app",
            pathPrefix: "/match/",
          },
          {
            scheme: "https",
            host: "just1date.vercel.app",
            pathPrefix: "/conversation/",
          },
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
        microphonePermission:
          "Use your microphone when you enable audio during a call.",
      },
    ],
    ["expo-notifications", { defaultChannel: "connections" }],
    "@livekit/react-native-expo-plugin",
    [
      "@config-plugins/react-native-webrtc",
      {
        cameraPermission:
          "Use your camera for profile photos or when you enable video during a call.",
        microphonePermission:
          "Use your microphone only when you turn it on during a video call.",
      },
    ],
  ],
  extra: {
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID || "c78a175c-e465-455b-b130-373695b5fc6f",
    },
  },
  experiments: { typedRoutes: true },
};
export default config;
