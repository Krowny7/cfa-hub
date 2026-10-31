"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LayoutGrid, Lightbulb, RotateCcw, X } from "lucide-react";
import { SceauUni } from "@/components/moi/synthese/Encre";
import { SEUIL_ACQUIS, SEUIL_BAS } from "@/components/moi/synthese/modele";
import { estompee, panneauCarte, phraseCarte, rangsCarte, resumeCarte, type RangCarte, type SourceNotions } from "@/components/moi/synthese/modele-carte";
import type { EtatNotion, MatiereSynthese, NotionSynthese, Zone } from "@/components/moi/synthese/types";
import { MIN_REPONSES } from "@/lib/points-faibles";
import { CARTE } from "@/lib/voice-moi-carte";
import { nombre } from "@/lib/voice";
import s from "@/components/moi/synthese/Synthese.module.css";
import c from "@/components/moi/synthese/CarteProgramme.module.css";

// « Carte du programme » (grande carte, id="carte") : une case par notion du
// catalogue (93), rangée par matière. La couleur dit où tu en es : rouge sous
// 50 %, ambre de 50 à 69, acquise (aplat vert) à 70 et plus, « en cours » de 1 à
// 7 réponses (case pâle « 3/8 »), jamais vue (bord pointillé). Chaque case est
// un lien vers la fiche de la notion, sinon son chapitre de cours ; un clic sur
// une matière l'isole (les autres s'estompent), et au téléphone ses notions
// s'ouvrent dans un panneau sous la grille. Îlot client : un seul état, la
// matière isolée. Aucune encre vive ici (tout en aplats) et aucun Intl : les
// nombres viennent écrits de modele-carte.ts (pas d'écart d'hydratation).
// La carte se masque sans notions ou sans source (rien à dessiner : 93 cases
// « jamais vue » mentiraient).

const ID = "syn-carte";
const classes = (...x: (string | false | null | undefined)[]) => x.filter(Boolean).join(" ");

const CASE: Record<EtatNotion, string> = { r: c.rou, a: c.amb, e: c.acq, encours: c.enc, jamais: c.jam };
const POINT: Record<Zone, string> = { r: c.ptR, a: c.ptA, e: c.ptE };
const BARRE: Record<Zone, string> = { r: c.finR, a: c.finA, e: c.finE };

export type CarteProgrammeProps = {
  matieres: MatiereSynthese[] | null;
  /** les 93 notions (SyntheseMoi.notions) ; null : la carte se masque */
  notions: NotionSynthese[] | null;
  /** SyntheseMoi.sourceNotions ; null : la carte se masque */
  sourceNotions: SourceNotions | null;
  /** la matière isolée au départ (index dans `matieres`) ; aucune par défaut */
  isoInitial?: number | null;
};

