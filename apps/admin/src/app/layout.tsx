import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Providers } from "../../../web/src/components/providers";
import "../../../web/src/app/globals.css";
import "../../../web/src/app/reference.css";
import "./admin.css";
export const metadata = { title: "JUST1DATE — Operations" };
export default async function Layout({ children }: { children: ReactNode }) {
  await headers();
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
