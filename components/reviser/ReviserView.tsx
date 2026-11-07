import { EncreVive } from "@/components/nav/EncreVive";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Icone } from "@/components/adn/icons";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { CarteCoursComplets } from "@/components/reviser/ParcoursClient";
import { PecheAnimee } from "@/components/reviser/PecheAnimee";
import { SUBJECTS } from "@/components/reviser/catalog";
import type { DonneesReviser, EtatFiche } from "@/components/reviser/parcours";
import { InkRing } from "@/components/ink/InkRing";
import { Illustration } from "@/components/ui/Illustration";
import { TOTAL_FORMULES } from "@/lib/formules";
import type { EcouteCours } from "@/lib/course-ecoute";
import { PALETTES, styleDePalette } from "@/lib/palettes";
import { nombre } from "@/lib/voice";
import { RV } from "@/lib/voice-reviser";
import { ESPACES } from "@/lib/voice-z4";
import s from "./Parcours.module.css";

// Espace « Réviser », disposition choisie par Théo. Dans le cadre commun (.rl-cadre) : le
// cours complet en grand, les fiches et les flashcards à sa droite. Dessous : les one-pagers
// et la peinture animée de la pêche, puis la page blanche, les vidéos résumé et l'Atelier, enfin le
// Codex et son aperçu (`codex`, lu en flux par app/reviser). Le carnet de ratures, les
// questions marquées et les points faibles sont sur la page de l'Atelier (Registre).
// Sans requête : app/reviser charge les données (parcours-data.ts), l'aperçu en fournit
// d'exemple ; ce qui vient de l'appareil (dernier cours) est lu après le montage.
// Repères de Léonard (data-leonard) : bibliotheque, cours, fiches, fin, atelier.
// Couleurs : celles de l'onglet « Réviser » (palette studiolo, lib/palettes.ts). L'encre de
// l'onglet (.rl-encre) revient sur la page : le vrai fluide (EncreVive) dans les boutons, les
// pastilles d'étape et les sceaux.

/** Les one-pagers de la carte (vraies pages, public/one-pagers) ; le mur en compte trois rangées de six. */
const ONE_PAGERS = SUBJECTS.flatMap((x) => (x.onePager ? [x.onePager] : []));
const MUR = [...ONE_PAGERS, ...ONE_PAGERS].slice(0, 18);

const ONGLET: Record<EtatFiche, string | undefined> = { finie: s.ongletFini, entamee: s.ongletEntame, neuve: undefined };
/** Les onglets du classeur : les matières qui ont une fiche, dans l'ordre du programme. */
const MATIERES_FICHES = SUBJECTS.filter((x) => x.fiche);

/** Les aperçus : l'écoute et « Sans calcul » d'exemple, à la place de l'appareil. */
export type ApercuReviser = { ecoute?: EcouteCours | null; sansCalcul?: boolean };

/** La palette de la page (celle de l'onglet « Réviser ») et l'encre de l'onglet : le vrai fluide (EncreVive) dans les boutons, les pastilles et les sceaux. */
const PAL = PALETTES.studiolo;
const encre = (...cls: string[]) => ["rl-encre", s.encre, ...cls].join(" ");

