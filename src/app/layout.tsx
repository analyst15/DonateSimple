import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from '@/components/app-header';
import { AppFooter } from '@/components/app-footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DonateSimple - Support Our Cause',
  description: 'Make a difference with your generous contribution. DonateSimple makes it easy to support important causes.',
  icons: {
    icon: '/favicon.ico', // Assuming a favicon might be added later
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} font-sans antialiased flex flex-col min-h-screen bg-background text-foreground`}>
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
        <AppFooter />
        <Toaster />
      </body>
    </html>
  );
}
