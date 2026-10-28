import Link from "next/link";
import { Zap } from "lucide-react";
import { EncreVive } from "@/components/nav/EncreVive";
import { Icone } from "@/components/adn/icons";
import { Glyphe } from "@/components/entrainement/Glyphes";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { subjectByKey } from "@/components/reviser/catalog";
import { Illustration } from "@/components/ui/Illustration";
import type { IllustrationNom } from "@/lib/illustrations";
import { PALETTES, styleDePalette } from "@/lib/palettes";
import { TOPICS } from "@/lib/practiceTopics";
import { MIN_REPONSES, type PointsFaiblesData } from "@/lib/points-faibles";
import { ECLAIR_HREF } from "@/lib/eclair";
import { ECLAIR } from "@/lib/voice-z2c";
import { nombre } from "@/lib/voice";
import { RV } from "@/lib/voice-reviser";
import { ENTRAINER } from "@/lib/voice-z4";
import s from "./Entrainer.module.css";

// Espace « S'entraîner » (maquette validée), même langage que Réviser : des
// cartes en papier et en encre, la palette de l'onglet (« atelier »). Dans
// l'ordre : le diptyque, un grand bandeau coupé en deux moitiés peintes à
// égalité, « Calculs » (le titre, trois pastilles de niveau, le bouton d'encre)
// et « Entraînement ciblé » (le titre, une échelle du poids de chaque matière à
// l'examen, le bouton d'encre) ; puis la rangée « Séries
// éclair » (la peinture à gauche) et « Tes points faibles » (une barre par
// notion, le repère pointillé à 70 %, des bâtons quand la notion n'est
// mesurée qu'en ratures) ; puis, à droite et empilés, « QCM par thème » et
// « Examens officiels », à gauche un lieu peint sans action, réservé à un
// usage futur (la peinture seule, sans titre ni lien). Téléphone : une
// colonne, les deux entrées principales d'abord.
// Sans requête : app/entrainement charge les données, l'aperçu en fournit.
// Les chiffres sont ceux de la base ; sans eux, la ligne disparaît (jamais de
// valeur inventée). Le diptyque n'en lit aucun : les poids de l'échelle sont
// ceux du programme (lib/practiceTopics).
// Repères de Léonard (data-leonard) : session (le diptyque), eclair,
// points-faibles, autres (les entrées secondaires).
// Couleurs : celles de l'onglet « S'entraîner » (palette atelier, lib/palettes.ts :
// styleDePalette pose --pal-1 brun chaud … --pal-4 flamme de bougie sur la
// racine). L'encre de l'onglet (.rl-encre, globals.css) revient sur la page : le
// vrai fluide (EncreVive) dans les trois boutons, la texture qui dérive dans
// le sceau des séries éclair ; les deux sceaux du diptyque sont de simples
// disques noirs. Mode discret et nuit : voir Entrainer.module.css.

export type EntrainementData = {
  /** séries éclair rendues aujourd'hui ; null : table absente */
  eclair?: number | null;
  /** réussite récente aux séries éclair (%) ; null : pas encore de série */
  eclairPct?: number | null;
  /** « Tes points faibles » : absent, la carte garde sa phrase neutre */
  pointsFaibles?: PointsFaiblesData;
};

const PAL = PALETTES.atelier;
const encre = (...cls: string[]) => ["rl-encre", s.encre, ...cls].join(" ");
const papier = (...cls: string[]) => [s.carte, s.papier, ...cls].join(" ");

/** Combien de notions la carte en montre (la page « Points faibles » les a toutes). */
const MAX_LIGNES = 4;

/** Une notion de la carte : sa réussite récente (citée dès MIN_REPONSES réponses, comme sur la page Réviser) ou, en deçà, ses ratures en cours. */
export type LigneFaible = { cle: string; libelle: string; matiere: string; pct: number | null; ratures: number };

