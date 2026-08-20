"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Copy, ClipboardCheck, Trash2, Clock, Paperclip, Download, X } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { friendlyError } from "@/lib/errors";

type Note = {
  id: string;
  content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  expires_at: string;
};

const TTL_SECONDS = 5 * 60;
const POLL_MS = 3000;
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 Mo

function secondsLeft(expiresAt: string) {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function QuickClipboard() {
  const supabase = useMemo(() => createClient(), []);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, forceTick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const nowIso = new Date().toISOString();
    // Lazy delete : purge ses propres notes/fichiers expirés à chaque
    // poll, pas besoin de cron côté serveur pour une simple page de
    // scratch perso.
    const { data: expired } = await supabase
      .from("quick_notes")
      .select("id,file_path")
      .lt("expires_at", nowIso);
    const paths = (expired ?? []).map((n) => n.file_path).filter((p): p is string => Boolean(p));
    if (paths.length > 0) await supabase.storage.from("quick-files").remove(paths);
    if ((expired ?? []).length > 0) await supabase.from("quick_notes").delete().lt("expires_at", nowIso);

    const { data } = await supabase
      .from("quick_notes")
      .select("id,content,file_path,file_name,file_size,created_at,expires_at")
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

  function pickFile(f: File | null) {
    setError(null);
    if (f && f.size > MAX_FILE_BYTES) {
      setError(`Fichier trop volumineux (max ${fmtSize(MAX_FILE_BYTES)}).`);
      return;
    }
    setFile(f);
  }

  async function send() {
    if ((!text.trim() && !file) || sending) return;
    setSending(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Non connecté");

      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileSize: number | null = null;

      if (file) {
        const path = `${auth.user.id}/${Date.now()}-${file.name}`;
        const up = await supabase.storage.from("quick-files").upload(path, file, {
          contentType: file.type || "application/octet-stream",
        });
        if (up.error) throw up.error;
        filePath = path;
        fileName = file.name;
        fileSize = file.size;
      }

      const { error: insErr } = await supabase.from("quick_notes").insert({
        user_id: auth.user.id,
        content: text.trim() || null,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
      });
      if (insErr) throw new Error(insErr.message);
      setText("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();
    } catch (e: unknown) {
      setError(friendlyError(e, "Erreur lors de l'envoi"));
    } finally {
      setSending(false);
    }
  }

  async function copy(note: Note) {
    if (!note.content) return;
    try {
      await navigator.clipboard.writeText(note.content);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId((v) => (v === note.id ? null : v)), 2000);
    } catch {
      setError("Impossible de copier automatiquement.");
    }
  }

  async function download(note: Note) {
    if (!note.file_path || !note.file_name) return;
    setDownloadingId(note.id);
    setError(null);
    try {
      const { data, error: signErr } = await supabase.storage
        .from("quick-files")
        .createSignedUrl(note.file_path, 60);
      if (signErr) throw signErr;
      if (data?.signedUrl) {
        const a = document.createElement("a");
        a.href = data.signedUrl;
        a.download = note.file_name;
        a.click();
      }
    } catch (e: unknown) {
      setError(friendlyError(e, "Erreur lors du téléchargement"));
    } finally {
      setDownloadingId(null);
    }
  }

  async function remove(note: Note) {
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    if (note.file_path) await supabase.storage.from("quick-files").remove([note.file_path]);
    await supabase.from("quick_notes").delete().eq("id", note.id);
  }

  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <div className="mb-1 text-sm font-semibold">Presse-papier rapide</div>
        <div className="mb-3 text-xs text-white/50">
          Colle du texte/code ou joins un fichier (zip, etc.) pour le récupérer sur un autre appareil
          connecté au même compte — supprimé automatiquement après {TTL_SECONDS / 60} minutes.
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

        {file && (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
            <span className="truncate text-white/70">{file.name} · {fmtSize(file.size)}</span>
            <button type="button" className="text-white/40 hover:text-white/70" onClick={() => pickFile(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <label className="btn btn-secondary inline-flex cursor-pointer items-center gap-1.5 text-xs">
              <Paperclip size={14} /> Joindre un fichier
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="hidden text-xs text-white/30 sm:block">Ctrl/Cmd + Entrée pour envoyer</div>
          </div>
          <button
            type="button"
            className="btn btn-primary inline-flex items-center gap-1.5"
            disabled={(!text.trim() && !file) || sending}
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
                    {n.content && (
                      <button
                        type="button"
                        className="btn btn-secondary inline-flex items-center gap-1.5 py-1 text-xs"
                        onClick={() => copy(n)}
                      >
                        {copiedId === n.id ? <ClipboardCheck size={13} className="text-green-400" /> : <Copy size={13} />}
                        {copiedId === n.id ? "Copié !" : "Copier"}
                      </button>
                    )}
                    {n.file_path && (
                      <button
                        type="button"
                        className="btn btn-secondary inline-flex items-center gap-1.5 py-1 text-xs"
                        disabled={downloadingId === n.id}
                        onClick={() => download(n)}
                      >
                        <Download size={13} /> {downloadingId === n.id ? "…" : "Télécharger"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
                      onClick={() => remove(n)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {n.file_path && n.file_name && (
                  <div className="mb-2 flex items-center gap-1.5 text-xs text-white/60">
                    <Paperclip size={12} className="shrink-0" />
                    <span className="truncate">{n.file_name}</span>
                    {n.file_size !== null && <span className="shrink-0 text-white/30">· {fmtSize(n.file_size)}</span>}
                  </div>
                )}
                {n.content && (
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-white/80">{n.content}</pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