/** Le premier bloc de la page : le cours en grand, les fiches et les flashcards à sa droite. */
function Haut({ d, apercu }: { d: DonneesReviser; apercu?: ApercuReviser }) {
  const f = d.fiches;
  const etats = new Map(f?.etats.map((e) => [e.key, e.etat]));
  // la fiche à ouvrir ensuite : une entamée d'abord, sinon la première pas commencée
  const suite = f ? (MATIERES_FICHES.find((m) => etats.get(m.key) === "entamee") ?? MATIERES_FICHES.find((m) => (etats.get(m.key) ?? "neuve") === "neuve")) : undefined;
  const fc = d.flashcards;
  return (
    <ol className={s.tete} aria-label={RV.parcours} data-leonard="bibliotheque">
      <CarteCoursComplets apercu={apercu?.ecoute} />

      <li className={s.case} data-leonard="fiches">
        <div className={s.classeur}>
          <i aria-hidden />
          <i aria-hidden />
          <nav className={s.onglets} aria-label={RV.fichesOnglets}>
            {MATIERES_FICHES.map((m) => {
              const etat = etats.get(m.key) ?? "neuve";
              return (
                <Link key={m.key} href={`/fiches/${m.fiche}`} className={ONGLET[etat]} title={RV.ficheOnglet(m.name, etat)} aria-label={RV.ficheOnglet(m.name, etat)}>
                  {m.code}
                </Link>
              );
            })}
          </nav>
          <div className={s.chemise}>
            <Link href="/fiches" className={s.chemiseLien} aria-label={RV.fichesAction} title={RV.fichesAide} />
            <span className={s.chemiseHaut}>
              <h3 className={s.c2Titre}>{RV.fichesTitre}</h3>
              {f && (
                <span className={[s.compteFiches, "t-num"].join(" ")}>
                  {f.finies}
                  <small>/{f.total}</small>
                </span>
              )}
            </span>
            {suite && (
              <Link href={`/fiches/${suite.fiche}`} className={s.suite}>
                <span>
                  <small>{etats.get(suite.key) === "entamee" ? RV.fichesReprendre : RV.fichesCommencer}</small>
                  <b>{suite.name}</b>
                </span>
                <ArrowRight size={16} aria-hidden />
              </Link>
            )}
            <span className={s.chemiseBas} aria-hidden>
              <span className={encre(s.bouton)} data-palette={PAL.key}>
                <EncreVive tons={PAL.liquide} />
                {RV.fichesAction}
              </span>
              {f && <span className={s.avancementTexte}>{RV.fichesAvancement(f.finies, f.entamees)}</span>}
            </span>
          </div>
        </div>
      </li>

      <li className={s.case} data-leonard="fin">
        <Link href="/flashcards" className={s.paquet} aria-label={RV.fcTitre}>
          <i aria-hidden />
          <i aria-hidden />
          <span className={s.flash}>
            <span className={s.flashHaut}>
              <small>{RV.fcCarteTete}</small>
              {fc.cartes !== null && fc.cartes > 0 && <span className="t-num">{nombre(fc.cartes)}</span>}
            </span>
            <span className={s.flashFormule}>
              ModDur = <span className={s.surligne}>MacDur / (1 + r)</span>
            </span>
            <span className={s.flashBas}>
              <b>{RV.fcTitre}</b>
              <span>{fc.boucle ? fc.boucle.texte : RV.fcSous(fc.parMatiere)}</span>
            </span>
          </span>
        </Link>
      </li>
    </ol>
  );
}

/** Les one-pagers (toutes les pages, en mur) et la peinture. */
function Pages() {
  return (
    <div className={s.duo}>
      <Link href="/fiches/one-pagers" className={[s.carte, s.levable, s.pages].join(" ")}>
        <span className={s.mur + " " + s.sombreNuit} aria-hidden>
          {MUR.map((slug, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={`/one-pagers/${slug}.webp`} alt="" width={300} height={425} loading="lazy" decoding="async" />
          ))}
        </span>
        <span className={s.c1Voile} aria-hidden />
        <span className={s.pagesTexte}>
          <b className={s.pagesTitre}>{RV.opTitre}</b>
          <small>{RV.opSous(ONE_PAGERS.length)}</small>
        </span>
        <span className={encre(s.bouton)} data-palette={PAL.key}>
          <EncreVive tons={PAL.liquide} />
          {RV.opAction}
        </span>
      </Link>
      <div className={s.peche} aria-hidden>
        <PecheAnimee className={s.fond} />
      </div>
    </div>
  );
}

