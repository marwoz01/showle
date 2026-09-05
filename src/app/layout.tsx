import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import AppProviders from "@/components/providers/AppProviders";
import Sidebar from "@/components/layout/Sidebar";
import type { Locale } from "@/i18n";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const siteUrl = "https://showle.vercel.app";

const metadataCopy = {
  pl: {
    title: "Showle — Film dnia",
    description:
      "Odgadnij film dnia, porównując rok, gatunek, reżysera, budżet i inne cechy. Codziennie nowe wyzwanie!",
    locale: "pl_PL",
  },
  en: {
    title: "Showle — Daily Movie",
    description:
      "Guess the daily movie by comparing its year, genre, director, budget, and more. A new challenge every day!",
    locale: "en_US",
  },
} as const;

async function getRequestLocale(): Promise<Locale> {
  return (await cookies()).get("showle-locale")?.value === "en" ? "en" : "pl";
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = metadataCopy[locale];

  return {
    title: { default: copy.title, template: "%s | Showle" },
    description: copy.description,
    metadataBase: new URL(siteUrl),
    icons: { icon: "/favicon.svg" },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: siteUrl,
      siteName: "Showle",
      locale: copy.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <AppProviders initialLocale={locale}>
          <Sidebar />
          <main className="relative min-h-screen overflow-x-hidden p-4 pt-18 lg:ml-60 lg:p-10">
            <div className="pointer-events-none absolute left-1/2 top-0 hidden h-96 w-150 -translate-x-1/2 rounded-full bg-accent-purple/8 blur-3xl sm:block" />
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
