import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import AppInitializer from '@/initializers/AppInitializer';
import PageContainer from '@/components/Page/PageContainer';
import TopHeader from '@/components/Header/TopHeader';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Snobbin',
  description: 'Snobbin',
  generator: 'Next.js',
  manifest: '/manifest.json',
  icons: [
    { rel: 'apple-touch-icon', url: '/icons-128.png' },
    { rel: 'icon', url: '/icons-128.png' },
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
          <TopHeader />
          <PageContainer>{children}</PageContainer>
        </AppInitializer>
      </body>
    </html>
  );
}
