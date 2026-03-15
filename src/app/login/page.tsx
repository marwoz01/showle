"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/i18n";
import { Clapperboard, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(t.auth.invalidCredentials);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl border border-white/6 bg-card shadow-2xl">
        {/* Left decorative panel */}
        <div className="relative hidden w-5/12 overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[#0d0a18]" />
          <div className="animate-blob-1 absolute -left-10 top-1/4 h-80 w-80 rounded-full bg-accent-purple/40 blur-[80px]" />
          <div className="animate-blob-2 absolute -right-10 bottom-1/4 h-72 w-72 rounded-full bg-[#5b21b6]/50 blur-[70px]" />
          <div className="animate-blob-3 absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-accent-purple/20 blur-[60px]" />
          <div className="animate-blob-4 absolute left-1/2 top-0 h-56 w-56 rounded-full bg-[#a855f7]/30 blur-[60px]" />
          <div className="relative flex h-full flex-col justify-end p-10">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Clapperboard size={20} className="text-white" />
            </div>
            <h2 className="mb-2 font-display text-3xl font-bold text-white">
              Showle
            </h2>
            <p className="text-sm text-white/60">
              {t.home.subtitle}
            </p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex w-full flex-col justify-center p-8 lg:w-7/12 lg:p-12">
          <h1 className="mb-2 font-display text-2xl font-semibold text-foreground">
            {t.auth.signIn}
          </h1>
          <p className="mb-8 text-sm text-muted">
            {t.auth.hasAccount.replace("?", ".")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                {t.auth.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-foreground placeholder-muted outline-none transition-colors focus:border-accent-purple/50"
                placeholder="email@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                {t.auth.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/8 bg-white/3 px-4 py-2.5 text-sm text-foreground placeholder-muted outline-none transition-colors focus:border-accent-purple/50"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-match-miss">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t.auth.signIn
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted">
            {t.auth.noAccount}{" "}
            <Link
              href="/register"
              className="font-semibold text-foreground hover:underline"
            >
              {t.auth.signUp}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