export function lignesFaibles(p: PointsFaiblesData | undefined, max = MAX_LIGNES): LigneFaible[] {
  if (!p || p.etat !== "faibles") return [];
  return p.liste.slice(0, max).map((n) => ({
    cle: n.cle,
    libelle: n.libelle,
    matiere: n.matiereNom,
    pct: n.mesures.n >= MIN_REPONSES ? Math.round((100 * n.mesures.ok) / n.mesures.n) : null,
    ratures: n.mesures.enCours,
  }));
}

/** Une moitié du diptyque : la peinture, un voile sombre, le texte clair posé en bas (titre, ce que dit la moitié, bouton d'encre). */
function Entree({
  id,
  illu,
  position,
  sceau,
  titre,
  href,
  action,
  children,
}: {
  id: string;
  illu: IllustrationNom;
  position: string;
  sceau: React.ReactNode;
  titre: string;
  href: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <article className={s.moitie} aria-labelledby={id}>
      <Illustration nom={illu} position={position} decorative eager className={s.fond} />
      <div className={s.corps}>
        <h2 id={id} className={"font-brand " + s.titre}>
          <span className={s.sceau + " " + s.sceauNoir} aria-hidden>
            {sceau}
          </span>
          {titre}
        </h2>
        {children}
        <Link href={href} className={encre(s.bouton)} data-palette={PAL.key}>
          <EncreVive tons={PAL.liquide} />
          {action}
        </Link>
      </div>
    </article>
  );
}

/** Une matière sur l'échelle de l'examen : sa largeur (le milieu de la fourchette de son poids), sa teinte (1 la plus lourde, 3 les autres) et son libellé. */
export type SegmentExamen = { cle: string; nom: string; poids: number; ton: 1 | 2 | 3; libelle: string };

/** Les dix matières dans l'ordre du programme, avec le poids de lib/practiceTopics. */
export function segmentsExamen(): SegmentExamen[] {
  return TOPICS.map((t) => {
    const nom = subjectByKey(t.key)?.short ?? t.key;
    return {
      cle: t.key,
      nom,
      poids: t.weight,
      ton: t.weight >= 15 ? 1 : t.weight >= 11 ? 2 : 3,
      libelle: ENTRAINER.echelleSegment(nom, ENTRAINER.echelleFourchettes[t.key] ?? String(t.weight)),
    };
  });
}

/** La légende de l'échelle : une entrée par teinte (les matières les plus lourdes nommées avec leur fourchette, les autres en bloc). */
function legendeExamen(segments: SegmentExamen[]) {
  const nommees = ([1, 2] as const).flatMap((ton) => {
    const du = segments.filter((x) => x.ton === ton);
    if (du.length === 0) return [];
    const noms = du.map((x) => x.nom).join(", ");
    const fourchette = ENTRAINER.echelleFourchettes[du[0].cle];
    return [{ ton, texte: fourchette ? ENTRAINER.echelleSegment(noms, fourchette) : noms }];
  });
  return segments.some((x) => x.ton === 3) ? [...nommees, { ton: 3 as const, texte: ENTRAINER.echelleAutres }] : nommees;
}

const TONS_ECHELLE = { 1: s.ton1, 2: s.ton2, 3: s.ton3 } as const;

/** L'échelle de l'examen : une barre en dix segments, un par matière, de largeur proportionnelle à son poids. */
function EchelleExamen() {
  const segments = segmentsExamen();
  return (
    <div className={s.echelle}>
      <p className={s.echelleTitre}>{ENTRAINER.echelleTitre}</p>
      <ul className={s.barre} aria-label={ENTRAINER.echelleLibelle}>
        {segments.map((x) => (
          <li key={x.cle} className={TONS_ECHELLE[x.ton]} style={{ flexGrow: x.poids }} title={x.libelle}>
            <span className="sr-only">{x.libelle}</span>
          </li>
        ))}
      </ul>
      <ul className={s.legendeEchelle} aria-hidden>
        {legendeExamen(segments).map((l) => (
          <li key={l.ton}>
            <i className={TONS_ECHELLE[l.ton]} />
            {l.texte}
          </li>
        ))}
      </ul>
    </div>
  );
}

const NIVEAUX = [s.niveau1, s.niveau2, s.niveau3] as const;

