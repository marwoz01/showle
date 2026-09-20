"use client";

import { Suspense, useId, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useTranslation } from "@/i18n";
import { Plus, Loader2, User, Sparkles } from "@/components/ui/icons";
import CollectionTabs from "@/components/collection/CollectionTabs";
import CollectionMovies from "@/components/collection/CollectionMovies";
import RankingsList from "@/components/collection/RankingsList";
import { useCollectionCounts } from "@/hooks/useCollectionCounts";
import type { CollectionSort, CollectionTab } from "@/types/collection";

const AddMovieModal = dynamic(() => import("@/components/collection/AddMovieModal"));
export default function CollectionPage() {
  return <Suspense fallback={<Loading />}><AuthenticatedCollection /></Suspense>;
}
function Loading() {
  return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 size={24} className="animate-spin text-muted" /></div>;
}
function AuthenticatedCollection() {
  const { t } = useTranslation();
  const { user, isLoaded } = useUser();
  if (!isLoaded) return <Loading />;
  if (!user) return <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
    <User size={24} /><p>{t.nav.login}</p><Link href="/sign-in" className="rounded-lg bg-accent-purple px-5 py-3 text-sm text-white">{t.auth.signIn}</Link>
  </div>;
  return <CollectionContent key={user.id} />;
}
function CollectionContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = useId();
  const tabParam = searchParams.get("tab");
  const activeTab: CollectionTab = tabParam === "watchlist" || tabParam === "rankings" ? tabParam : "watched";
  const [sorting, setSorting] = useState<{ tab: CollectionTab; sort: CollectionSort; order: "asc" | "desc" }>({ tab: activeTab, sort: "date", order: "desc" });
  const { sort, order } = sorting.tab === activeTab ? sorting : { sort: "date" as const, order: "desc" as const };
  const [showAdd, setShowAdd] = useState(false);
  const [revision, setRevision] = useState(0);
  const counts = useCollectionCounts();
  const changeTab = (tab: CollectionTab) => {
    setSorting({ tab, sort: "date", order: "desc" });
    router.replace(`/collection?tab=${tab}`, { scroll: false });
  };
  const changeSort = (next: CollectionSort) => setSorting({ tab: activeTab, sort: next,
    order: next === sort ? order === "asc" ? "desc" : "asc" : next === "title" ? "asc" : "desc" });
  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-bold">{t.collection.title}</h1>
      <button type="button" onClick={() => setShowAdd(true)} className="flex min-h-11 items-center gap-2 rounded-lg bg-accent-purple px-4 text-sm font-semibold text-white"><Plus size={16} />{t.collection.addMovie}</button>
    </div>
    <CollectionTabs id={id} active={activeTab} onChange={changeTab} counts={counts} />
    {(["watched", "watchlist", "rankings"] as const).map((tab) => <section key={tab} hidden={tab !== activeTab} role="tabpanel" id={`${id}-${tab}-panel`} aria-labelledby={`${id}-${tab}-tab`} tabIndex={tab === activeTab ? 0 : -1} className="space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-accent-purple">
      {tab === activeTab && <>
      {activeTab === "watchlist" && (counts?.watchlist ?? 0) > 0 && <Link href="/recommend?source=watchlist" className="soft-card flex min-h-14 items-center gap-3 rounded-2xl p-4 text-sm font-semibold text-accent-purple hover:bg-accent-purple/10">
        <Sparkles size={20} />{t.recommendation.watchlistAction}<span aria-hidden="true" className="ml-auto">→</span>
      </Link>}
      {activeTab === "rankings" ? <RankingsList /> : <CollectionMovies key={`${activeTab}:${sort}:${order}:${revision}`} category={activeTab} sort={sort} order={order} onSort={changeSort} onAdd={() => setShowAdd(true)} />}
      </>}
    </section>)}
    {showAdd && <AddMovieModal onClose={() => { setShowAdd(false); setRevision((value) => value + 1); }} />}
  </div>;
}
