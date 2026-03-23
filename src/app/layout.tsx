import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/shared/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "傳奇公會",
  description: "月老事務所：傳奇公會 — 冒險者社交與 PWA 體驗",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "傳奇公會",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable, "font-sans")}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