function Diptyque() {
  return (
    <section className={s.diptyque} aria-label={ENTRAINER.entrees} data-leonard="session">
      <Entree
        id="ent-calculs"
        illu="calculs-abaque"
        position="50% 40%"
        sceau={<Glyphe nom="calculs" size={22} />}
        titre={ENTRAINER.calculsTitre}
        href="/calculs"
        action={ENTRAINER.calculsAction}
      >
        <ul className={s.niveaux} aria-label={ENTRAINER.calculsNiveauxLibelle}>
          {ENTRAINER.calculsNiveaux.map((nom, i) => (
            <li key={nom} className={s.pastille + " " + NIVEAUX[i]}>
              <span className={s.points} aria-hidden>
                {[0, 1, 2].map((k) => (
                  <i key={k} className={k <= i ? s.allume : undefined} />
                ))}
              </span>
              {nom}
            </li>
          ))}
        </ul>
      </Entree>
      <Entree
        id="ent-cible"
        illu="practice-studiolo"
        position="50% 40%"
        sceau={<Icone nom="entrainer" size={22} />}
        titre={ENTRAINER.cibleTitre}
        href="/practice"
        action={ENTRAINER.cibleAction}
      >
        <EchelleExamen />
      </Entree>
    </section>
  );
}

/** Des bâtons de comptage (quatre traits et la barre oblique pour cinq) : une notion mesurée seulement en ratures. */
function Batons({ n }: { n: number }) {
  const k = Math.min(Math.max(n, 1), 15);
  const paquets = Math.floor(k / 5);
  const reste = k % 5;
  const PAS = 51;
  const traits: string[] = [];
  for (let g = 0; g < paquets; g++) {
    for (let i = 0; i < 4; i++) traits.push(`M${g * PAS + 6 + 11 * i} 3v22`);
    traits.push(`M${g * PAS} 20L${g * PAS + 45} 8`);
  }
  for (let r = 0; r < reste; r++) traits.push(`M${paquets * PAS + 6 + 11 * r} 3v22`);
  const largeur = reste ? paquets * PAS + 6 + 11 * (reste - 1) + 4 : paquets * PAS - 6;
  return (
    <svg className={s.batons} width={largeur} height={28} viewBox={`0 0 ${largeur} 28`} aria-hidden fill="none" strokeWidth={2.6} strokeLinecap="round">
      <path d={traits.join("")} />
    </svg>
  );
}

function Eclair({ d }: { d: EntrainementData }) {
  const n = typeof d.eclair === "number" ? d.eclair : null;
  return (
    <section className={papier(s.eclair)} aria-labelledby="ent-eclair" data-leonard="eclair">
      <div className={s.vignette}>
        <Illustration nom="eclair-depart" position="50% 50%" decorative className={s.fond} />
      </div>
      <div className={s.eclairCorps}>
        <h2 id="ent-eclair" className={"font-brand " + s.titreMoyen}>
          <span className={encre(s.sceau, s.sceauMoyen)} data-palette={PAL.key} aria-hidden>
            <Zap size={16} />
          </span>
          {ECLAIR.nom}
        </h2>
        <p className={s.sous}>{ENTRAINER.eclairPhrase}</p>
        {n !== null &&
          (n > 0 ? (
            <p className={s.compte}>
              <span className={"t-num " + s.surligne}>{nombre(n)}</span>
              <span>{ENTRAINER.eclairUnite(n)}</span>
            </p>
          ) : (
            <p className={s.compte + " " + s.compteVide}>{ENTRAINER.eclairAucune}</p>
          ))}
        {typeof d.eclairPct === "number" && <p className={s.sous}>{ENTRAINER.eclairReussite(d.eclairPct)}</p>}
        <Link href={ECLAIR_HREF} className={encre(s.bouton, s.boutonBas)} data-palette={PAL.key}>
          <EncreVive tons={PAL.liquide} />
          {n !== null && n > 0 ? ECLAIR.carte.encore : ENTRAINER.eclairAction}
        </Link>
      </div>
    </section>
  );
}

