import { SUBJECTS } from "@/components/reviser/catalog";
import { PIECES_DEFAUT, VITRINE, couleurCss, piecesVues, type VitrineKey } from "@/lib/profil/catalogue";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { nombre, pct } from "@/lib/voice";
import { BLOCS_CHIFFRES as V } from "@/lib/voice-blocs-chiffres";
import { Cellule, Coque, DemiBande, type Ctx } from "./commun";
import s from "./Chiffres.module.css";

// Le bloc « Chiffres clés » (vitrine) : « Une pièce en grand ». La 1re pièce
// que le joueur met en avant remplit la largeur, un trait de pinceau se
// trace dessous, puis les deux autres tiennent sur une ligne (« 12 j de
// série · 82 % en FSA »). Aucune comparaison : chez soi et chez un autre, le
// même dessin (chez un autre, la relève des pièces que le bandeau « Rapport
// de force » montre déjà : lib/profil/catalogue.ts, piecesVues). Aux 5
// formats : mini-tuile, colonne, héros, bande (la pièce à gauche, les deux
// autres à droite) et demi-bande (3 cellules).

/** une pièce des chiffres clés : celles du catalogue (les examens blancs compris) */
export type ClePiece = VitrineKey;
// les pièces d'une vitrine vide et la relève chez un autre : lib/profil/catalogue.ts (le serveur lit les comptes d'après elles)
export { PIECES_DEFAUT, piecesVues };
/** en dessous, un taux de victoire ne dit rien : on montre « 4/6 » */
const DUELS_MIN = 10;

export type Piece = {
  k: ClePiece;
  /** « En FSA » (la cellule de la demi-bande) */
  etiquette: string;
  /** « 82 % » */
  chiffre: string;
  /** ce que le chiffre compte, en toutes lettres : « de victoires en duel » */
  legende: string;
  /** la même légende, plus courte, pour les deux pièces en ligne : « de victoires » */
  court: string;
  /** l'infobulle (« 18 duels gagnés sur 27 ») */
  titre?: string;
};

const taux = (gagnes: number, joues: number) => (joues > 0 ? Math.round((gagnes / joues) * 100) : 0);
/** une maîtrise et son « ≈ » provisoire : « ≈81 % » */
const pctMatiere = (m: { pct: number | null; statut?: string }) => `${m.statut === "provisoire" ? "≈" : ""}${pct(m.pct ?? 0)}`;

/** Une pièce : son étiquette, son chiffre et sa légende. */
export function pieceDe(k: ClePiece, d: DonneesBlocs): Piece {
  const st = d.stats;
  switch (k) {
    case "questions":
      return { k, etiquette: V.questions, chiffre: nombre(st.questions), legende: V.legendeQuestions, court: V.questions.toLowerCase() };
    case "serie":
      return { k, etiquette: V.serie, chiffre: V.jours(st.serie), legende: V.legendeSerie, court: V.legendeSerie };
    case "duels": {
      // un taux de victoire ; trop peu de duels : « 4/6 »
      const assez = st.duelsJoues >= DUELS_MIN;
      if (st.duelsJoues === 0) return { k, etiquette: V.duels, chiffre: "—", legende: V.legendeDuelsAucun, court: V.courtDuelsAucun };
      return {
        k,
        etiquette: V.duels,
        chiffre: assez ? pct(taux(st.duelsGagnes, st.duelsJoues)) : V.fraction(st.duelsGagnes, st.duelsJoues),
        legende: assez ? V.legendeDuels : V.legendeDuelsFraction,
        court: assez ? V.courtDuels : V.legendeDuelsFraction,
        titre: V.detailDuels(st.duelsGagnes, st.duelsJoues),
      };
    }
    case "matiere": {
      const best = [...st.matieres].filter((m) => m.pct !== null && m.answered >= 10).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];
      if (!best) return { k, etiquette: V.meilleure, chiffre: "—", legende: V.legendeMatiereAucune, court: V.courtMatiereAucune };
      const code = SUBJECTS.find((x) => x.key === best.key)?.code ?? best.key;
      return {
        k,
        etiquette: V.enMatiere(code),
        chiffre: pctMatiere(best),
        legende: V.legendeMatiere(code) + (best.statut === "provisoire" ? " · " + V.provisoire : ""),
        court: V.legendeMatiere(code),
      };
    }
    case "defis":
      return { k, etiquette: V.defis, chiffre: nombre(st.defisRendus), legende: V.legendeDefis, court: V.courtDefis };
    case "examens":
      return { k, etiquette: V.examens, chiffre: nombre(st.examensBlancs ?? 0), legende: V.legendeExamens, court: V.legendeExamens };
    case "calculs":
      return { k, etiquette: V.calculs, chiffre: nombre(st.calculsJustes), legende: V.legendeCalculs, court: V.legendeCalculs };
    default:
      return { k, etiquette: VITRINE.find((v) => v.key === k)?.nom ?? String(k), chiffre: "—", legende: "", court: "" };
  }
}

