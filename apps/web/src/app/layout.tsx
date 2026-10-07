import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Providers } from "../components/providers";
import "./globals.css";
import "./reference.css";
export const metadata: Metadata = {
  title: "JUST1DATE — Meet someone worth choosing.",
  description:
    "Thoughtful connections, shared intentions and a little possibility.",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
