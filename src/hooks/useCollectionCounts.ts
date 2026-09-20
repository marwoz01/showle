"use client";

import { useEffect, useState } from "react";
import { collectionRequest } from "@/lib/collection-client";
import type { CollectionCounts } from "@/types/collection";

export function useCollectionCounts() {
  const [counts, setCounts] = useState<CollectionCounts>();
  useEffect(() => {
    let ac: AbortController;
    const refresh = () => {
      ac?.abort(); ac = new AbortController();
      const current = ac;
      collectionRequest<CollectionCounts>("/api/collection/summary", { signal: ac.signal })
        .then((value) => { if (!current.signal.aborted) setCounts(value); })
        .catch(() => { if (!current.signal.aborted) setCounts(undefined); });
    };
    refresh();
    window.addEventListener("collection-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => { ac.abort(); window.removeEventListener("collection-changed", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  return counts;
}
