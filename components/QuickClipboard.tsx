"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Copy, ClipboardCheck, Trash2, Clock, Paperclip, Download, X, Hourglass } from "lucide-react";
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

// Durées de conservation : 5 minutes par défaut (passer du code d'un
// appareil à l'autre), 24 heures sur demande (garder un fichier pour la journée).
const DUREES = [
  { cle: "court", label: "5 min", ms: 5 * 60_000 },
  { cle: "jour", label: "24 h", ms: 24 * 3600_000 },
] as const;
type Duree = (typeof DUREES)[number]["cle"];
const JOUR_MS = 24 * 3600_000;
const POLL_MS = 3000;
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 Mo par fichier
const MAX_FILES = 10;

function secondsLeft(expiresAt: string) {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

/** « 4:12 » sous l'heure, « 23 h 05 » au-delà */
function fmtLeft(s: number) {
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Nom de fichier accepté par le stockage (sans accents ni caractères spéciaux). */
function nomStockage(name: string) {
  const propre = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_");
  return propre.slice(-120) || "fichier";
}

export function QuickClipboard() {
  const supabase = useMemo(() => createClient(), []);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [duree, setDuree] = useState<Duree>("court");
  const [notes, setNotes] = useState<Note[]>([]);
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
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

  function addFiles(list: FileList | File[] | null) {
    setError(null);
    const nouveaux = Array.from(list ?? []);
    const tropGros = nouveaux.filter((f) => f.size > MAX_FILE_BYTES);
    if (tropGros.length > 0) setError(`Trop volumineux (max ${fmtSize(MAX_FILE_BYTES)} par fichier) : ${tropGros.map((f) => f.name).join(", ")}`);
    setFiles((prev) => {
      const tous = [...prev, ...nouveaux.filter((f) => f.size <= MAX_FILE_BYTES)];
      if (tous.length > MAX_FILES) setError(`${MAX_FILES} fichiers au plus par envoi.`);
      return tous.slice(0, MAX_FILES);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function send() {
    if ((!text.trim() && files.length === 0) || sending) return;
    setSending(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Non connecté");
      const expiresAt = new Date(Date.now() + (DUREES.find((d) => d.cle === duree)?.ms ?? DUREES[0].ms)).toISOString();

      // un dépôt par fichier ; le texte va avec le premier (ou seul, sans fichier)
      const lots: { content: string | null; file: File | null }[] = files.length
        ? files.map((f, i) => ({ content: i === 0 ? text.trim() || null : null, file: f }))
        : [{ content: text.trim(), file: null }];
      const stamp = Date.now();
      for (const [i, lot] of lots.entries()) {
        let filePath: string | null = null;
        if (lot.file) {
          filePath = `${auth.user.id}/${stamp}-${i}-${nomStockage(lot.file.name)}`;
          const up = await supabase.storage.from("quick-files").upload(filePath, lot.file, {
            contentType: lot.file.type || "application/octet-stream",
          });
          if (up.error) throw up.error;
        }
        const { error: insErr } = await supabase.from("quick_notes").insert({
          user_id: auth.user.id,
          content: lot.content,
          file_path: filePath,
          file_name: lot.file?.name ?? null,
          file_size: lot.file?.size ?? null,
          expires_at: expiresAt,
        });
        if (insErr) throw new Error(insErr.message);
      }
      setText("");
      setFiles([]);
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
        .createSignedUrl(note.file_path, 60, { download: note.file_name });
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

  /** Un dépôt de 5 minutes passe à 24 heures (comptées depuis son envoi). */
  async function garderJour(note: Note) {
    const expiresAt = new Date(new Date(note.created_at).getTime() + JOUR_MS).toISOString();
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, expires_at: expiresAt } : n)));
    const { error: upErr } = await supabase.from("quick_notes").update({ expires_at: expiresAt }).eq("id", note.id);
    if (upErr) {
      setError(friendlyError(upErr, "Impossible de prolonger"));
      await refresh();
    }
  }

  async function remove(note: Note) {
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    if (note.file_path) await supabase.storage.from("quick-files").remove([note.file_path]);
    await supabase.from("quick_notes").delete().eq("id", note.id);
  }

  return (
    <div className="grid gap-4">
      <div
        className={"card p-5 transition-shadow " + (survol ? "ring-2 ring-white/40" : "")}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setSurvol(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <div className="mb-1 text-sm font-semibold">Presse-papier rapide</div>
        <div className="mb-3 text-xs text-white/50">
          Colle du texte/code ou dépose des fichiers (glisser-déposer accepté) pour les récupérer sur un autre appareil connecté au même compte.
          Supprimés automatiquement au bout de 5 minutes, ou de 24 heures si tu le choisis.
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

        {files.length > 0 && (
          <ul className="mt-2 grid gap-1.5">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
                <span className="truncate text-white/70">{f.name} · {fmtSize(f.size)}</span>
                <button type="button" className="text-white/40 hover:text-white/70" aria-label={`Retirer ${f.name}`} onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn btn-secondary inline-flex cursor-pointer items-center gap-1.5 text-xs">
              <Paperclip size={14} /> Joindre des fichiers
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
            </label>
            <div className="inline-flex items-center gap-1 rounded-[10px] bg-surface-2 p-1 text-xs" role="radiogroup" aria-label="Durée de conservation">
              {DUREES.map((d) => (
                <button
                  key={d.cle}
                  type="button"
                  role="radio"
                  aria-checked={duree === d.cle}
                  className={"rounded-[7px] px-2.5 py-1 font-semibold transition-colors " + (duree === d.cle ? "bg-surface text-white shadow-[var(--shadow-1)]" : "text-muted hover:text-white")}
                  onClick={() => setDuree(d.cle)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="hidden text-xs text-white/30 sm:block">Ctrl/Cmd + Entrée pour envoyer</div>
          </div>
          <button
            type="button"
            className="btn btn-primary inline-flex items-center gap-1.5"
            disabled={(!text.trim() && files.length === 0) || sending}
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
            const courte = new Date(n.expires_at).getTime() - new Date(n.created_at).getTime() < JOUR_MS - 60_000;
            return (
              <div key={n.id} className="card p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Clock size={12} /> expire dans {fmtLeft(left)}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {courte && (
                      <button type="button" className="btn btn-secondary inline-flex items-center gap-1.5 py-1 text-xs" onClick={() => garderJour(n)}>
                        <Hourglass size={13} /> Garder 24 h
                      </button>
                    )}
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
                      aria-label="Supprimer"
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
