"use client";

import { useTranslation } from "@/i18n";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-card shadow-2xl">
        <div className="flex flex-col items-center gap-3 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <p className="text-center text-sm text-foreground">{message}</p>
        </div>
        <div className="flex border-t border-white/6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-white/4 hover:text-foreground"
          >
            {t.collection.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 border-l border-white/6 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
          >
            {t.collection.confirmAction}
          </button>
        </div>
      </div>
    </div>
  );
}
