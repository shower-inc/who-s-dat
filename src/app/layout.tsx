import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  },
  twitter: {
    card: 'summary_large_image',
    title: "WHO'S DAT",
    description: "UK Afrobeats, Amapiano, Afro-diaspora の最新音楽ニュースを日本語でお届け",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
