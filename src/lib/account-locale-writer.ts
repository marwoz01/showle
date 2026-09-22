type Locale = "pl" | "en";
type Scope = { owner: string; id: number };
type Job = Scope & { locale: Locale; promise: Promise<boolean>; resolve: (saved: boolean) => void; reject: (error: unknown) => void };

/** One writer for sidebar and profile settings. Only the latest queued choice matters. */
export function createAccountLocaleWriter(write: (owner: string, locale: Locale) => Promise<void>) {
  let active: Scope | null = null;
  let sequence = 0;
  let running: Job | null = null;
  let queued: Job | null = null;

  const isActive = (scope: Scope) => active?.id === scope.id && active.owner === scope.owner;
  const same = (job: Job | null, scope: Scope, locale: Locale) => job?.id === scope.id && job.owner === scope.owner && job.locale === locale;
  function discardQueued() {
    queued?.resolve(false);
    queued = null;
  }

  async function drain() {
    if (running) return;
    while (queued) {
      const job: Job = queued;
      queued = null;
      if (!isActive(job)) { job.resolve(false); continue; }
      running = job;
      try {
        await write(job.owner, job.locale);
        job.resolve(isActive(job) && !queued);
      } catch (error) {
        if (isActive(job) && !queued) job.reject(error);
        else job.resolve(false);
      } finally { running = null; }
    }
  }

  return {
    activate(owner: string) {
      discardQueued();
      const scope = { owner, id: ++sequence };
      active = scope;
      return () => {
        if (!isActive(scope)) return;
        active = null;
        discardQueued();
        // Let the issued request settle before starting another session's write.
        // Aborting fetch would not guarantee that its database write was cancelled.
      };
    },
    save(owner: string, locale: Locale): Promise<boolean> {
      if (!active || active.owner !== owner) return Promise.resolve(false);
      if (same(queued, active, locale)) return queued!.promise;
      if (same(running, active, locale)) { discardQueued(); return running!.promise; }
      discardQueued();
      let resolve!: Job["resolve"];
      let reject!: Job["reject"];
      const promise = new Promise<boolean>((onSaved, onFailure) => { resolve = onSaved; reject = onFailure; });
      queued = { ...active, locale, promise, resolve, reject };
      void drain();
      return promise;
    },
  };
}

export const accountLocaleWriter = createAccountLocaleWriter(async (_owner, locale) => {
  const response = await fetch("/api/profile/preferences", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }),
  });
  if (!response.ok) throw new Error("locale_update_failed");
});
