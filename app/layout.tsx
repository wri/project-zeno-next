import type { Metadata } from "next";
import Providers from "@/app/components/providers";

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
