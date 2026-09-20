"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { createCollectionStatusStore } from "@/lib/collection-status";
import type { CollectionChange } from "@/lib/collection-client";

const Context = createContext<ReturnType<typeof createCollectionStatusStore> | null>(null);
function AccountCollection({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const { userId } = useAuth();
  const [store] = useState(() => createCollectionStatusStore());
  useEffect(() => {
    store.start();
    const update = (event: Event) => {
      const change = (event as CustomEvent<CollectionChange>).detail;
      if (change?.owner !== userId) return;
      const movie = change.movie;
      if (movie) store.set(movie.tmdbId, movie.category);
      else store.refresh();
    };
    const refresh = () => { if (enabled) store.refresh(); };
    window.addEventListener("collection-changed", update);
    window.addEventListener("focus", refresh);
    return () => { store.stop(); window.removeEventListener("collection-changed", update); window.removeEventListener("focus", refresh); };
  }, [store, enabled, userId]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export default function CollectionProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  return <AccountCollection key={userId ?? "guest"} enabled={Boolean(userId)}>{children}</AccountCollection>;
}
export function useCollectionStatus(id: number) {
  const store = useContext(Context);
  if (!store) throw new Error("CollectionProvider is required");
  const { userId } = useAuth();
  const subscribe = useCallback((listener: () => void) => store.subscribe(id, listener), [store, id]);
  const snapshot = useCallback(() => store.get(id), [store, id]);
  const status = useSyncExternalStore(subscribe, snapshot, () => "loading" as const);
  useEffect(() => { if (userId) store.load(id); }, [id, userId, store]);
  return { status, retry: () => store.load(id, true) };
}
