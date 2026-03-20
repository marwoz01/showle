import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
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
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="pl" suppressHydrationWarning>
        <body
          className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
        >
          <I18nProvider>
            <Sidebar />
            <main className="min-h-screen overflow-x-hidden p-4 pt-16 lg:ml-60 lg:p-10">{children}</main>
          </I18nProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
