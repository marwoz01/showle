"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { I18nProvider, useTranslation } from "@/i18n";
import type { Locale } from "@/i18n";
import { clerkEn, clerkPl } from "@/i18n/clerk";

const appearance = {
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
};

function LocalizedClerkProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useTranslation();

  return (
    <ClerkProvider
      appearance={appearance}
      localization={locale === "pl" ? clerkPl : clerkEn}
    >
      {children}
    </ClerkProvider>
  );
}

export default function AppProviders({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <LocalizedClerkProvider>{children}</LocalizedClerkProvider>
    </I18nProvider>
  );
}
