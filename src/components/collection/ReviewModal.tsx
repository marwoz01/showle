"use client";

import { useState } from "react";
import { useTranslation } from "@/i18n";
import { X } from "lucide-react";

interface ReviewModalProps {
  movieTitle: string;
  initialReview: string | null;
  onSave: (review: string) => void;
  onClose: () => void;
}

const MAX_CHARS = 1000;

export default function ReviewModal({
  movieTitle,
  initialReview,
  onSave,
  onClose,
}: ReviewModalProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialReview || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/6 bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/6 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {initialReview ? t.collection.editReview : t.collection.writeReview}
            </h3>
            <p className="text-xs text-muted">{movieTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/4 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            placeholder={t.collection.reviewPlaceholder}
            rows={6}
            className="w-full resize-none rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:border-accent-purple focus:outline-none"
          />
          <div className="mt-2 text-right text-xs text-muted">
            {text.length}/{MAX_CHARS}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-white/6 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/6 bg-white/3 px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/6 hover:text-foreground"
          >
            {t.game.back}
          </button>
          <button
            onClick={() => onSave(text)}
            className="rounded-lg bg-accent-purple px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {t.collection.saveReview}
          </button>
        </div>
      </div>
    </div>
  );
}
