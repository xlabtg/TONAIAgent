import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'TON AI Agent - Autonomous AI Agents for Finance on TON',
    template: '%s | TON AI Agent',
  },
  description:
    'Deploy intelligent AI agents that trade, manage portfolios, and optimize yields 24/7 on The Open Network. Non-custodial, AI-powered, institutional-grade security.',
  keywords: [
    'TON',
    'AI agents',
    'DeFi',
    'autonomous trading',
    'blockchain',
    'Telegram',
    'crypto',
    'portfolio management',
    'yield optimization',
  ],
  authors: [{ name: 'TON AI Agent Team' }],
  creator: 'TON AI Agent',
  publisher: 'TON AI Agent',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://tonaiagent.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tonaiagent.com',
    siteName: 'TON AI Agent',
    title: 'TON AI Agent - Autonomous AI Agents for Finance on TON',
    description:
      'Deploy intelligent AI agents that trade, manage portfolios, and optimize yields 24/7 on The Open Network.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TON AI Agent',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TON AI Agent - Autonomous AI Agents for Finance on TON',
    description:
      'Deploy intelligent AI agents that trade, manage portfolios, and optimize yields 24/7 on The Open Network.',
    images: ['/og-image.png'],
    creator: '@tonaiagent',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
