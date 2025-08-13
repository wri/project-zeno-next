import type { Metadata } from "next";
import Providers from "@/app/components/providers";

export const metadata: Metadata = {
  title: "NatureWATCH",
  description: "NatureWATCH",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
