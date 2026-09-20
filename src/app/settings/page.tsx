import AccountSettings from "@/components/account/AccountSettings";
import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function SettingsPage() { return <AccountSettings />; }
