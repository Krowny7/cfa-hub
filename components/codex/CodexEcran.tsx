"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { devoileLite } from "@/lib/codex/devoile-lite";
import type { LigneQuete, VueActe, VueCodex, VueContrat } from "@/lib/codex/vue";
import { CODEX } from "@/lib/voice-codex";
import { codexChangerContrat, codexOuvrirProgramme, codexReclamer, codexToutMontrer } from "@/lib/codex/actions";
import { Sceau } from "@/components/codex/Sceau";
import { Cap } from "@/components/codex/Cap";
import { JaugePinceau } from "@/components/codex/JaugePinceau";
import { DetailQuete } from "@/components/codex/DetailQuete";
import { SeanceDuJour } from "@/components/codex/SeanceDuJour";
import { Veillee } from "@/components/codex/Veillee";
import { Malle } from "@/components/codex/Malle";
import { BonneChance } from "@/components/codex/BonneChance";
import { PoseLePinceau } from "@/components/codex/PoseLePinceau";
import { FilRouge } from "@/components/codex/FilRouge";
import { Plan } from "@/components/codex/Plan";
import { Lundi } from "@/components/codex/Lundi";
import { Verdict } from "@/components/codex/Verdict";
import { QUETE_VEILLE } from "@/lib/codex/calendrier";
import { enteteSeance, gainsSeance } from "@/lib/codex/seance-etat";
import { ArbreCodex, Chemin, CheminCodex, Colonne, TeteChemin, etiquetteActe } from "@/components/codex/CarteCodex";
import { Feuille } from "@/components/ui/Feuille";
import { annoncerDevoile } from "@/components/codex/annoncer";
import e from "./Encre.module.css";
import c from "./CodexEcran.module.css";

// L'écran du Codex (/codex) : l'arbre complet. En tête, la séance du jour
// (components/codex/SeanceDuJour, mode plein, V3 §6.4) ; puis un en-tête
// court (le cap : la préparation, la règle des matières et les trois fuites,
// V3 §4.6 ; la prochaine quête en une ligne), puis la carte : l'arbre
// qu'on parcourt sur ordinateur, un chemin par acte ou par branche sur
// téléphone (components/codex/CarteCodex). Le quotidien (les quatre quêtes du
// moment) est derrière le sceau « ! » de la barre du haut. Un clic sur un
// sceau ouvre son détail ; sur un acte, la feuille de l'acte. Les familles pas
// encore dévoilées (nouveau compte) restent des pages blanches.
// Le calendrier (V3 §7.1, `vue.moment`) change l'ordre : en veillée, les sept
// tampons, la séance, « On ne commence plus rien. » et la carte repliée ; la
// malle (J-3 à J-1) avant la séance ; le jour J, « Bonne chance. » seule ; le
// lendemain, « Pose le pinceau. » puis la carte, sans séance ; après, le fil
// rouge passe en tête.
// `demo` : aperçus (aucune action serveur).

type Props = { vue: VueCodex; demo?: boolean };

const nomMatiere = (vue: VueCodex, key?: string) => (key ? vue.branches.find((b) => b.contenu.key === key)?.contenu.nom : undefined);

export function CodexEcran({ vue: depart, demo = false }: Props) {
  const [vue, setVue] = useState(depart);
  const [ouverte, setOuverte] = useState<LigneQuete | null>(null);
  const [acte, setActe] = useState<VueActe | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // la carte repliée de la dernière semaine, « Voir le Codex » le jour J
  const [deplie, setDeplie] = useState(false);
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
  const seance = vue.seance?.blocs.length ? vue.seance : null;
  const gains = useMemo(() => (seance ? gainsSeance(seance.avant, vue) : []), [seance, vue]);
  const moment = vue.moment;
  const calme = moment === "veillee" || moment === "malle";
  const replie = calme && !deplie;
  // le lendemain, on a posé le pinceau : pas de séance
  const avecSeance = moment !== "lendemain" && moment !== "jourJ";
  const veille = moment === "malle" ? (vue.trame.flatMap((a) => a.quetes).find((l) => l.id === QUETE_VEILLE) ?? null) : null;

  // le jour J : une seule carte (V3 §7.4)
  if (moment === "jourJ" && !deplie) {
    return (
      <div className={`rl-wide rl-page ${e.carnet} ${c.page}`}>
        <BonneChance onVoir={() => setDeplie(true)} />
      </div>
    );
  }

  return (
    <div className={`rl-wide rl-page ${e.carnet} ${c.page}`}>
      {/* le titre en petit : la séance du jour, puis le cap (préparation, fuites), tiennent la tête de page */}
      <h1 className="t-micro m-0">
        {CODEX.titre} · {vue.phaseNom}
        {!vue.cap && jourJ ? ` · ${jourJ}` : ""}
      </h1>
      {moment === "veillee" && vue.tampons && <Veillee tampons={vue.tampons} />}
      {moment === "malle" && vue.malle && <Malle coches={vue.malle.coches} veille={veille} demo={demo} onVue={setVue} />}
      {moment === "lendemain" && vue.recap && <PoseLePinceau recap={vue.recap} />}
      {/* la phase est déjà dans le titre : l'en-tête de la séance ne garde que J-n */}
      {avecSeance && seance && <SeanceDuJour seance={seance} entete={enteteSeance(vue.joursAvant, "")} gains={gains} mode="plein" demo={demo} />}
      {moment === "veillee" && <p className={e.replique}>On ne commence plus rien.</p>}
      {/* le rythme long (V3 §10.3, §10.5) : le choix du lundi ; après l'examen, le verdict */}
      {vue.rythme?.lundi && <Lundi lundi={vue.rythme.lundi} demo={demo} onVue={setVue} />}
      {vue.rythme?.verdict && <Verdict verdict={vue.rythme.verdict} demo={demo} onVue={setVue} />}
      {/* après l'examen, le fil rouge continue : il passe en tête (V3 §7.1) */}
      {moment === "apres" && montre("codex:longcours") && <FilRouge fil={vue.filRouge} onQuete={ouvrir} />}

      {message && (
        <p role="status" className="card-quiet t-small p-3">
          {message}
        </p>
      )}

      {replie ? (
        <p className="m-0">
          <button type="button" className="btn rl-press" onClick={() => setDeplie(true)}>
            Voir la carte
          </button>
        </p>
      ) : (
        <>
          <header className={`${c.tete} rl-in`}>
            <div className="min-w-0">
              {vue.rythme?.plan && <Plan plan={vue.rythme.plan} jour={vue.jour} />}
              {vue.cap && <Cap cap={vue.cap} />}
              {d !== "tout" && (
                <p className={c.stats}>
                  <button type="button" className={e.lienDiscret} onClick={toutMontrer} disabled={occupe} title={CODEX.toutMontrerAide}>
                    {CODEX.toutMontrer}
                  </button>
                </p>
              )}
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

          <div className={c.surOrdi} data-leonard="trame">
            <ArbreCodex vue={vue} montre={montre} onQuete={ouvrir} onActe={ouvrirActe} colonne={<Colonne vue={vue} montre={montre} onQuete={ouvrir} onChanger={changer} occupe={occupe} filRouge={moment !== "apres"} />} />
          </div>
          <div className={c.surTel}>
            <CheminCodex vue={vue} montre={montre} onQuete={ouvrir} />
          </div>
        </>
      )}

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
