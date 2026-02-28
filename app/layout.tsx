import type { Metadata } from 'next';
import { Manrope, Sora } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';
import 'antd/dist/reset.css';
import Providers from './providers';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ZingHR Enterprise',
  description: 'ZingHR-inspired HRMS clone built with Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="theme-light" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${sora.variable} min-h-screen antialiased selection:bg-[var(--accent-100)] selection:text-[var(--accent-700)]`}
        suppressHydrationWarning
      >
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
