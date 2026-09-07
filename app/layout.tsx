import type { Metadata, Viewport } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';

const mono = Geist_Mono({ variable: '--font-game', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://no-signal-runner-404.isaiahcampusano23.chatgpt.site'),
  title: '404 // No Signal',
  description: 'A first-person endless runner inspired by Chrome\'s offline dinosaur game.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#17191c', colorScheme: 'dark', width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={mono.variable}>{children}</body></html>;
}
