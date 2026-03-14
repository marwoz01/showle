"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "@/i18n";
import { Clapperboard, Mail, Lock, User, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t.auth.passwordMin);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.auth.passwordMismatch);
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (res.status === 409) {
        setError(t.auth.emailInUse);
      } else {
        setError(data.error || "Something went wrong");
      }
      return;
    }

    router.push("/login");
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/8">
            <Clapperboard size={24} />
          </div>
          <h1 className="font-display text-2xl font-semibold">
            {t.auth.signUp}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted">{t.auth.name}</label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-white/6 bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted outline-none transition-colors focus:border-accent-purple/50"
                placeholder={t.auth.namePlaceholder}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted">{t.auth.email}</label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/6 bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted outline-none transition-colors focus:border-accent-purple/50"
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted">{t.auth.password}</label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/6 bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted outline-none transition-colors focus:border-accent-purple/50"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted">
              {t.auth.confirmPassword}
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-white/6 bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted outline-none transition-colors focus:border-accent-purple/50"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-match-miss">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-purple py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              t.auth.signUp
            )}
          </button>
        </form>

        {/* Link to login */}
        <p className="text-center text-sm text-muted">
          {t.auth.hasAccount}{" "}
          <Link href="/login" className="text-accent-purple hover:underline">
            {t.auth.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
