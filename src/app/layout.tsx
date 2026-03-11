import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { I18nProvider } from "@/i18n";
import Sidebar from "@/components/layout/Sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Showle",
  description:
    "Daily movie & series guessing game. Compare parameters, discover hints, guess the title!",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <I18nProvider>
          <Sidebar />
          <main className="ml-60 min-h-screen bg-linear-to-b from-background via-background to-[#0a0a18] p-10">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
