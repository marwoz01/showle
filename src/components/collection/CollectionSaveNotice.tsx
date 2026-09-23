"use client";

import { useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import { Check, Loader2, X } from "@/components/ui/icons";
import type { CollectionSaveResult } from "@/types/collection";

interface CollectionSaveNoticeProps {
  result: CollectionSaveResult;
  onUndone: () => void;
  onDismiss: () => void;
}

export default function CollectionSaveNotice({ result, onUndone, onDismiss }: CollectionSaveNoticeProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [undone, setUndone] = useState(false);
  const [error, setError] = useState<"failed" | "conflict" | "expired" | null>(null);
  const pending = useRef(false);

  const undo = async () => {
    if (pending.current || undone) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/collection/bulk", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ undoToken: result.undoToken }),
      });
      if (!response.ok) {
        setError(response.status === 409 ? "conflict" : response.status === 400 ? "expired" : "failed");
        return;
      }
      setUndone(true);
      window.dispatchEvent(new Event("collection-updated"));
      onUndone();
    } catch {
      setError("failed");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const message = error === "conflict" ? t.collection.undoConflict
    : error === "expired" ? t.collection.undoExpired
    : error ? t.collection.undoError
    : undone ? t.collection.undone
    : result.category === "watchlist" ? t.collection.savedToWatchlist(result.count)
    : t.collection.savedAsWatched(result.count);

  return (
    <div className="fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-accent-purple/30 bg-card px-4 py-3 shadow-2xl sm:inset-x-6 sm:bottom-6">
      <Check size={18} className="shrink-0 text-accent-purple" />
      <p role={error ? "alert" : "status"} className="min-w-0 flex-1 text-sm text-foreground">{message}</p>
      {!undone && error !== "conflict" && error !== "expired" && (
        <button type="button" onClick={() => void undo()} disabled={busy} aria-busy={busy}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-accent-purple hover:bg-accent-purple/10 disabled:opacity-50">
          {busy && <Loader2 size={14} className="animate-spin" />}{t.collection.undo}
        </button>
      )}
      <button type="button" onClick={onDismiss} disabled={busy} aria-label={t.collection.close}
        className="shrink-0 rounded-lg p-2 text-muted hover:bg-white/5 hover:text-foreground disabled:opacity-50"><X size={16} /></button>
    </div>
  );
}
