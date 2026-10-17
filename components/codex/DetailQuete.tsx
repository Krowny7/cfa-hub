"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import type { LigneQuete } from "@/lib/codex/vue";
import { CODEX, choisirReplique } from "@/lib/voice-codex";
import { Sceau } from "@/components/codex/Sceau";
import { JaugePinceau } from "@/components/codex/JaugePinceau";
import e from "./Encre.module.css";
import s from "./Codex.module.css";

// Le détail d'une quête : une feuille qui monte du bas (téléphone) ou une
// fiche au centre (ordinateur). L'objectif, la progression, la récompense, ce
// que Léonard en pense, et « Y aller » (sa destination, lib/codex/destinations.ts)
// avec sa durée et sa raison chiffrée. Échap ou un clic à côté referme.
// `prochaine` : c'est ta prochaine quête. `reclamer` : le geste explicite pour
// une récompense qui n'aurait pas été versée (le moteur les verse déjà tout
// seul ; ceci est le filet).

const jourLong = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

export function DetailQuete({
  l,
  nomMatiere,
  prochaine = false,
  onClose,
  reclamer,
}: {
  l: LigneQuete;
  nomMatiere?: string;
  prochaine?: boolean;
  onClose: () => void;
  reclamer?: (l: LigneQuete) => Promise<string | null>;
}) {
  const fermer = useRef<HTMLButtonElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    fermer.current?.focus();
    const touche = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", touche);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", touche);
      document.body.style.overflow = overflow;
      avant?.focus?.();
    };
  }, [onClose]);

  const enigme = l.affichage === "indice" && l.etat !== "terminee";
  const verrouille = l.affichage === "verrouille";
  const titre = enigme ? "Exploit caché" : l.titre;
  const aReclamer = l.etat === "terminee" && l.xpVersee === null && !l.retro && !!reclamer;
  const recompense = [
    l.xp > 0 ? (l.etat === "terminee" && l.xpVersee !== null && l.xpVersee < l.xp ? CODEX.detail.xpPlafonnee(l.xpVersee) : CODEX.detail.xp(l.xp)) : null,
    l.titreGagne ? CODEX.detail.titreGagne(l.titreNom ?? l.titreGagne) : null,
    l.cosmetique ? CODEX.detail.cosmetique(l.cosmetiqueNom ?? l.cosmetique) : null,
  ].filter(Boolean) as string[];
  const showProgress = !enigme && l.etat !== "terminee" && l.cible > 1;
  const lien = l.destination?.href ?? l.lien;
  const duree = l.destination?.duree ?? l.duree;
  const raison = l.destination?.raison ?? null;

  return (
    <div className={s.voile} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="codex-detail-titre" className={`${s.feuille} ${e.carnet}`}>
        <button ref={fermer} type="button" className={s.fermer} onClick={onClose} aria-label={CODEX.detail.fermer}>
          <X size={20} aria-hidden />
        </button>

        <div className="flex items-start gap-4 pr-10">
          <Sceau l={l} taille={64} />
          <div className="min-w-0">
            <p className="t-eyebrow m-0">
              {prochaine && !enigme ? `${CODEX.prochaine.eyebrow} · ` : ""}
              {CODEX.famille[l.famille]}
              {nomMatiere ? ` · ${nomMatiere}` : ""} · {enigme ? CODEX.exploits.enigme : CODEX.etat[l.etat]}
            </p>
            <h2 id="codex-detail-titre" className="t-h2 m-0 mt-1 [overflow-wrap:anywhere]">
              {titre}
            </h2>
          </div>
        </div>

        {enigme ? (
          <div className={s.detailBloc}>
            <h3>{CODEX.exploits.enigme}</h3>
            <p>{l.indice}</p>
          </div>
        ) : (
          <>
            <div className={s.detailBloc}>
              <h3>{CODEX.detail.objectif}</h3>
              <p>{l.consigne}</p>
              {showProgress && (
                <>
                  <JaugePinceau fraction={l.fraction} or={l.etat === "active"} label={`Progression : ${Math.floor(l.valeur)} sur ${Math.floor(l.cible)}`} className="mt-2 max-w-[320px]" />
                  <p className="t-micro mt-1.5 font-mono tabular-nums">
                    {Math.floor(l.valeur).toLocaleString("fr-FR")} / {Math.floor(l.cible).toLocaleString("fr-FR")}
                  </p>
                </>
              )}
            </div>
            {(raison || l.pourquoi) && (
              <div className={s.detailBloc}>
                <h3>{CODEX.detail.pourquoi}</h3>
                {raison && <p>{raison}</p>}
                {l.pourquoi && l.pourquoi !== raison && <p>{l.pourquoi}</p>}
              </div>
            )}
          </>
        )}

        {recompense.length > 0 && (
          <div className={s.detailBloc}>
            <h3>{CODEX.detail.recompense}</h3>
            <ul className="m-0 list-none p-0">
              {recompense.map((r) => (
                <li key={r} className="text-[14.5px] leading-6">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {l.etat === "terminee" && l.termineeLe && (
          <p className="t-micro mt-3">{l.retro ? CODEX.detail.faiteAvant(jourLong(l.termineeLe)) : CODEX.detail.faiteLe(jourLong(l.termineeLe))}</p>
        )}
        {l.optionnelle && <p className="t-micro mt-1">{CODEX.detail.optionnelle}</p>}
        {l.compteeAvec && <p className="t-micro mt-1">{CODEX.detail.compteeAvec(l.compteeAvec.titre)}</p>}
        {duree && l.etat !== "terminee" && !enigme && <p className="t-micro mt-1">{CODEX.detail.duree(duree)}</p>}

        <p className={s.leonardLigne}>{enigme ? "Je ne dirai rien. Enfin, presque rien : relis l'énigme." : verrouille ? choisirReplique("verrouillee", l.id) : choisirReplique(l.etat, l.id)}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          {lien && l.etat !== "terminee" && !verrouille && !enigme && (
            <Link href={lien} className="btn btn-primary btn-lg rl-press w-full sm:w-auto" onClick={onClose}>
              {CODEX.detail.aller} <ArrowRight size={17} aria-hidden />
            </Link>
          )}
          {aReclamer && (
            <button
              type="button"
              className="btn btn-primary btn-lg rl-press w-full sm:w-auto"
              disabled={occupe}
              onClick={async () => {
                setOccupe(true);
                setMessage(await reclamer!(l));
                setOccupe(false);
              }}
            >
              {CODEX.detail.reclamer}
            </button>
          )}
        </div>
        {message && (
          <p role="status" className="t-small mt-3">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