/** La largeur de chaque signe d'un chiffre dans la police des grands chiffres (Dela Gothic One), en em, chiffres tabulaires : tous les chiffres sont aussi larges. */
const LARGEUR: Record<string, number> = { " ": 0.19, "\u00a0": 0.19, "\u202f": 0.19, "%": 0.88, j: 0.31, "/": 0.49, "\u2014": 0.7, "\u2248": 0.54 };
const LARGEUR_CHIFFRE = 0.89;
/** La largeur d'un chiffre en em : le CSS en tire la taille de police qui le fait tenir dans la largeur qui reste (--w). */
export const poidsChiffre = (c: string) => Math.round([...c].reduce((t, x) => t + (/\d/.test(x) ? LARGEUR_CHIFFRE : (LARGEUR[x] ?? 0.9)), 0) * 100) / 100;

/** Le trait de pinceau, qui se trace sous le chiffre (deux passes : le trait plein, puis un filet de poils secs). */
function Pinceau({ couleur }: { couleur: string }) {
  return (
    <svg className={s.pinceau} viewBox="0 0 220 14" aria-hidden focusable="false">
      <path d="M3 9C70 2 150 4 217 8" pathLength={100} style={{ stroke: couleur }} className={s.trait} />
      <path d="M14 12C80 8 150 9 204 12" pathLength={100} style={{ stroke: couleur }} className={s.poils} />
    </svg>
  );
}

/** Le bloc Chiffres clés, à son format. Le même dessin chez soi, chez un autre et en aperçu. */
export function ChiffresBloc({ d, f }: Ctx): React.ReactNode {
  // le bandeau « Rapport de force » est au-dessus chez un autre (et en aperçu) : RapportDeForce
  const cles = piecesVues((d.showcase.length ? d.showcase : PIECES_DEFAUT) as readonly ClePiece[], !d.moi && (!!d.toi || !!d.apercu));
  const pieces = cles.map((k) => pieceDe(k, d));

  if (f === "demi")
    return (
      <DemiBande label={V.chiffres}>
        {pieces.map((p) => (
          <Cellule key={p.k} etiquette={p.etiquette} chiffre={p.chiffre} titre={p.titre} />
        ))}
      </DemiBande>
    );

  const [premiere, ...reste] = pieces;
  if (!premiere) return null;
  // le trait de pinceau : l'accent du joueur, sinon le vermillon du site (l'encre ne se voit pas sous l'encre)
  const accent = couleurCss(d.accent);
  const trait = accent === "var(--ink)" ? "var(--pen)" : accent;

  return (
    <Coque f={f} label={V.chiffres} className={s[f]}>
      <h3 className={"t-eyebrow m-0 " + s.lab}>{V.chiffres}</h3>
      <div className={s.scene}>
        <div className={s.pile} title={premiere.titre}>
          <b className={"t-num tabular-nums " + s.grand} style={{ ["--w" as string]: poidsChiffre(premiere.chiffre) } as React.CSSProperties}>
            {premiere.chiffre}
          </b>
          <Pinceau couleur={trait} />
          <p className={s.legende}>{premiere.legende}</p>
        </div>
        {reste.length > 0 && (
          <ul className={s.autres}>
            {reste.map((p) => (
              <li key={p.k} title={p.titre}>
                <b className={s.val}>{p.chiffre}</b> <span className={s.leg}>{p.court}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Coque>
  );
}
