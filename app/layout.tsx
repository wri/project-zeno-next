import type { Metadata } from "next";
import Providers from "@/app/components/providers";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import CookieConsent from "@/app/components/CookieConsent";
import HotjarTrigger from "@/app/components/HotjarTrigger";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
    (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:6503691,hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
`,
          }}
        />
      </head>
      <body>
        <Providers>
          {children}
          <CookieConsent />
          <HotjarTrigger />
        </Providers>
      </body>
    </html>
  );
}
