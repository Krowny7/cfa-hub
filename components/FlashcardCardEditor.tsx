"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { TopicSelector, TopicBadge } from "@/components/TopicSelector";
import { RichText } from "@/components/RichText";

type Card = { id: string; front: string; back: string; position: number; topic_id?: number | null };

// Toutes les cartes d'un set, recto et verso côte à côte ; le propriétaire
// peut modifier (recto, verso, matière) ou supprimer une carte.
export function FlashcardCardEditor({ setId, initialCards, isOwner }: { setId: string; initialCards: Card[]; isOwner: boolean }) {
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
    const { data } = await supabase.from("flashcards").select("id,front,back,position").eq("set_id", setId).order("position", { ascending: true });
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
      setMsg("Carte enregistrée.");
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, "Erreur")}`);
    } finally {
      setBusy(false);
    }
  }

  async function deleteCard(id: string) {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("flashcards").delete().eq("id", id).eq("set_id", setId);
      if (error) throw new Error(error.message);
      const remaining = cards.filter((c) => c.id !== id);
      await Promise.all(remaining.map((c, i) => supabase.from("flashcards").update({ position: i + 1 }).eq("id", c.id)));
      await refresh();
      setConfirmDeleteId(null);
      setMsg("Carte supprimée.");
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, "Erreur")}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      {msg && (
        <p role="status" className="t-small">
          {msg}
        </p>
      )}
      {cards.length === 0 ? (
        <p className="t-small">Aucune carte pour l&apos;instant.</p>
      ) : (
        <ol className="m-0 grid list-none gap-2 p-0">
          {cards.map((c) => {
            const isEditing = editingId === c.id;
            const isConfirming = confirmDeleteId === c.id;

            return (
              <li key={c.id} className={"rounded-[14px] border px-4 py-3.5 " + (isEditing ? "border-line-2 bg-surface" : "border-line")}>
                <div className="flex items-start gap-3">
                  <span className="t-micro w-7 shrink-0 pt-0.5 font-mono font-semibold tabular-nums">{c.position}</span>

                  {isEditing ? (
                    <div className="grid min-w-0 flex-1 gap-3">
                      <textarea
                        className="input box-border w-full"
                        rows={2}
                        value={editFront}
                        onChange={(e) => setEditFront(e.target.value)}
                        placeholder="Recto"
                        aria-label="Recto"
                      />
                      <textarea
                        className="input box-border w-full"
                        rows={3}
                        value={editBack}
                        onChange={(e) => setEditBack(e.target.value)}
                        placeholder="Verso"
                        aria-label="Verso"
                      />
                      <div>
                        <TopicSelector value={editTopic} onChange={setEditTopic} disabled={busy} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={saveEdit}>
                          {busy ? "…" : "Enregistrer"}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2 sm:gap-6">
                      <RichText text={c.front} className="break-words text-[14px] font-semibold leading-snug [overflow-wrap:anywhere]" />
                      <div className="min-w-0">
                        <RichText text={c.back} className="text-body break-words text-[14px] leading-snug [overflow-wrap:anywhere]" />
                        {c.topic_id ? (
                          <div className="mt-2">
                            <TopicBadge topicId={c.topic_id} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {isOwner && !isEditing && (
                    <div className="flex shrink-0 items-center gap-1">
                      {isConfirming ? (
                        <>
                          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => deleteCard(c.id)}>
                            Supprimer
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDeleteId(null)}>
                            Annuler
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="icon-btn h-8 w-8 rounded-[10px]" onClick={() => startEdit(c)} aria-label={`Modifier la carte ${c.position}`}>
                            <Pencil size={14} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="icon-btn h-8 w-8 rounded-[10px] text-pen"
                            onClick={() => {
                              setConfirmDeleteId(c.id);
                              cancelEdit();
                            }}
                            aria-label={`Supprimer la carte ${c.position}`}
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
