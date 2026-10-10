"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/browser";
import { reglerJournal } from "@/lib/profil/actions-sceaux";
import type { Visibilite } from "@/lib/profil/catalogue";
import { REGLAGE_JOURNAL } from "@/lib/voice-profil";

// Réglage « Qui voit mon Journal » (Moi › Réglages › Confidentialité) :
// tous, mes amis, moi seul (profile_style.journal_visibility, écrit par le
// serveur : reglerJournal). Le profil le respecte côté serveur : un Journal
// fermé n'est pas lu. Sans la migration : choix grisé, « bientôt ».

type Etat = "chargement" | "pret" | "indisponible" | "erreur";

/** La colonne ou la table manque : migration_profil_sceaux.sql pas collée. */
const absente = (e: { code?: string; message?: string }) =>
  ["PGRST204", "PGRST205", "42703", "42P01"].includes(e.code ?? "") || /could not find|does not exist/i.test(e.message ?? "");

export function ReglageJournal() {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [valeur, setValeur] = useState<Visibilite>("public");
  const [echec, setEchec] = useState(false);
  const [envoi, demarrer] = useTransition();

  const charger = useCallback(async () => {
    setEtat("chargement");
    try {
      const sb = createClient();
      const { data: auth } = await sb.auth.getUser();
      const moi = auth.user?.id;
      if (!moi) return setEtat("erreur");
      const { data, error } = await sb.from("profile_style").select("journal_visibility").eq("user_id", moi).maybeSingle();
      if (error) return setEtat(absente(error) ? "indisponible" : "erreur");
      const v = (data as { journal_visibility?: string } | null)?.journal_visibility;
      setValeur(v === "friends" || v === "private" ? v : "public");
      setEtat("pret");
    } catch {
      setEtat("erreur");
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const choisir = (v: Visibilite) => {
    if (etat !== "pret" || v === valeur) return;
    const avant = valeur;
    setValeur(v);
    setEchec(false);
    demarrer(async () => {
      const r = await reglerJournal(v);
      if (r.ok) return;
      setValeur(avant);
      if (r.raison === "indisponible") setEtat("indisponible");
      else setEchec(true);
    });
  };

  const off = etat !== "pret";
  const items = REGLAGE_JOURNAL.choix;
  const ix = Math.max(0, items.findIndex((i) => i.key === valeur));
  return (
    <div className="flex flex-col gap-2.5 border-t border-line py-3">
      <span className="text-[14px] font-semibold">{REGLAGE_JOURNAL.titre}</span>
      <div role="radiogroup" aria-label={REGLAGE_JOURNAL.titre} className={"seg w-full " + (off ? "opacity-45" : "")} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + ${ix} * (100% - 8px) / ${items.length})`, width: `calc((100% - 8px) / ${items.length})` }} />
        {items.map((i) => (
          <button
            key={i.key}
            type="button"
            role="radio"
            aria-checked={valeur === i.key}
            disabled={off || envoi}
            className="seg-item min-h-[44px]"
            onClick={() => choisir(i.key)}
          >
            {i.label}
          </button>
        ))}
      </div>
      {etat === "erreur" ? (
        // toute la ligne relance la lecture (44 px à toucher), comme la présence
        <button type="button" className="t-micro -my-2.5 min-h-[44px] w-full text-left" onClick={() => void charger()}>
          {REGLAGE_JOURNAL.erreur}
        </button>
      ) : (
        <span className="t-micro" role={echec ? "alert" : undefined}>
          {etat === "indisponible" ? REGLAGE_JOURNAL.bientot : echec ? REGLAGE_JOURNAL.echec : items[ix].aide}
        </span>
      )}
    </div>
  );
}
