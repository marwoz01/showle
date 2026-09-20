"use client";

import { useId, useRef, useState } from "react";
import { useTranslation } from "@/i18n";
import Modal from "@/components/ui/Modal";

interface ConfirmModalProps { message: string; onConfirm: () => void | boolean | Promise<void | boolean>; onCancel: () => void }
export default function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  const { t } = useTranslation();
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  async function confirm() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(false);
    try { if (await onConfirm() === false) setError(true); }
    catch { setError(true); }
    finally { busy.current = false; setPending(false); }
  }
  return <Modal titleId={id} onClose={onCancel} busy={pending} className="max-w-sm">
    <div className="space-y-3 p-6"><h2 id={id} className="text-center text-sm">{message}</h2>
      {error && <p role="alert" className="text-sm text-muted">{t.collection.saveError}</p>}</div>
    <div className="flex border-t border-white/6">
      <button type="button" autoFocus disabled={pending} onClick={onCancel} className="min-h-12 flex-1 px-4 text-sm text-muted">{t.collection.cancel}</button>
      <button type="button" disabled={pending} onClick={() => void confirm()} className="min-h-12 flex-1 border-l border-white/6 px-4 text-sm font-semibold text-accent-purple disabled:opacity-50">{t.collection.confirmAction}</button>
    </div>
  </Modal>;
}
