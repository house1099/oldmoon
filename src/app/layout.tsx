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
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "傳奇公會",
  },
};

/** 與 iOS／PWA 對齊：`maximum-scale=1` 搭配首頁 textarea `text-base`，避免聚焦自動縮放；勿用 `user-scalable=no`。 */
export const viewport: Viewport = {
  themeColor: "#0f0a1e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
