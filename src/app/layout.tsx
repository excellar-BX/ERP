import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { getSettings } from "@/lib/queries";
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
  title: "Smart ERP",
  description: "Billing, stock, dues and daily summaries that run themselves.",
};

// Every page reads live business data, so never serve a cached copy.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900 md:flex-row">
        <aside className="shrink-0 bg-slate-900 p-3 md:sticky md:top-0 md:h-screen md:w-60 md:p-4 print:hidden">
          <Link href="/" className="mb-3 block px-3 md:mb-6">
            <span className="block text-lg font-semibold text-white">Smart ERP</span>
            <span className="block truncate text-xs text-slate-400">{settings.businessName}</span>
          </Link>
          <Nav />
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">{children}</main>
      </body>
    </html>
  );
}
