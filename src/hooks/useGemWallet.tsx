"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { HIGHER_LOWER_ACCOUNT_RESET_EVENT } from "@/lib/higher-lower-storage";
import type { GemsWallet } from "@/types/gems";

export const GEM_WALLET_UPDATED_EVENT = "gem-wallet-updated";

interface WalletState {
  userId: string | null;
  data: GemsWallet | null;
  error: boolean;
}

const GemWalletContext = createContext({
  wallet: null as GemsWallet | null,
  loading: false,
  error: false,
  refresh: () => {},
});

export function GemWalletProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const userId = isLoaded && isSignedIn ? user?.id ?? null : null;
  const pathname = usePathname();
  const request = useRef<AbortController | null>(null);
  const [state, setState] = useState<WalletState>({ userId: null, data: null, error: false });
  const refresh = useCallback(() => {
    request.current?.abort();
    if (!userId) return;
    const controller = new AbortController();
    request.current = controller;
    void fetch("/api/user/wallet", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("wallet");
        const data: GemsWallet = await response.json();
        if (!controller.signal.aborted) setState({ userId, data, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState((previous) => ({
          userId,
          data: previous.userId === userId ? previous.data : null,
          error: true,
        }));
      });
  }, [userId]);

  useEffect(() => {
    refresh();
    const events = ["focus", "game-completed", GEM_WALLET_UPDATED_EVENT];
    const reset = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== userId) return;
      setState({ userId, data: null, error: false });
      refresh();
    };
    events.forEach((event) => window.addEventListener(event, refresh));
    window.addEventListener(HIGHER_LOWER_ACCOUNT_RESET_EVENT, reset);
    return () => {
      request.current?.abort();
      events.forEach((event) => window.removeEventListener(event, refresh));
      window.removeEventListener(HIGHER_LOWER_ACCOUNT_RESET_EVENT, reset);
    };
  }, [refresh, pathname, userId]);

  if (state.userId !== userId) setState({ userId, data: null, error: false });
  const data = state.userId === userId && userId ? state.data : null;
  const error = state.userId === userId && Boolean(userId) && state.error;
  return <GemWalletContext.Provider value={{ wallet: data, loading: Boolean(userId) && !data && !error, error, refresh }}>{children}</GemWalletContext.Provider>;
}

export function useGemWallet() {
  return useContext(GemWalletContext);
}
