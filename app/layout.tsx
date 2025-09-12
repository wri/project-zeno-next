import type { Metadata } from "next";
import Providers from "@/app/components/providers";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import CookieConsent from "@/app/components/CookieConsent";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-IBMPlexSans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
})
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-IBMPlexMono",
  weight: ["400", "700"],
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Global Nature Watch",
  description: "Global Nature Watch",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        <Providers>
          {children}
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
