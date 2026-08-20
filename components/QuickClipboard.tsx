"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Send, Copy, ClipboardCheck, Trash2, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { friendlyError } from "@/lib/errors";

type Note = { id: string; content: string; created_at: string; expires_at: string };

const TTL_SECONDS = 5 * 60;
const POLL_MS = 3000;

function secondsLeft(expiresAt: string) {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export function QuickClipboard() {
  const supabase = useMemo(() => createClient(), []);
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  const refresh = useCallback(async () => {
    const nowIso = new Date().toISOString();
    // Lazy delete : purge ses propres notes expirées à chaque poll, pas
    // besoin de cron côté serveur pour une simple page de scratch perso.
    await supabase.from("quick_notes").delete().lt("expires_at", nowIso);
    const { data } = await supabase
      .from("quick_notes")
      .select("id,content,created_at,expires_at")
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false });
    setNotes((data ?? []) as Note[]);
  }, [supabase]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(refresh, POLL_MS);
    const tick = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [refresh]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Non connecté");
      const { error: insErr } = await supabase.from("quick_notes").insert({
        user_id: auth.user.id,
        content: text,
      });
      if (insErr) throw new Error(insErr.message);
      setText("");
      await refresh();
    } catch (e: unknown) {
      setError(friendlyError(e, "Erreur lors de l'envoi"));
    } finally {
      setSending(false);
    }
  }

  async function copy(note: Note) {
    try {
      await navigator.clipboard.writeText(note.content);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId((v) => (v === note.id ? null : v)), 2000);
    } catch {
      setError("Impossible de copier automatiquement.");
    }
  }

  async function remove(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("quick_notes").delete().eq("id", id);
  }

  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <div className="mb-1 text-sm font-semibold">Presse-papier rapide</div>
        <div className="mb-3 text-xs text-white/50">
          Colle du texte ou du code ici pour le récupérer sur un autre appareil connecté au même compte —
          supprimé automatiquement après {TTL_SECONDS / 60} minutes.
        </div>
        <textarea
          className="input min-h-[140px] w-full resize-y font-mono text-sm"
          placeholder="Colle ton code ici…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void send();
          }}
        />
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-white/30">Ctrl/Cmd + Entrée pour envoyer</div>
          <button
            type="button"
            className="btn btn-primary inline-flex items-center gap-1.5"
            disabled={!text.trim() || sending}
            onClick={send}
          >
            <Send size={15} /> {sending ? "…" : "Envoyer"}
          </button>
        </div>
        {error && <div className="mt-2 text-sm text-red-300">{error}</div>}
      </div>

      {notes.length > 0 && (
        <div className="grid gap-2">
          {notes.map((n) => {
            const left = secondsLeft(n.expires_at);
            const mm = Math.floor(left / 60);
            const ss = left % 60;
            return (
              <div key={n.id} className="card p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Clock size={12} /> expire dans {mm}:{String(ss).padStart(2, "0")}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="btn btn-secondary inline-flex items-center gap-1.5 py-1 text-xs"
                      onClick={() => copy(n)}
                    >
                      {copiedId === n.id ? <ClipboardCheck size={13} className="text-green-400" /> : <Copy size={13} />}
                      {copiedId === n.id ? "Copié !" : "Copier"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
                      onClick={() => remove(n.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-white/80">{n.content}</pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
