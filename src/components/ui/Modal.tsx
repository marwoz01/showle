"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps { titleId: string; onClose: () => void; children: ReactNode; busy?: boolean; className?: string }
export default function Modal({ titleId, onClose, children, busy = false, className = "max-w-lg" }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => { dialog?.close(); if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} aria-modal="true" aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); if (!busy) closeRef.current(); }}
    onKeyDown={(event) => event.stopPropagation()}
    onClick={(event) => {
      event.stopPropagation();
      if (event.target !== event.currentTarget || busy) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeRef.current();
    }}
    className={`fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] overflow-y-auto rounded-2xl border border-white/10 bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/60 ${className}`}>
    {children}
  </dialog>;
}
