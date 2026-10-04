"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import {
  CLE_OBJECTIF,
  OBJECTIF_CHOIX,
  OBJECTIF_MAX,
  OBJECTIF_MIN,
  OBJECTIF_RECOMMANDE,
  RYTHME_LIMITE,
  estJour,
  joursEntre,
  planDuJour,
  type ObjectifInitial,
  type ObjectifMeta,
} from "@/lib/objectif-calc";
import { OBJECTIF } from "@/lib/voice-objectif";
import { jourJ, nombre } from "@/lib/voice";

// Le réglage « Ton examen » (Moi › Réglages) : la date d'examen et l'objectif
// de questions à avoir posées ce jour-là, avec le rythme qui en découle,
// calculé pendant la saisie (déjà posées, reste, par jour). La date va dans
// profiles.exam_date ; l'objectif dans les métadonnées du compte
// (rl_objectif : { total, depuis }), sans migration. Un nouvel objectif, ou
// une nouvelle date, fait repartir la droite d'aujourd'hui.

export function ObjectifExamenSettings({ initial }: { initial: ObjectifInitial }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [date, setDate] = useState(initial.examen ?? "");
  const [total, setTotal] = useState<string>(initial.meta ? String(initial.meta.total) : "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const n = Math.round(Number(total.replace(/[^0-9]/g, "")));
  const totalOk = total.trim() !== "" && Number.isFinite(n) && n >= OBJECTIF_MIN && n <= OBJECTIF_MAX;
  const jours = estJour(date) ? joursEntre(initial.aujourdhui, date) : null;
  const plan = totalOk && estJour(date) ? planDuJour({ total: n, examen: date, aujourdhui: initial.aujourdhui, avant: initial.avant }) : null;
  const deja = initial.avant + initial.jour;
  const jj = jours !== null ? jourJ(jours) : null;

  async function enregistrer(retirer = false) {
    setBusy(true);
    setMsg(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Non connecté");
      if ((date || null) !== (initial.examen || null)) {
        const { error } = await supabase
          .from("profiles")
          .update({ exam_date: date || null })
          .eq("id", auth.user.id);
        if (error) throw new Error(error.message);
      }
      const garder = !retirer && totalOk;
      const meme = garder && initial.meta && initial.meta.total === n && (date || null) === (initial.examen || null);
      const meta: ObjectifMeta | null = garder ? (meme && initial.meta ? initial.meta : { total: n, depuis: initial.aujourdhui }) : null;
      if (!meme && (meta || initial.meta)) {
        const { error } = await supabase.auth.updateUser({ data: { [CLE_OBJECTIF]: meta } });
        if (error) throw new Error(error.message);
      }
      if (retirer) setTotal("");
      setMsg(OBJECTIF.reglage.enregistre);
      // la barre du haut, l'accueil et la courbe relisent l'objectif
      router.refresh();
    } catch (e: unknown) {
      setMsg(friendlyError(e, "Erreur"));
    } finally {
      setBusy(false);
    }
  }

  const R = OBJECTIF.reglage;
  return (
    <div className="card flex flex-col gap-5 p-[22px]">
      <div>
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          <GraduationCap size={15} aria-hidden />
          {R.titre}
          {jj && <span className="ml-auto rounded-[8px] border border-line-2 px-2 py-[2px] font-mono text-[12px] text-white">{jj}</span>}
          {jours !== null && jours < 0 && <span className="ml-auto rounded-[8px] border border-line-2 px-2 py-[2px] font-mono text-[12px] text-white">passée</span>}
        </h3>
        <p className="mt-2 text-[13px] text-muted">{R.texte}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="rl-exam-date" className="text-[13px] font-semibold">
          {R.date}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input id="rl-exam-date" className="input w-auto" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={busy} />
          {date && (
            <button className="btn btn-ghost text-[13px]" onClick={() => setDate("")} type="button" disabled={busy}>
              Effacer
            </button>
          )}
        </div>
      </div>

      <div id="objectif" className="flex scroll-mt-24 flex-col gap-1.5">
        <label htmlFor="rl-objectif-total" className="text-[13px] font-semibold">
          {R.total}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="rl-objectif-total"
            className="input w-[120px] font-mono tabular-nums"
            type="text"
            inputMode="numeric"
            placeholder={String(OBJECTIF_RECOMMANDE)}
            value={total}
            onChange={(e) => setTotal(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
            disabled={busy}
          />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choix rapides">
            {OBJECTIF_CHOIX.map((c) => (
              <button key={c} type="button" className={"chip chip-sm " + (n === c && totalOk ? "chip-active" : "")} onClick={() => setTotal(String(c))} disabled={busy}>
                <span className="font-mono tabular-nums">{nombre(c)}</span>
                {c === OBJECTIF_RECOMMANDE && <span className="ml-1 text-[11px] opacity-70">{R.recommande}</span>}
              </button>
            ))}
          </div>
        </div>
        {/* le rythme qui en découle, pendant la saisie */}
        <p className="t-small m-0 mt-1" aria-live="polite">
          {totalOk
            ? R.apercu(deja, Math.max(0, n - deja), jours, plan?.quotidien ?? 0)
            : total.trim() === ""
              ? initial.meta
                ? R.sansObjectif
                : `${R.sansObjectif} On en recommande ${nombre(OBJECTIF_RECOMMANDE)} d'ici l'examen.`
              : `Entre ${nombre(OBJECTIF_MIN)} et ${nombre(OBJECTIF_MAX)}.`}
        </p>
        {plan?.statut === "actif" && plan.quotidien > RYTHME_LIMITE && <p className="t-small m-0 font-semibold text-pen">{OBJECTIF.limite}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" onClick={() => enregistrer(false)} disabled={busy || (total.trim() !== "" && !totalOk)} type="button">
          {busy ? "…" : R.enregistrer}
        </button>
        {initial.meta && (
          <button className="btn btn-ghost text-[13px]" onClick={() => enregistrer(true)} disabled={busy} type="button">
            {R.retirer}
          </button>
        )}
        {msg && (
          <span role="status" className="text-[13px] font-medium">
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