/** La rangée des outils, à égalité. */
function Outils({ d }: { d: DonneesReviser }) {
  const r = d.ratures;
  return (
    <ul className={s.outils}>
      <li className={s.case} data-leonard="atelier">
        <Link href="/atelier" className={[s.carte, s.levable, s.atelierCarte].join(" ")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/atelier/etabli-1024.webp" alt="" width={1024} height={572} loading="lazy" decoding="async" draggable={false} className={s.fond + " " + s.sombreNuit} />
          <span className={s.c1Voile} aria-hidden />
          <h3 className={s.c1Titre}>{RV.atelier}</h3>
          {r && r.enCours > 0 ? (
            <span className={s.atelierSous}>
              <b className="t-num">{nombre(r.enCours)}</b> {RV.carnetEnCours(r.enCours)}
            </span>
          ) : (
            <span className={s.atelierSous}>{RV.atelierSous}</span>
          )}
          <span className={encre(s.bouton)} data-palette={PAL.key}>
            <EncreVive tons={PAL.liquide} />
            {RV.atelierAction}
          </span>
        </Link>
      </li>
      <li className={s.case}>
        <Link href="/page-blanche" className={[s.carte, s.levable, s.outil, s.outilClair].join(" ")}>
          <Illustration nom="reviser-page-blanche" position="50% 62%" decorative className={s.fond} />
          <span className={s.outilTexte}>
            <h3 className={"font-brand " + s.outilTitre}>{RV.pbTitre}</h3>
            <span>{RV.pbSous}</span>
          </span>
          <span className={s.outilChiffre + " t-num"}>{nombre(TOTAL_FORMULES)}</span>
        </Link>
      </li>
      <li className={s.case}>
        <Link href="/videos" className={[s.carte, s.levable, s.outil, s.outilSombre].join(" ")}>
          <InkRing size={230} className="rl-deco pointer-events-none absolute -right-[40px] top-1/2 -z-[1] -translate-y-1/2 text-[#fff] opacity-[0.08]" />
          <span className={s.outilLecture} aria-hidden>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4l14 8-14 8z" />
            </svg>
          </span>
          <span className={s.outilTexte}>
            <h3 className={"font-brand " + s.outilTitre}>{RV.videosTitre}</h3>
            <span>{RV.videosSous}</span>
          </span>
          <span className={s.outilEtiquette}>{RV.videosEtiquette}</span>
        </Link>
      </li>
    </ul>
  );
}

/** Une grande carte : le Codex et son aperçu, à côté le Terminal. */
function Codex({ apercu }: { apercu?: React.ReactNode }) {
  return (
    <section className={[s.carte, s.papier, s.grande].join(" ")} aria-label={RV.codexTerminal}>
      <div className={s.codex}>
        <div className={s.codexTete}>
          <div>
            <h2 className={"font-brand " + s.lieuTitre}>{RV.codexTitre}</h2>
            <p className={s.sous}>{RV.codexSous}</p>
          </div>
          <Link href="/codex" className={encre(s.bouton)} data-palette={PAL.key}>
            <EncreVive tons={PAL.liquide} />
            {RV.codexAction}
          </Link>
        </div>
        {apercu}
      </div>
      <Link href="/terminal" className={s.terminal}>
        <span className={s.terminalEcran} aria-hidden>
          <i>&gt; MARCHES</i>
          <i>
            ORVX <b>+1,2 %</b>
          </i>
          <i>
            BELX <em>−0,4 %</em>
          </i>
          <i>
            KELX <b>+0,8 %</b>
          </i>
        </span>
        <span className={s.terminalTexte}>
          <b className="font-brand">{RV.terminalTitre}</b>
          <span>{RV.terminalSous}</span>
        </span>
      </Link>
    </section>
  );
}

export function ReviserView({ d, apercu, codex }: { d: DonneesReviser; apercu?: ApercuReviser; /** l'aperçu du Codex, lu en flux */ codex?: React.ReactNode }) {
  return (
    <DomainSpace
      kicker="Réviser"
      icon={<Icone nom="reviser" size={18} />}
      title={ESPACES.reviserTitre}
      lead={
        <div className={s.racine} style={styleDePalette(PAL)}>
          <Haut d={d} apercu={apercu} />
        </div>
      }
      suite={
        <div className={s.racine} style={styleDePalette(PAL)}>
          <Pages />
          <Outils d={d} />
          <Codex apercu={codex} />
        </div>
      }
    />
  );
}
