import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Providers } from "../components/providers";
import "./globals.css";
import "./reference.css";
import "./reference-refresh.css";
import "./reference-demo.css";
import "./reference-extras.css";
import "./calls.css";
import "./distribution.css";
import "./editorial.css";
import { PwaRegistration } from "../components/install-app";
export const metadata: Metadata = {
  title: "JUST1DATE — Meet someone worth choosing.",
  description:
    "Thoughtful connections, shared intentions and a little possibility.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Just1date" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  await headers();
  return (
    <html lang="en">
      <body>
        <Providers>
          <PwaRegistration />
          {children}
        </Providers>
      </body>
    </html>
  );
}
