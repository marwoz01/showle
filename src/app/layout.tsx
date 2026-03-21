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

const siteUrl = "https://showle.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Showle — Daily Movie Guessing Game",
    template: "%s | Showle",
  },
  description:
    "Guess the daily movie by comparing year, genre, director, budget and more. A new challenge every day!",
  metadataBase: new URL(siteUrl),
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Showle — Daily Movie Guessing Game",
    description:
      "Guess the daily movie by comparing year, genre, director, budget and more. A new challenge every day!",
    url: siteUrl,
    siteName: "Showle",
    locale: "pl_PL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Showle — Daily Movie Guessing Game",
    description:
      "Guess the daily movie by comparing year, genre, director, budget and more.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#7c4dff",
          colorTextOnPrimaryBackground: "#ffffff",
          colorBackground: "transparent",
          colorInputBackground: "#28282e",
          colorInputText: "#ffffff",
          colorText: "#ffffff",
          colorTextSecondary: "#b0b0c0",
          colorDanger: "#ff5252",
          colorSuccess: "#00e676",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        },
        elements: {
          rootBox: "w-full",
          card: "!bg-transparent !shadow-none w-full",
          headerTitle: "!text-white",
          headerSubtitle: "!text-[#b0b0c0]",
          socialButtonsBlockButton:
            "!border-[#3a3a42] !bg-[#28282e] hover:!bg-[#32323a] !text-white",
          formButtonPrimary:
            "!bg-[#7c4dff] hover:!bg-[#6a3de8] !text-white !shadow-none",
          footerActionLink: "!text-[#7c4dff] hover:!text-[#9b7aff]",
          footerActionText: "!text-[#b0b0c0]",
          formFieldInput:
            "!bg-[#28282e] !border-[#3a3a42] !text-white focus:!border-[#7c4dff]",
          formFieldLabel: "!text-[#b0b0c0]",
          dividerLine: "!bg-[#3a3a42]",
          dividerText: "!text-[#8a8a9a]",
          identityPreviewEditButton: "!text-[#7c4dff]",
          identityPreviewText: "!text-white",
          formResendCodeLink: "!text-[#7c4dff]",
          otpCodeFieldInput: "!border-[#3a3a42] !bg-[#28282e] !text-white",
          alert: "!bg-[#28282e] !border-[#3a3a42]",
          footer: "!bg-transparent [&_*]:!bg-transparent [&_*]:!shadow-none",
        },
      }}
    >
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
