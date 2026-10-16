"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { devoileLite } from "@/lib/codex/devoile-lite";
import type { LigneQuete, VueActe, VueCodex, VueContrat } from "@/lib/codex/vue";
import { CODEX } from "@/lib/voice-codex";
import { codexChangerContrat, codexOuvrirProgramme, codexReclamer, codexToutMontrer } from "@/lib/codex/actions";
import { Sceau } from "@/components/codex/Sceau";
import { JaugePinceau } from "@/components/codex/JaugePinceau";
import { DetailQuete } from "@/components/codex/DetailQuete";
import { ArbreCodex, Chemin, CheminCodex, Colonne, TeteChemin, etiquetteActe } from "@/components/codex/CarteCodex";
import { Feuille } from "@/components/ui/Feuille";
import { annoncerDevoile } from "@/components/codex/annoncer";
import e from "./Encre.module.css";
import c from "./CodexEcran.module.css";

// L'écran du Codex (/codex) : l'arbre complet. Un en-tête court (le titre, la
// phase et le J-n, la prochaine quête en une ligne), puis la carte : l'arbre
// qu'on parcourt sur ordinateur, un chemin par acte ou par branche sur
// téléphone (components/codex/CarteCodex). Le quotidien (les quatre quêtes du
// moment) est derrière le sceau « ! » de la barre du haut. Un clic sur un
// sceau ouvre son détail ; sur un acte, la feuille de l'acte. Les familles pas
// encore dévoilées (nouveau compte) restent des pages blanches.
// `demo` : aperçus (aucune action serveur).

type Props = { vue: VueCodex; demo?: boolean };

const nomMatiere = (vue: VueCodex, key?: string) => (key ? vue.branches.find((b) => b.contenu.key === key)?.contenu.nom : undefined);

