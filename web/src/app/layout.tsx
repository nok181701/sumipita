import type { Metadata, Viewport } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const logoFont = Zen_Maru_Gothic({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-logo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "スムピタ — 引越し先の街を、決める前に確かめる",
    template: "%s | スムピタ",
  },
  description:
    "東京23区の町丁目ごとに、治安・洪水・高潮・地盤（液状化）の4つを公的データから点数化。内見では分からない街の条件を地図と一緒に確認できます。",
  openGraph: {
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#2bb3cd",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={logoFont.variable}>
      <body>{children}</body>
    </html>
  );
}
