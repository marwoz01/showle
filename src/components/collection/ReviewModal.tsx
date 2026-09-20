"use client";

import { useId, useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import { X } from "@/components/ui/icons";
import Modal from "@/components/ui/Modal";
import { normalizeDisplayText } from "@/lib/typography";
import { MAX_REVIEW_LENGTH } from "@/lib/collection-input";

interface ReviewModalProps {
  movieTitle: string;
  initialReview: string | null;
  onSave: (review: string) => Promise<boolean>;
  onClose: () => void;
}
export default function ReviewModal({ movieTitle, initialReview, onSave, onClose }: ReviewModalProps) {
  const { t } = useTranslation();
  const id = useId();
  const [text, setText] = useState(initialReview ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true; setSaving(true); setError(false);
    try { if (await onSave(text)) onClose(); else setError(true); }
    catch { setError(true); }
    finally { busy.current = false; setSaving(false); }
  }
  return <Modal titleId={id} onClose={onClose} busy={saving}>
    <form onSubmit={(event) => void save(event)}>
      <div className="flex items-center justify-between gap-3 border-b border-white/6 px-6 py-4">
        <div><h2 id={id} className="font-semibold">{initialReview ? t.collection.editReview : t.collection.writeReview}</h2>
          <p className="text-xs text-muted">{normalizeDisplayText(movieTitle)}</p></div>
        <button type="button" onClick={onClose} disabled={saving} aria-label={t.collection.cancel} className="rounded-lg p-3 text-muted"><X size={18} /></button>
      </div>
      <div className="space-y-2 p-6">
        <label htmlFor={`${id}-review`} className="sr-only">{t.collection.review}</label>
        <textarea id={`${id}-review`} autoFocus value={text} onChange={(event) => setText(event.target.value)} maxLength={MAX_REVIEW_LENGTH}
          disabled={saving} placeholder={t.collection.reviewPlaceholder} rows={6} aria-describedby={`${id}-count`}
          className="w-full resize-none rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm outline-none focus:border-accent-purple" />
        <p id={`${id}-count`} className="text-right text-xs text-muted">{text.length}/{MAX_REVIEW_LENGTH}</p>
        {error && <p role="alert" className="text-sm text-muted">{t.collection.saveError}</p>}
      </div>
      <div className="flex justify-end gap-3 border-t border-white/6 px-6 py-4">
        <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-lg bg-white/5 px-4 text-sm">{t.collection.cancel}</button>
        <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-accent-purple px-4 text-sm font-semibold text-white disabled:opacity-50">{t.collection.saveReview}</button>
      </div>
    </form>
  </Modal>;
}
