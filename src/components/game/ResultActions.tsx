"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Share2 } from "lucide-react";
import { Check } from "@/components/ui/icons";
import { useTranslation } from "@/i18n";
import SaveMovieButton from "@/components/collection/SaveMovieButton";
import { normalizeDisplayText } from "@/lib/typography";
import { shareResultText } from "@/lib/share-result-client";
import type { MediaDetails } from "@/types";

interface Props { answer: MediaDetails; getShareText: () => string; onShareFallback: (text: string) => void }

export default function ResultActions({ answer, getShareText, onShareFallback }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const active = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (status === "idle") return;
    const timeout = setTimeout(() => setStatus("idle"), 3000);
    return () => clearTimeout(timeout);
  }, [status]);
  async function share() {
    if (busy.current) return;
    busy.current = true; setPending(true); setStatus("idle");
    const text = getShareText();
    try {
      const result = await shareResultText(text, navigator);
      if (!active.current || result === "cancelled") return;
      onShareFallback(result === "manual" ? text : "");
      if (result === "copied" || result === "shared") setStatus(result);
    } finally { busy.current = false; if (active.current) setPending(false); }
  }
  return <div data-result-reveal="intro" className="flex flex-row gap-4 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:flex-col">
    <div className="aspect-2/3 w-32 shrink-0 overflow-hidden rounded-xl bg-white/5 shadow-lg shadow-black/40 lg:w-full">
      {answer.posterPath && <Image src={`https://image.tmdb.org/t/p/w342${answer.posterPath}`} alt={normalizeDisplayText(answer.title)}
        width={342} height={513} className="h-full w-full object-cover" />}
    </div>
    <div className="flex flex-1 flex-col gap-2 lg:flex-none">
      <SaveMovieButton movie={answer} variant="button" />
      <button type="button" onClick={() => void share()} disabled={pending}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-purple px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
        {status === "idle" ? <Share2 size={16} /> : <Check size={16} />}
        {status === "copied" ? t.result.copied : status === "shared" ? t.result.shared : t.result.share}
      </button>
      <span role="status" className="sr-only">{status === "copied" ? t.result.copied : status === "shared" ? t.result.shared : ""}</span>
    </div>
  </div>;
}
