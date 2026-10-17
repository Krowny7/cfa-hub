"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { devoileLite } from "@/lib/codex/devoile-lite";
import type { LigneQuete, VueActe, VueCodex, VueContrat } from "@/lib/codex/vue";
import { CODEX } from "@/lib/voice-codex";
import { codexChangerContrat, codexOuvrirProgramme, codexToutMontrer } from "@/lib/codex/actions";
import { TEXTES_TOUT, aRecupererDe, avanceeActe, plusDetail, retrouver } from "@/lib/codex/tout";
import { DetailQuete } from "@/components/codex/DetailQuete";
import { Aujourdhui } from "@/components/codex/Aujourdhui";
import { ToutLeCodex } from "@/components/codex/ToutLeCodex";
import { Veillee } from "@/components/codex/Veillee";
import { Malle } from "@/components/codex/Malle";
import { BonneChance } from "@/components/codex/BonneChance";
import { PoseLePinceau } from "@/components/codex/PoseLePinceau";
import { FilRouge } from "@/components/codex/FilRouge";
import { Verdict } from "@/components/codex/Verdict";
import { QUETE_VEILLE, pinceauPose } from "@/lib/codex/calendrier";
import { ArbreCodex, Chemin, CodexTel, SegmentsTel, TeteChemin, etiquetteActe } from "@/components/codex/CarteCodex";
import { quetesDeLaCarte, segmentDe, type VueSegment } from "@/lib/codex/carte";
import { Feuille } from "@/components/ui/Feuille";
import { annoncerDevoile } from "@/components/codex/annoncer";
import e from "./Encre.module.css";
import c from "./CodexEcran.module.css";
import j from "./Aujourdhui.module.css";

// L'écran du Codex (/codex), Codex simplifié (§3.3, §3.4) : le titre
// « Codex », puis deux segments, sur téléphone comme sur ordinateur, gardés
// dans l'URL (?vue=) :
//   Aujourd'hui    « À récupérer », le fil (la séance du jour en étapes, un
//                  seul bouton plein) et les replis d'une ligne (Quêtes du
//                  jour, Fait aujourd'hui, Préparation, l'acte, Ta semaine) :
//                  components/codex/Aujourdhui.tsx, deux colonnes sur ordinateur ;
//   Tout le Codex  quatre replis (Parcours, Matières, Objectifs longs,
//                  Exploits), « Ta semaine » et « Voir la carte » ;
//                  maître-détail sur ordinateur : components/codex/ToutLeCodex.tsx.
// « Voir la carte » (?vue=carte) : la carte sur toute la largeur (l'arbre sur
// ordinateur, les chemins sur téléphone), « ← Tout le Codex » pour revenir.
// Un ancien segment (?vue=parcours, matieres…) mène à « Tout le Codex ».
// Le calendrier (V3 §7.1, `vue.moment`) : en veillée, les sept tampons et
// « On ne commence plus rien. » ; la malle (J-3 à J-1) avant le fil ; le
// jour J, « Bonne chance. » seule ; le lendemain, « Pose le pinceau. », sans
// séance ; après l'examen, le fil rouge passe en tête de « Tout le Codex ».
// Un clic sur une quête ouvre son détail ; sur un acte, la feuille de l'acte.
// `quete` (?quete=…, « Chercher une quête » de la palette) : la carte
// s'ouvre et vient à elle ; son détail s'ouvre sur téléphone.
// `demo` : aperçus (aucune action serveur).

type Props = { vue: VueCodex; demo?: boolean; segment?: string; quete?: string };

const nomMatiere = (vue: VueCodex, key?: string) => (key ? vue.branches.find((b) => b.contenu.key === key)?.contenu.nom : undefined);

