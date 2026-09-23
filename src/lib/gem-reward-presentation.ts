import type { GemsWallet } from "@/types/gems";

export interface GemRewardPresentation {
  id: string;
  amount: number;
  remaining: number;
}

export function getGemDisplayedBalance(wallet: GemsWallet | null, reward: GemRewardPresentation | null) {
  return wallet ? Math.max(0, wallet.balance - (reward?.remaining ?? 0)) : null;
}

export function createGemRewardPresentation() {
  let wallet: GemsWallet | null = null;
  let active: GemRewardPresentation | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: GemRewardPresentation | null) => {
    active = next;
    listeners.forEach((listener) => listener());
  };
  return {
    setWallet: (next: GemsWallet | null) => { wallet = next; },
    getSnapshot: () => active,
    getServerSnapshot: () => null,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    beginReward: (id: string) => {
      const receipt = wallet?.transactions.find((entry) => entry.id === id);
      if (!receipt || !Number.isSafeInteger(receipt.amount) || receipt.amount <= 0) return false;
      if (active) return active.id === id;
      publish({ id, amount: receipt.amount, remaining: receipt.amount });
      return true;
    },
    collectReward: (id: string, amount: number) => {
      if (!active || active.id !== id || !Number.isSafeInteger(amount) || amount <= 0) return;
      const remaining = Math.max(0, active.remaining - amount);
      if (remaining !== active.remaining) publish({ ...active, remaining });
    },
    finishReward: (id: string) => {
      if (active?.id === id) publish(null);
    },
  };
}
