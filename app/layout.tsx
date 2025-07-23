import type { Metadata } from "next";
import Providers from "@/app/components/providers";

export const metadata: Metadata = {
  title: "Project Zeno",
  description: "Project Zeno",
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
