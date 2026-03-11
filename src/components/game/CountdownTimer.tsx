"use client";

import { useState, useEffect } from "react";
import { getTimeUntilReset } from "@/lib/daily";
import { Clock } from "lucide-react";
import { useTranslation } from "@/i18n";

export default function CountdownTimer() {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(getTimeUntilReset());

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeUntilReset();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        window.location.reload();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/6 bg-card px-3 py-2 text-sm">
      <Clock size={14} className="text-muted" />
      <span className="text-muted">{t.game.nextIn}</span>
      <span className="font-mono font-semibold text-foreground">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}
