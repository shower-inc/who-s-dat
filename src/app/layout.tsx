import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WHO'S DAT - Afro-diaspora Music Media",
  description: "UK Afrobeats, Amapiano, Afro-diaspora の最新音楽ニュースを日本語でお届け",
  metadataBase: new URL('https://who-s-dat.vercel.app'),
  openGraph: {
    title: "WHO'S DAT",
    description: "UK Afrobeats, Amapiano, Afro-diaspora の最新音楽ニュースを日本語でお届け",
    siteName: "WHO'S DAT",
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '/ogp.png',
        width: 1200,
        height: 630,
        alt: "WHO'S DAT - Afro-diaspora Music Media",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "WHO'S DAT",
    description: "UK Afrobeats, Amapiano, Afro-diaspora の最新音楽ニュースを日本語でお届け",
    images: ['/ogp.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
