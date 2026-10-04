"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { GifBanque, PageGifs } from "@/lib/profil/gifs";

// La banque de GIF, comme dans une messagerie : une fenêtre (dialog natif :
// Échap ferme, le focus y reste), les tendances à l'ouverture, une
// recherche (déclenchée après une courte pause de frappe), quelques
// suggestions en un clic, « Plus de GIF » pour la page suivante. Un clic
// sur un GIF le choisit. Les résultats passent par /api/gifs (KLIPY, la clé
// reste sur le serveur). Attribution KLIPY en pied, comme demandé.

const SUGGESTIONS = ["Bravo", "Victoire", "Examen", "Révisions", "Café", "Motivation", "Fatigué", "Calcul", "Finance", "On y va"];

export function BanqueGifs({ ouvert, onFermer, onChoisir }: { ouvert: boolean; onFermer: () => void; onChoisir: (g: GifBanque) => void }) {
  const dialog = useRef<HTMLDialogElement | null>(null);
  const champ = useRef<HTMLInputElement | null>(null);
  const [q, setQ] = useState("");
  const [gifs, setGifs] = useState<GifBanque[]>([]);
  const [page, setPage] = useState(1);
  const [suite, setSuite] = useState(false);
  const [etat, setEtat] = useState<{ charge: boolean; erreur: string | null }>({ charge: false, erreur: null });

  // ouvrir et fermer la fenêtre
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (ouvert && !d.open) {
      d.showModal();
      champ.current?.focus();
    } else if (!ouvert && d.open) d.close();
  }, [ouvert]);

  async function charger(texte: string, p: number) {
    setEtat({ charge: true, erreur: null });
    try {
      const r = await fetch(`/api/gifs?${new URLSearchParams({ q: texte, page: String(p) })}`);
      const j = (await r.json()) as PageGifs & { erreur?: string };
      if (!r.ok) throw new Error(j.erreur || "La banque de GIF ne répond pas.");
      setGifs((avant) => (p === 1 ? j.gifs : [...avant, ...j.gifs.filter((g) => !avant.some((a) => a.id === g.id))]));
      setSuite(j.suite);
      setPage(p);
      setEtat({ charge: false, erreur: null });
    } catch (e) {
      setEtat({ charge: false, erreur: e instanceof Error ? e.message : "La banque de GIF ne répond pas." });
    }
  }

  // les tendances à l'ouverture, puis la recherche après une pause de frappe
  useEffect(() => {
    if (!ouvert) return;
    const t = setTimeout(() => charger(q.trim(), 1), q ? 380 : 0);
    return () => clearTimeout(t);
  }, [q, ouvert]);

  return (
    <dialog
      ref={dialog}
      onClose={onFermer}
      onClick={(e) => {
        if (e.target === dialog.current) onFermer(); // clic hors de la fenêtre
      }}
      aria-label="Choisir un GIF"
      className="m-auto h-[min(720px,calc(100dvh-24px))] w-[min(760px,calc(100vw-24px))] max-w-none overflow-hidden rounded-[22px] border border-line-2 bg-[var(--surface)] p-0 text-white shadow-[var(--shadow-3)] backdrop:bg-[rgba(12,12,14,.5)] backdrop:backdrop-blur-[2px]"
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-line-2 bg-[var(--field)] px-3">
              <Search size={16} aria-hidden className="shrink-0 text-muted" />
              <span className="sr-only">Chercher un GIF</span>
              <input ref={champ} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher sur KLIPY" className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none" maxLength={60} />
            </label>
            <button type="button" className="btn btn-ghost btn-sm !h-11 !w-11 !p-0" onClick={onFermer} aria-label="Fermer">
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setQ(s)} className={"shrink-0 rounded-full border px-3 py-1 text-[12.5px] font-semibold " + (q === s ? "border-white" : "border-line-2 hover:border-white")}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <p className="t-eyebrow m-0 mb-2.5">{q.trim() ? `« ${q.trim()} »` : "Tendances"}</p>
          {etat.erreur && gifs.length === 0 ? (
            <p className="t-small m-0 py-10 text-center">{etat.erreur}</p>
          ) : gifs.length === 0 && !etat.charge ? (
            <p className="t-small m-0 py-10 text-center">Aucun GIF pour cette recherche.</p>
          ) : (
            <div className="columns-2 gap-2 sm:columns-3 lg:columns-4">
              {gifs.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onChoisir(g)}
                  className="mb-2 block w-full overflow-hidden rounded-[12px] bg-[var(--well)] outline-offset-2 transition-transform [break-inside:avoid] hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ink)]"
                  title={g.titre}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- aperçu servi par KLIPY */}
                  <img src={g.apercu.url} alt={g.titre} width={g.apercu.w} height={g.apercu.h} loading="lazy" decoding="async" className="block h-auto w-full" />
                </button>
              ))}
            </div>
          )}
          {etat.charge && <p className="t-small m-0 py-4 text-center">Chargement…</p>}
          {!etat.charge && suite && gifs.length > 0 && (
            <div className="flex justify-center pt-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => charger(q.trim(), page + 1)}>
                Plus de GIF
              </button>
            </div>
          )}
          {etat.erreur && gifs.length > 0 && <p className="t-small m-0 py-3 text-center text-pen">{etat.erreur}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
          <span className="t-micro">Touche un GIF pour l&apos;ajouter à ta page.</span>
          <span className="text-[11px] font-bold uppercase tracking-[.08em] text-muted">Powered by KLIPY</span>
        </div>
      </div>
    </dialog>
  );
}
