import type { Metadata } from "next";
import Providers from "@/app/components/providers";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import Analytics from "@/app/components/Analytics";
import HotjarTrigger from "@/app/components/HotjarTrigger";
import "./theme/cookies.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-IBMPlexSans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-IBMPlexMono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-5VC3GLCQ');`,
          }}
        />
        {/* End Google Tag Manager */}
        <Script src="https://cmp.osano.com/AzyfddTRtqi1560Dk/1543dfc1-f73d-43a2-8296-3849161e9ff5/osano.js" />
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
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5VC3GLCQ"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <Providers>
          <Analytics />
          {children}
          <HotjarTrigger />
        </Providers>
      </body>
    </html>
  );
}
