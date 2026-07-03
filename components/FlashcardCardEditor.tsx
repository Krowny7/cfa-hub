"use client";

import { useMemo, useState } from "react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { TopicSelector, TopicBadge } from "@/components/TopicSelector";

type Card = { id: string; front: string; back: string; position: number; topic_id?: number | null };

export function FlashcardCardEditor({
  setId,
  initialCards,
  isOwner,
}: {
  setId: string;
  initialCards: Card[];
  isOwner: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editTopic, setEditTopic] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase
      .from("flashcards")
      .select("id,front,back,position")
      .eq("set_id", setId)
      .order("position", { ascending: true });
    setCards((data ?? []) as Card[]);
  }

  function startEdit(c: Card) {
    setConfirmDeleteId(null);
    setEditingId(c.id);
    setEditFront(c.front);
    setEditBack(c.back);
    setEditTopic(c.topic_id ?? null);
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFront("");
    setEditBack("");
    setEditTopic(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("flashcards")
        .update({ front: editFront.trim(), back: editBack.trim(), topic_id: editTopic })
        .eq("id", editingId)
        .eq("set_id", setId);
      if (error) throw new Error(error.message);
      await refresh();
      cancelEdit();
      setMsg("✅");
    } catch (e: unknown) {
      setMsg(`❌ ${friendlyError(e, "Erreur")}`);
    } finally {
      setBusy(false);
    }
  }

  async function deleteCard(id: string) {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .eq("id", id)
        .eq("set_id", setId);
      if (error) throw new Error(error.message);
      const remaining = cards.filter((c) => c.id !== id);
      await Promise.all(
        remaining.map((c, i) =>
          supabase.from("flashcards").update({ position: i + 1 }).eq("id", c.id)
        )
      );
      await refresh();
      setConfirmDeleteId(null);
      setMsg("✅");
    } catch (e: unknown) {
      setMsg(`❌ ${friendlyError(e, "Erreur")}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Cartes ({cards.length})</h2>
      </div>
      {msg && <div className="mt-2 text-sm">{msg}</div>}
      <div className="mt-3 grid gap-2">
        {cards.map((c) => {
          const isEditing = editingId === c.id;
          const isConfirming = confirmDeleteId === c.id;

          return (
            <div key={c.id} className="card-soft p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-white/40">#{c.position}</div>
                {isOwner && !isEditing && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="rounded px-2 py-0.5 text-xs border border-white/10 hover:bg-white/5"
                      onClick={() => startEdit(c)}
                    >
                      Éditer
                    </button>
                    {isConfirming ? (
                      <>
                        <button
                          type="button"
                          className="rounded px-2 py-0.5 text-xs border border-red-500/50 bg-red-500/20 text-red-100 hover:bg-red-500/30 disabled:opacity-50"
                          disabled={busy}
                          onClick={() => deleteCard(c.id)}
                        >
                          Confirmer
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-0.5 text-xs border border-white/10 hover:bg-white/5"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-xs border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                        onClick={() => {
                          setConfirmDeleteId(c.id);
                          cancelEdit();
                        }}
                      >
                        Suppr.
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="mt-2 grid gap-2">
                  <textarea
                    className="box-border w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm"
                    rows={2}
                    value={editFront}
                    onChange={(e) => setEditFront(e.target.value)}
                    placeholder="Recto"
                  />
                  <textarea
                    className="box-border w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white/70"
                    rows={2}
                    value={editBack}
                    onChange={(e) => setEditBack(e.target.value)}
                    placeholder="Verso"
                  />
                  <TopicSelector value={editTopic} onChange={setEditTopic} disabled={busy} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-black disabled:opacity-50"
                      disabled={busy}
                      onClick={saveEdit}
                    >
                      {busy ? "…" : "Sauvegarder"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
                      onClick={cancelEdit}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-1 whitespace-pre-wrap text-sm font-medium break-words [overflow-wrap:anywhere]">
                    {c.front}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-white/70 break-words [overflow-wrap:anywhere]">
                    {c.back}
                  </div>
                  {c.topic_id && (
                    <div className="mt-2">
                      <TopicBadge topicId={c.topic_id} />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
        {cards.length === 0 && (
          <div className="text-sm text-white/50">Aucune carte pour l'instant.</div>
        )}
      </div>
    </div>
  );
}
