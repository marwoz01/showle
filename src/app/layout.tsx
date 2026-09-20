import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppProviders from "@/components/providers/AppProviders";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { publicPageMetadata, requestLocale } from "@/lib/page-metadata";
import { siteUrl } from "@/lib/site";
import { spaceGrotesk } from "@/lib/fonts";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(): Promise<Metadata> {
  const base = await publicPageMetadata("/");
  return {
    ...base,
    title: { default: String(base.title), template: "%s | Showle" },
    metadataBase: new URL(siteUrl()),
    icons: { icon: "/favicon.svg" },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await requestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <AppProviders initialLocale={locale}>
          <Sidebar />
          <main className="relative min-h-screen overflow-x-clip p-4 pt-18 lg:ml-60 lg:p-10">
            <div className="pointer-events-none absolute left-1/2 top-0 hidden h-96 w-150 -translate-x-1/2 rounded-full bg-accent-purple/8 blur-3xl sm:block" />
            {children}
            <Footer locale={locale} />
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