export function CarteProgramme({ matieres, notions, sourceNotions, isoInitial = null }: CarteProgrammeProps) {
  const [iso, setIso] = useState<number | null>(isoInitial);
  const panneau = useRef<HTMLDivElement | null>(null);
  if (!matieres || !notions || !sourceNotions || !notions.length) return null;

  const source = sourceNotions;
  const rangs = rangsCarte(matieres, notions, source);
  if (!rangs.length) return null;
  const resume = resumeCarte(rangs);
  const isolee = iso !== null ? rangs.find((r) => r.i === iso) : undefined;
  const pan = isolee ? panneauCarte(isolee, source) : null;
  const L = CARTE.legende;

  /** Isole une matière (ou lève l'isolation au second clic) ; au téléphone, le panneau est sous la grille : on l'amène à l'écran. */
  function choisir(i: number) {
    const ouvre = iso !== i;
    setIso(ouvre ? i : null);
    if (ouvre && typeof window !== "undefined") {
      const calme = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.requestAnimationFrame(() => panneau.current?.scrollIntoView({ block: "nearest", behavior: calme ? "auto" : "smooth" }));
    }
  }

  return (
    <section className={classes(s.carte, s.grande, c.carteProg, c.ancre)} id="carte" aria-labelledby={ID}>
      <header className={c.entete}>
        <div className={s.teteBloc}>
          <h2 id={ID} className={classes("font-brand", s.titreCarte, s.titreSceau)}>
            <SceauUni grand>
              <LayoutGrid size={18} aria-hidden />
            </SceauUni>
            {CARTE.titre}
          </h2>
          <p className={classes(s.sous, c.texteGrand)}>{CARTE.sous(resume.total)}</p>
          <p className={classes(s.sous, c.texteTel)}>{CARTE.sousTel(resume.total)}</p>
        </div>
        <p className={c.compteur}>
          <b className={classes("font-brand", s.surligne)}>{nombre(resume.sous)}</b>
          <span>{CARTE.compteur(resume.sous, SEUIL_ACQUIS)}</span>
        </p>
      </header>

      <div className={c.barre}>
        <ul className={c.legende} aria-label={L.aria}>
          <li>
            <i className={classes(c.sw, c.swR)} />
            {L.rouge(SEUIL_BAS)} · <b className={s.mono}>{resume.rouges}</b>
          </li>
          <li>
            <i className={classes(c.sw, c.swA)} />
            {L.ambre(SEUIL_BAS, SEUIL_ACQUIS)} · <b className={s.mono}>{resume.ambres}</b>
          </li>
          <li>
            <i className={classes(c.sw, c.swE)} />
            {L.acquise} · <b className={s.mono}>{resume.acquises}</b>
          </li>
          <li>
            <i className={classes(c.sw, c.swC)} />
            {L.enCours(MIN_REPONSES)} · <b className={s.mono}>{resume.enCours}</b>
          </li>
          <li>
            <i className={classes(c.sw, c.swN)} />
            {L.jamais(source)} · <b className={s.mono}>{resume.jamais}</b>
          </li>
        </ul>
        {isolee && (
          <button type="button" className={c.raz} onClick={() => setIso(null)}>
            <RotateCcw size={15} aria-hidden />
            {CARTE.raz(matieres.length)}
          </button>
        )}
      </div>

      <div className={c.grille} role="group" aria-label={CARTE.grille.aria}>
        {rangs.map((r) => (
          <Rang key={r.i} r={r} iso={iso} nMatieres={matieres.length} onChoisir={choisir} />
        ))}
      </div>

      {pan && (
        <div ref={panneau} className={c.panneau} role="region" aria-live="polite" aria-label={CARTE.panneau.aria}>
          <div className={c.panneauTete}>
            <div className={c.panneauTexte}>
              <p className={s.eyebrow}>{CARTE.panneau.kicker}</p>
              <h3 className="font-brand">{pan.nom}</h3>
              <p className={c.astuce}>{pan.resume}</p>
            </div>
            <button type="button" className={c.ferme} onClick={() => setIso(null)} aria-label={CARTE.raz(matieres.length)}>
              <X size={16} aria-hidden />
            </button>
          </div>
          <ul className={c.liste}>
            {pan.lignes.map((l) => (
              <li key={l.id}>
                <Link href={l.href} prefetch={false} className={c.ligne} aria-label={l.titre} title={l.titre}>
                  <span className={c.ligneNom}>{l.nom}</span>
                  <span className={c.fin} aria-hidden>
                    {l.ton && l.w > 0 && <i className={BARRE[l.ton]} style={{ width: `${l.w}%` }} />}
                    <span className={c.seuil} />
                  </span>
                  <span className={classes(s.mono, c.ligneVal)}>{l.valeur}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!pan && <p className={c.astuceTel}>{CARTE.panneau.astuce}</p>}

      <p className={c.lire}>
        <Lightbulb size={16} aria-hidden />
        <span>
          <b>{CARTE.lire.pied}</b> {phraseCarte(rangs, resume, iso, source)}
        </span>
      </p>
    </section>
  );
}

/** La rangée d'une matière : son bouton (valeur et zone) puis ses cases. */
function Rang({ r, iso, nMatieres, onChoisir }: { r: RangCarte; iso: number | null; nMatieres: number; onChoisir: (i: number) => void }) {
  const on = iso === r.i;
  const off = estompee(r.i, iso);
  return (
    <div className={c.rang}>
      <button
        type="button"
        className={classes(c.lm, on && c.on, off && c.off)}
        aria-pressed={on}
        aria-label={CARTE.matiere.titre(r.court, r.valeurAria, on, nMatieres)}
        title={r.info ?? undefined}
        onClick={() => onChoisir(r.i)}
      >
        <span className={c.lmNom}>
          <i className={classes(c.pt, r.zone ? POINT[r.zone] : c.ptN)} aria-hidden />
          <b>{r.court}</b>
        </span>
        <span className={classes(s.mono, c.lmVal)}>{r.valeur}</span>
      </button>
      <div className={c.cases} role="group" aria-label={CARTE.grille.notionsDe(r.court)}>
        {r.cases.map((x) => (
          <Link key={x.id} href={x.href} prefetch={false} className={classes(c.cel, CASE[x.etat], off && c.off)} title={x.titre} aria-label={x.titre}>
            <b>{x.valeur}</b>
            <span>{x.nom}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
