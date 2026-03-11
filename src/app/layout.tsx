import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
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
  title: "SHOWLE — Guess the Screen",
  description:
    "Daily movie & series guessing game. Compare parameters, discover hints, guess the title!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <Sidebar />
        <main className="ml-60 min-h-screen p-10">{children}</main>
      </body>
    </html>
  );
}
