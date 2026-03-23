"use client";

import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 px-8 py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-muted">
        <Icon size={24} />
      </div>
      <p className="max-w-xs text-center text-sm text-muted">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-lg bg-accent-purple px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