function Faibles({ d }: { d: EntrainementData }) {
  const p = d.pointsFaibles;
  const lignes = lignesFaibles(p);
  return (
    <section className={papier(s.faibles)} aria-labelledby="ent-faibles" data-leonard="points-faibles">
      <div className={s.faiblesTete}>
        <div>
          <h2 id="ent-faibles" className={s.faiblesTitre}>
            {ENTRAINER.faiblesTitre}
          </h2>
          <p className={s.sous}>{ENTRAINER.faiblesSous}</p>
        </div>
        {lignes.length > 0 && (
          <span className={s.legende} aria-hidden>
            <span className={s.legendeTrait} />
            {ENTRAINER.faiblesSeuil}
          </span>
        )}
      </div>
      {lignes.length > 0 ? (
        <ul className={s.lignes}>
          {lignes.map((l) => (
            <li key={l.cle} className={s.ligne} title={`${l.matiere} · ${l.libelle}`}>
              <span className={s.nom}>
                <b>{l.libelle}</b>
                <span>{l.matiere}</span>
              </span>
              {l.pct !== null ? (
                <span className={s.piste} role="img" aria-label={ENTRAINER.faiblesPiste(l.libelle, l.pct)}>
                  <i className={l.pct < 50 ? s.rouge : s.ambre} style={{ width: `${l.pct}%` }} />
                  <span className={s.seuil} />
                </span>
              ) : (
                <span className={s.pisteBatons} role="img" aria-label={ENTRAINER.faiblesPisteRatures(l.libelle, l.ratures)}>
                  <Batons n={l.ratures} />
                </span>
              )}
              <span className={s.valeur + (l.pct === null ? " " + s.valeurRature : "")}>{l.pct !== null ? `${l.pct} %` : RV.faiblesRatures(l.ratures)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.vide}>{!p ? RV.faiblesSansChiffre : p.etat === "peu" ? RV.faiblesPeu : RV.faiblesRien}</p>
      )}
      <div className={s.pied}>
        <Link href="/moi?onglet=stats#points-faibles" className={s.lien}>
          {RV.faiblesAction}
        </Link>
      </div>
    </section>
  );
}

/** Une entrée secondaire : une vignette peinte, le titre, une phrase ; toute la carte est le lien. */
function Petite({ href, illu, position, titre, texte }: { href: string; illu: IllustrationNom; position: string; titre: string; texte: string }) {
  return (
    <Link href={href} className={papier(s.levable, s.petite)}>
      <span className={s.petiteImg}>
        <Illustration nom={illu} position={position} decorative className={s.fond} />
      </span>
      <span className={s.petiteTexte}>
        <h2 className={s.petiteTitre}>
          {titre}
          <span className={s.fleche} aria-hidden>
            →
          </span>
        </h2>
        <span className={s.sous}>{texte}</span>
      </span>
    </Link>
  );
}

/** Le dernier étage : à gauche un lieu peint, sans titre ni action (la place d'un usage futur) ; à droite, empilés, le QCM et les examens officiels. */
function Autres() {
  return (
    <div className={s.bas}>
      <div className={s.lieu} aria-hidden>
        <Illustration nom="accueil-trente-du-jour" position="50% 34%" decorative className={s.fond} />
      </div>
      <nav className={s.aside} aria-label={ENTRAINER.autres} data-leonard="autres">
        <Petite href="/qcm" illu="qcm-bibliotheque" position="50% 50%" titre={ENTRAINER.qcmTitre} texte={ENTRAINER.qcmTexte} />
        <Petite href="/official-exams" illu="exams-sceau" position="50% 50%" titre={ENTRAINER.examsTitre} texte={ENTRAINER.examsTexte} />
      </nav>
    </div>
  );
}

export function EntrainementView({ d }: { d: EntrainementData }) {
  return (
    <DomainSpace
      kicker="S'entraîner"
      icon={<Icone nom="entrainer" size={18} />}
      title="Pratiquer, comme le jour J"
      lead={
        <div className={s.racine} style={styleDePalette(PAL)}>
          <Diptyque />
          <div className={s.rangee}>
            <Eclair d={d} />
            <Faibles d={d} />
          </div>
          <Autres />
        </div>
      }
    />
  );
}
