"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n";
import { Plus, Loader2, Trash2, Trophy } from "lucide-react";
import EmptyState from "@/components/collection/EmptyState";
import RankingDetail from "@/components/collection/RankingDetail";
import ConfirmModal from "@/components/collection/ConfirmModal";

interface RankedListSummary {
  id: string;
  name: string;
  description: string | null;
  _count: { items: number };
  items: { id: string; posterPath: string }[];
}

export default function RankingsList() {
  const { t } = useTranslation();
  const [lists, setLists] = useState<RankedListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    try {
      const res = await fetch("/api/collection/rankings");
      const data = await res.json();
      setLists(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);

    try {
      await fetch("/api/collection/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim() || null,
        }),
      });
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      fetchLists();
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLists((prev) => prev.filter((l) => l.id !== id));
    setDeleteId(null);
    await fetch(`/api/collection/rankings/${id}`, { method: "DELETE" });
  };

  if (activeListId) {
    return (
      <RankingDetail
        listId={activeListId}
        onBack={() => {
          setActiveListId(null);
          fetchLists();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create button */}
      <button
        onClick={() => setShowCreate(!showCreate)}
        className="flex items-center gap-2 rounded-lg bg-accent-purple px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        <Plus size={16} />
        {t.collection.createList}
      </button>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-white/6 bg-card p-4">
          <input
            type="text"
            placeholder={t.collection.listNamePlaceholder}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="mb-3 w-full rounded-lg border border-white/6 bg-white/3 px-4 py-2.5 text-sm text-foreground placeholder-muted outline-none focus:border-accent-purple/50"
            autoFocus
          />
          <input
            type="text"
            placeholder={t.collection.listDescription}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="mb-3 w-full rounded-lg border border-white/6 bg-white/3 px-4 py-2.5 text-sm text-foreground placeholder-muted outline-none focus:border-accent-purple/50"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="rounded-lg bg-accent-purple px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                t.collection.createList
              )}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-white/6 bg-white/3 px-4 py-2 text-sm text-muted transition-colors hover:bg-white/6"
            >
              {t.game.back}
            </button>
          </div>
        </div>
      )}

      {/* Lists */}
      {lists.length === 0 && !showCreate ? (
        <EmptyState
          icon={Trophy}
          message={t.collection.emptyRankings}
          action={{
            label: t.collection.createList,
            onClick: () => setShowCreate(true),
          }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => setActiveListId(list.id)}
              className="group relative flex items-center gap-4 rounded-xl border border-white/6 bg-card p-4 text-left transition-all hover:bg-card-hover"
            >
              {/* Poster previews */}
              <div className="flex -space-x-3">
                {list.items.length > 0
                  ? list.items.map((item) =>
                      item.posterPath ? (
                        <Image
                          key={item.id}
                          src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
                          alt=""
                          width={32}
                          height={48}
                          className="rounded border border-white/10"
                        />
                      ) : (
                        <div
                          key={item.id}
                          className="flex h-12 w-8 items-center justify-center rounded border border-white/10 bg-white/5 text-[8px] text-muted"
                        >
                          ?
                        </div>
                      )
                    )
                  : (
                    <div className="flex h-12 w-8 items-center justify-center rounded bg-white/5 text-muted">
                      <Trophy size={14} />
                    </div>
                  )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {list.name}
                </p>
                {list.description && (
                  <p className="truncate text-xs text-muted">
                    {list.description}
                  </p>
                )}
                <p className="text-xs text-muted">
                  {t.collection.movieCount(list._count.items)}
                </p>
              </div>

              {/* Delete */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(list.id);
                }}
                className="rounded-md p-1.5 text-muted opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </div>
            </button>
          ))}
        </div>
      )}

      {deleteId && (
        <ConfirmModal
          message={t.collection.deleteListConfirm}
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
