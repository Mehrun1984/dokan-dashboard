import type { Metadata, Viewport } from "next";
import localFont from 'next/font/local';
import "./globals.css";

const iranYekan = localFont({
  src: [
    { path: './fonts/iranyekanwebthinfanum.woff', weight: '100', style: 'normal' },
    { path: './fonts/iranyekanweblightfanum.woff', weight: '300', style: 'normal' },
    { path: './fonts/iranyekanwebregularfanum.woff', weight: '400', style: 'normal' },
    { path: './fonts/iranyekanwebmediumfanum.woff', weight: '500', style: 'normal' },
    { path: './fonts/iranyekanwebboldfanum.woff', weight: '700', style: 'normal' },
    { path: './fonts/iranyekanwebextraboldfanum.woff', weight: '800', style: 'normal' },
    { path: './fonts/iranyekanwebblackfanum.woff', weight: '900', style: 'normal' },
    { path: './fonts/iranyekanwebextrablackfanum.woff', weight: '950', style: 'normal' },
  ],
  variable: '--font-iranyekan',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'پنل فروشندگان | Vendor Dashboard',
  description: 'PWA Vendor Dashboard for Beauty Services',
  manifest: '/manifest.json', // Your PWA manifest
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className={iranYekan.variable}>
      <body className="bg-gray-50 text-gray-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