export function CodexEcran({ vue: depart, demo = false }: Props) {
  const [vue, setVue] = useState(depart);
  const [ouverte, setOuverte] = useState<LigneQuete | null>(null);
  const [acte, setActe] = useState<VueActe | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, demarrer] = useTransition();
  const ouvrir = useCallback((l: LigneQuete) => setOuverte(l), []);
  const ouvrirActe = useCallback((a: VueActe) => setActe(a), []);
  const fermer = useCallback(() => setOuverte(null), []);

  const d = vue.devoile?.devoile ?? "tout";
  const montre = useCallback((quoi: string) => devoileLite(d, quoi), [d]);

  const toutMontrer = () =>
    demarrer(async () => {
      if (!demo) {
        const r = await codexToutMontrer();
        if (!r.ok) return setMessage("Impossible de tout montrer pour l'instant.");
        annoncerDevoile("tout");
      }
      setVue((v) => ({ ...v, devoile: v.devoile ? { ...v.devoile, devoile: "tout" } : v.devoile }));
    });

  const changer = (ct: VueContrat) =>
    demarrer(async () => {
      setMessage(null);
      if (demo) return;
      const r = await codexChangerContrat(ct.emplacement);
      if (r.ok) setVue(r.vue);
      else setMessage(r.raison === "refus" ? CODEX.contrats.changeDeja : "Pas d'autre contrat à te proposer pour l'instant.");
    });

  const ouvrirSuite = (programme: string) =>
    demarrer(async () => {
      setMessage(null);
      if (demo) return;
      const r = await codexOuvrirProgramme(programme);
      if (r.ok) setVue(r.vue);
      else setMessage("Impossible d'ouvrir ce programme pour l'instant. Réessaie dans un instant.");
    });

  const reclamer = async (l: LigneQuete): Promise<string | null> => {
    if (demo) return CODEX.detail.reclame;
    const r = await codexReclamer(l.id, l.periode);
    return r.ok ? CODEX.detail.reclame : "La récompense n'a pas pu être versée. Réessaie dans un instant.";
  };

  const p = vue.prochaine;
  const pDest = p?.ligne.destination;
  const pLien = pDest?.href ?? p?.ligne.lien;
  const pDuree = pDest?.duree ?? p?.ligne.duree;
  const jourJ = vue.joursAvant !== null ? CODEX.jourJ(vue.joursAvant) : null;

  return (
    <div className={`rl-wide rl-page ${e.carnet} ${c.page}`}>
      <header className={`${c.tete} rl-in`}>
        <div className="min-w-0">
          <p className="t-eyebrow m-0">
            {CODEX.kicker(vue.phaseNom)}
            {jourJ ? ` · ${jourJ}` : ""}
          </p>
          <h1 className={`${c.titre} font-brand`}>{CODEX.titre}</h1>
          <p className={c.stats}>
            <b>{vue.stats.faites}</b>/{vue.stats.total} quêtes · <b>{vue.stats.xpCodex.toLocaleString("fr-FR")}</b> XP gagnés ici
            {d !== "tout" && (
              <>
                {" · "}
                <button type="button" className={e.lienDiscret} onClick={toutMontrer} disabled={occupe} title={CODEX.toutMontrerAide}>
                  {CODEX.toutMontrer}
                </button>
              </>
            )}
          </p>
        </div>
        <div className={c.prochaine} data-leonard="prochaine">
          {p ? (
            <>
              <button type="button" className={c.prochaineSceau} onClick={() => ouvrir(p.ligne)} aria-label={`Le détail : ${p.ligne.titre}`}>
                <Sceau l={p.ligne} taille={52} signe="!" />
              </button>
              <div className="min-w-0 flex-1">
                <p className={c.prochaineSur}>
                  {CODEX.prochaine.eyebrow}
                  {pDuree ? ` · ${CODEX.prochaine.minutes(pDuree)}` : ""}
                </p>
                <p className={c.prochaineTitre}>{p.ligne.titre}</p>
                {pDest?.raison && <p className="t-small m-0 mt-0.5">{pDest.raison}</p>}
                {p.ligne.cible > 1 && <JaugePinceau fraction={p.ligne.fraction} or={p.ligne.etat === "active"} className={c.prochaineJauge} label={`${Math.floor(p.ligne.valeur)} sur ${Math.floor(p.ligne.cible)}`} />}
              </div>
              {pLien ? (
                <Link href={pLien} className="btn btn-primary rl-press shrink-0">
                  {CODEX.detail.aller} <ArrowRight size={16} aria-hidden />
                </Link>
              ) : (
                <button type="button" className="btn btn-primary rl-press shrink-0" onClick={() => ouvrir(p.ligne)}>
                  {CODEX.detail.aller} <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </>
          ) : (
            <p className={e.replique}>{CODEX.prochaine.rien}</p>
          )}
        </div>
      </header>

      {vue.suite && (
        <section className="card-quiet flex flex-wrap items-center gap-3 p-3" aria-label="La route de Milan">
          <p className="t-small m-0 min-w-0 flex-1">{vue.suite.annonce}</p>
          {vue.suite.ouvrable && (
            <button type="button" className="btn btn-primary rl-press shrink-0" onClick={() => ouvrirSuite(vue.suite!.programme)} disabled={occupe}>
              Ouvrir {vue.suite.court} <ArrowRight size={16} aria-hidden />
            </button>
          )}
        </section>
      )}

      {message && (
        <p role="status" className="card-quiet t-small p-3">
          {message}
        </p>
      )}

      <div className={c.surOrdi} data-leonard="trame">
        <ArbreCodex vue={vue} montre={montre} onQuete={ouvrir} onActe={ouvrirActe} colonne={<Colonne vue={vue} montre={montre} onQuete={ouvrir} onChanger={changer} occupe={occupe} />} />
      </div>
      <div className={c.surTel}>
        <CheminCodex vue={vue} montre={montre} onQuete={ouvrir} />
      </div>

      <Feuille ouvert={!!acte} onFermer={() => setActe(null)} titre={acte ? etiquetteActe(acte.acte) : "Acte"}>
        {acte && (
          <div className={e.carnet}>
            <TeteChemin sur={`${acte.clos ? CODEX.trame.clos : acte.courant ? CODEX.trame.enCours : CODEX.trame.aVenir} · ${acte.faites}/${acte.total}`} titre={acte.acte.titre} replique={acte.replique.texte} />
            <p className="t-small m-0 mt-1 text-center italic">{acte.acte.sousTitre}</p>
            <Chemin
              quetes={acte.quetes}
              ici={p?.ligne.id}
              nom={(l) => l.titre}
              onQuete={(l) => {
                setActe(null);
                setOuverte(l);
              }}
            />
          </div>
        )}
      </Feuille>

      {ouverte && <DetailQuete l={ouverte} nomMatiere={nomMatiere(vue, ouverte.matiere)} prochaine={!!p && ouverte.id === p.ligne.id && ouverte.periode === p.ligne.periode} onClose={fermer} reclamer={reclamer} />}
    </div>
  );
}
