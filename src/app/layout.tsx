import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AppInitializer from "@/initializers/AppInitializer";
import HeaderBar from "@/components/Header/HeaderBar";
import PageContainer from "@/components/Page/PageContainer";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Snobbin",
  description: "Snobbin",
  generator: "Next.js",
  manifest: "/manifest.json",
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#fff" }],
  icons: [
    { rel: "apple-touch-icon", url: "/icons-128.png" },
    { rel: "icon", url: "/icons-128.png" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppInitializer>
          <HeaderBar />
          <PageContainer>{children}</PageContainer>
        </AppInitializer>
      </body>
    </html>
  );
}