export function CodexEcran({ vue: depart, demo = false, segment: segmentUrl, quete }: Props) {
  const [vue, setVue] = useState(depart);
  const [ouverte, setOuverte] = useState<LigneQuete | null>(null);
  // la page rafraîchie (« Récupérer » l'a demandé) : la vue nouvelle du serveur remplace la locale,
  // et la quête ouverte se relit (elle n'attend plus « Récupérer »)
  useEffect(() => {
    setVue(depart);
    setOuverte((o) => (o ? (retrouver(depart, o) ?? o) : o));
  }, [depart]);
  const [acte, setActe] = useState<VueActe | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // « Voir le Codex » le jour J
  const [deplie, setDeplie] = useState(false);
  const [occupe, demarrer] = useTransition();
  // les prérequis de la dernière quête verrouillée ouverte restent allumés sur la carte (V3 §10.1)
  const [allumees, setAllumees] = useState<string[] | undefined>(undefined);
  const ouvrir = useCallback((l: LigneQuete) => {
    setOuverte(l);
    setAllumees(l.allume);
  }, []);
  const ouvrirActe = useCallback((a: VueActe) => setActe(a), []);
  const fermer = useCallback(() => setOuverte(null), []);
  // une quête cherchée (?quete=) se montre sur la carte
  const [segment, setSegment] = useState<VueSegment>(() => (quete ? "carte" : segmentDe(segmentUrl)));
  const choisirSegment = (s: VueSegment) => {
    setSegment(s);
    try {
      const u = new URL(window.location.href);
      if (s === "aujourdhui") u.searchParams.delete("vue");
      else u.searchParams.set("vue", s);
      window.history.replaceState(window.history.state, "", u);
    } catch {
      // l'URL reste telle quelle
    }
  };
  // la quête cherchée : sur téléphone, son détail s'ouvre (sur ordinateur, la carte vient à elle), une fois par quête demandée
  const queteVue = useRef<string | null>(null);
  useEffect(() => {
    if (!quete || quete === queteVue.current || !window.matchMedia("(max-width: 899px)").matches) return;
    queteVue.current = quete;
    const l = quetesDeLaCarte(depart).find((x) => x.id === quete);
    if (l) setOuverte(l);
  }, [quete, depart]);

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
      if (r.ok) {
        setVue(r.vue);
        setOuverte(null);
      } else setMessage(r.raison === "refus" ? CODEX.contrats.changeDeja : "Pas d'autre quête à te proposer pour l'instant.");
    });

  const ouvrirSuite = (programme: string) =>
    demarrer(async () => {
      setMessage(null);
      if (demo) return;
      const r = await codexOuvrirProgramme(programme);
      if (r.ok) setVue(r.vue);
      else setMessage("Impossible d'ouvrir ce programme pour l'instant. Réessaie dans un instant.");
    });

  // le détail d'une quête, en feuille (téléphone) ou en panneau (« Tout le Codex » sur ordinateur)
  const detail = (l: LigneQuete, forme: "feuille" | "panneau") => {
    const contrat = vue.contrats.find((ct) => ct.changeable && ct.ligne.id === l.id && ct.ligne.periode === l.periode && ct.ligne.etat !== "terminee");
    return (
      <DetailQuete
        key={forme + l.id + l.periode}
        l={l}
        forme={forme}
        sobre={vue.sobre}
        nomMatiere={nomMatiere(vue, l.matiere)}
        semaine={vue.hebdo.some((h) => h.id === l.id)}
        plus={plusDetail(l, vue)}
        recuperer={aRecupererDe(vue.aRecuperer, l)}
        jour={vue.jour}
        demo={demo}
        onClose={fermer}
        changer={contrat ? { occupe, onChanger: () => changer(contrat) } : undefined}
      />
    );
  };

  const moment = vue.moment;
  // le jour J et le lendemain, on a posé le pinceau : le serveur ne rend pas de séance (pinceauPose) ;
  // la même règle ici garde les aperçus (vues d'exemple) cohérents
  const avecSeance = !pinceauPose(moment);
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
      <h1 className="t-h3 font-brand m-0">{CODEX.nom}</h1>
      <div className={c.segments}>
        <SegmentsTel segment={segment === "carte" ? "tout" : segment} onChoisir={choisirSegment} />
      </div>

      {message && (
        <p role="status" className="card-quiet t-small p-3">
          {message}
        </p>
      )}

      {/* la visite de Léonard s'y pose quand la préparation n'est pas montrée (cible « cap » sinon) */}
      <div id="codex-segment" role="tabpanel" aria-labelledby={"codex-seg-" + segment} className={c.page} data-leonard="prochaine">
        {segment === "aujourdhui" ? (
          <>
            {moment === "veillee" && vue.tampons && <Veillee tampons={vue.tampons} />}
            {moment === "veillee" && <p className={e.replique}>On ne commence plus rien.</p>}
            {moment === "malle" && vue.malle && <Malle coches={vue.malle.coches} veille={veille} demo={demo} onVue={setVue} />}
            {moment === "lendemain" && vue.recap && <PoseLePinceau recap={vue.recap} />}
            {/* dès le lendemain de l'examen : le verdict (V3 §10.5) */}
            {vue.rythme?.verdict && <Verdict verdict={vue.rythme.verdict} demo={demo} onVue={setVue} />}
            <Aujourdhui vue={vue} fil={avecSeance} demo={demo} onQuete={ouvrir} onVue={setVue} />
          </>
        ) : segment === "tout" ? (
          <>
            {/* après l'examen, le fil rouge continue : il passe en tête (V3 §7.1) */}
            {moment === "apres" && montre("codex:longcours") && <FilRouge fil={vue.filRouge} onQuete={ouvrir} />}
            {d !== "tout" && (
              <p className="m-0">
                <button type="button" className={j.lien} onClick={toutMontrer} disabled={occupe} title={CODEX.toutMontrerAide}>
                  {CODEX.toutMontrer}
                </button>
              </p>
            )}
            {vue.suite && (
              <section className="card-quiet flex flex-wrap items-center gap-3 p-3" aria-label="La suite">
                <p className="t-small m-0 min-w-0 flex-1">{vue.suite.annonce}</p>
                {vue.suite.ouvrable && (
                  <button type="button" className="btn btn-secondary rl-press shrink-0" onClick={() => ouvrirSuite(vue.suite!.programme)} disabled={occupe}>
                    Ouvrir {vue.suite.court} <ArrowRight size={16} aria-hidden />
                  </button>
                )}
              </section>
            )}
            <ToutLeCodex vue={vue} montre={montre} demo={demo} filRouge={moment !== "apres"} onQuete={ouvrir} onVue={setVue} onCarte={() => choisirSegment("carte")} detail={(l) => detail(l, "panneau")} />
          </>
        ) : (
          <>
            <p className="m-0">
              <button type="button" className={j.lien} onClick={() => choisirSegment("tout")}>
                <ArrowLeft size={15} aria-hidden className="inline align-[-2px]" /> {TEXTES_TOUT.retourCarte}
              </button>
            </p>
            <div className={c.surOrdi} data-leonard="trame">
              <ArbreCodex vue={vue} montre={montre} onQuete={ouvrir} onActe={ouvrirActe} allume={allumees} cible={quete} />
            </div>
            <div className={c.surTel}>
              <CodexTel vue={vue} montre={montre} onQuete={ouvrir} />
            </div>
          </>
        )}
      </div>

      <Feuille ouvert={!!acte} onFermer={() => setActe(null)} titre={acte ? etiquetteActe(acte.acte) : "Acte"}>
        {acte && (
          <div className={e.carnet}>
            <TeteChemin sur={`${etiquetteActe(acte.acte)} · ${avanceeActe(acte)}`} titre={acte.acte.titre} />
            <p className="t-small m-0 mt-1 text-center">{acte.acte.but}</p>
            <Chemin
              quetes={acte.quetes}
              nom={(l) => l.titre}
              onQuete={(l) => {
                setActe(null);
                setOuverte(l);
              }}
            />
          </div>
        )}
      </Feuille>

      {ouverte && detail(ouverte, "feuille")}
    </div>
  );
}
