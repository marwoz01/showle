import type { CollectionCategory } from "@/types/collection";

export type MovieStatus = CollectionCategory | null | "loading" | "error";
export function createCollectionStatusStore(request: typeof fetch = (...args) => fetch(...args)) {
  const values = new Map<number, MovieStatus>();
  const versions = new Map<number, number>();
  const listeners = new Map<number, Set<() => void>>();
  const queued = new Set<number>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = true;
  const controllers = new Set<AbortController>();
  const notify = (id: number) => listeners.get(id)?.forEach((listener) => listener());
  const set = (id: number, value: MovieStatus) => {
    versions.set(id, (versions.get(id) ?? 0) + 1);
    values.set(id, value);
    notify(id);
  };
  const flush = async () => {
    timer = undefined;
    const ids = [...queued].slice(0, 50);
    ids.forEach((id) => queued.delete(id));
    if (queued.size) timer = setTimeout(() => void flush(), 0);
    const current = ids.map((id) => versions.get(id));
    const controller = new AbortController();
    controllers.add(controller);
    try {
      const response = await request(`/api/collection/status?ids=${ids.join(",")}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("status");
      const data: { items: { tmdbId: number; category: CollectionCategory }[] } = await response.json();
      if (!Array.isArray(data.items)) throw new Error("status");
      for (const [index, id] of ids.entries()) {
        if (active && versions.get(id) === current[index]) {
          set(id, data.items.find((item) => item.tmdbId === id)?.category ?? null);
        }
      }
    } catch {
      ids.forEach((id, index) => { if (active && !controller.signal.aborted && versions.get(id) === current[index]) set(id, "error"); });
    } finally { controllers.delete(controller); }
  };
  const load = (id: number, force = false) => {
    if (!active || (!force && values.has(id))) return;
    set(id, "loading");
    queued.add(id);
    timer ??= setTimeout(() => void flush(), 0);
  };
  return {
    get: (id: number): MovieStatus => values.has(id) ? values.get(id)! : "loading",
    set, load,
    subscribe(id: number, listener: () => void) {
      const group = listeners.get(id) ?? new Set();
      group.add(listener);
      listeners.set(id, group);
      return () => { group.delete(listener); if (!group.size) listeners.delete(id); };
    },
    refresh() { listeners.forEach((_value, id) => load(id, true)); },
    start() { active = true; listeners.forEach((_value, id) => { if (!values.has(id)) load(id); }); },
    stop() {
      active = false;
      clearTimeout(timer); timer = undefined; queued.clear();
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
      values.forEach((value, id) => { if (value === "loading") values.delete(id); });
    },
  };
}
