import Link from "next/link";
import { Zap } from "lucide-react";
import { EncreVive } from "@/components/nav/EncreVive";
import { Icone } from "@/components/adn/icons";
import { Glyphe } from "@/components/entrainement/Glyphes";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { subjectByKey } from "@/components/reviser/catalog";
import { agoLabel } from "@/components/accueil/format";
import { Illustration } from "@/components/ui/Illustration";
import type { IllustrationNom } from "@/lib/illustrations";
import { PALETTES, styleDePalette } from "@/lib/palettes";
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
// égalité, « Calculs » et « Entraînement ciblé » (le titre, un gros chiffre
// surligné, une ligne d'état, le bouton d'encre) ; puis la rangée « Séries
// éclair » (la peinture à gauche) et « Tes points faibles » (une barre par
// notion, le repère pointillé à 70 %, des bâtons quand la notion n'est
// mesurée qu'en ratures) ; puis, à droite et empilés, « QCM par thème » et
// « Examens officiels », à gauche un lieu peint sans action, réservé à un
// usage futur (la peinture seule, sans titre ni lien). Téléphone : une
// colonne, les deux entrées principales d'abord.
// Sans requête : app/entrainement charge les données, l'aperçu en fournit.
// Les chiffres sont ceux de la base ou des catalogues ; sans eux, la ligne
// d'état disparaît (jamais de valeur inventée).
// Repères de Léonard (data-leonard) : session (le diptyque), eclair,
// points-faibles, autres (les entrées secondaires).
// Couleurs : celles de l'onglet « S'entraîner » (palette atelier, lib/palettes.ts :
// styleDePalette pose --pal-1 brun chaud … --pal-4 flamme de bougie sur la
// racine). L'encre de l'onglet (.rl-encre, globals.css) revient sur la page : le
// vrai fluide (EncreVive) dans les trois boutons, la texture qui dérive dans
// les sceaux. Mode discret et nuit : voir Entrainer.module.css.

export type EntrainementData = {
  practice: { sessions: number; last: { score: number; total: number; at: string; topics?: string[] } | null };
  /** les calculs ouverts (lib/calc, calcSubjectCards) : leurs questions et leurs matières ; absent : la moitié reste sans chiffre */
  calculs?: { questions: number; matieres: number } | null;
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

function topicsLabel(keys: string[] | undefined) {
  if (!keys || keys.length === 0) return null;
  const first = subjectByKey(keys[0])?.name ?? keys[0];
  return keys.length > 1 ? `${first} + ${keys.length - 1}` : first;
}

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

/** Une moitié du diptyque : la peinture, un voile sombre, le texte clair posé en bas. */
function Entree({
  id,
  illu,
  position,
  sceau,
  titre,
  phrase,
  chiffre,
  unite,
  etat,
  href,
  action,
}: {
  id: string;
  illu: IllustrationNom;
  position: string;
  sceau: React.ReactNode;
  titre: string;
  phrase: string;
  chiffre?: string | null;
  unite?: string;
  etat?: React.ReactNode;
  href: string;
  action: string;
}) {
  return (
    <article className={s.moitie} aria-labelledby={id}>
      <Illustration nom={illu} position={position} decorative eager className={s.fond} />
      <div className={s.corps}>
        <h2 id={id} className={"font-brand " + s.titre}>
          <span className={encre(s.sceau)} data-palette={PAL.key} aria-hidden>
            {sceau}
          </span>
          {titre}
        </h2>
        <p className={s.phrase}>{phrase}</p>
        {chiffre ? (
          <p className={s.chiffre}>
            <span className={"t-num " + s.pech}>{chiffre}</span>
            {unite && <span>{unite}</span>}
          </p>
        ) : null}
        {etat ? <p className={s.etat}>{etat}</p> : null}
        <Link href={href} className={encre(s.bouton)} data-palette={PAL.key}>
          <EncreVive tons={PAL.liquide} />
          {action}
        </Link>
      </div>
    </article>
  );
}

function Diptyque({ d, now }: { d: EntrainementData; now?: number }) {
  const c = d.calculs;
  const n = d.practice.sessions;
  const last = d.practice.last;
  const nom = last ? topicsLabel(last.topics) : null;
  const score = last && last.total > 0 ? `${nombre(last.score)}/${nombre(last.total)}` : null;
  return (
    <section className={s.diptyque} aria-label={ENTRAINER.entrees} data-leonard="session">
      <Entree
        id="ent-calculs"
        illu="calculs-abaque"
        position="50% 40%"
        sceau={<Glyphe nom="calculs" size={22} />}
        titre={ENTRAINER.calculsTitre}
        phrase={ENTRAINER.calculsPhrase}
        chiffre={c && c.questions > 0 ? nombre(c.questions) : null}
        unite={c && c.questions > 0 ? ENTRAINER.calculsUnite(c.matieres) : undefined}
        etat={c && c.questions > 0 ? ENTRAINER.calculsNiveaux : null}
        href="/calculs"
        action={ENTRAINER.calculsAction}
      />
      <Entree
        id="ent-cible"
        illu="practice-studiolo"
        position="50% 40%"
        sceau={<Icone nom="entrainer" size={22} />}
        titre={ENTRAINER.cibleTitre}
        phrase={ENTRAINER.ciblePhrase}
        chiffre={n > 0 ? nombre(n) : null}
        unite={n > 0 ? ENTRAINER.cibleUnite(n) : undefined}
        etat={
          n === 0 ? (
            ENTRAINER.cibleAucune
          ) : last ? (
            <>
              {ENTRAINER.cibleDerniere} {nom && <b>{nom}</b>}
              {nom ? " · " : ""}
              {score && <span className={s.mono}>{score}</span>}
              {score ? " · " : ""}
              {agoLabel(last.at, now)}
            </>
          ) : null
        }
        href="/practice"
        action={ENTRAINER.cibleAction}
      />
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

export function EntrainementView({ d, now }: { d: EntrainementData; now?: number }) {
  return (
    <DomainSpace
      kicker="S'entraîner"
      icon={<Icone nom="entrainer" size={18} />}
      title="Pratiquer, comme le jour J"
      lead={
        <div className={s.racine} style={styleDePalette(PAL)}>
          <Diptyque d={d} now={now} />
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
