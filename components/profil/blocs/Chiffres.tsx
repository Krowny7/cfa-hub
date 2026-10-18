import { Hash } from "lucide-react";
import { SUBJECTS } from "@/components/reviser/catalog";
import { PIECES_DEFAUT, VITRINE, piecesVues, type VitrineKey } from "@/lib/profil/catalogue";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { ecart, joursPourRattraper, questionsSur7, score, type Ecart } from "@/lib/profil/ecart";
import { nombre, pct } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_CHIFFRES as V } from "@/lib/voice-blocs-chiffres";
import { Cellule, Chiffre, Coque, DemiBande, Etiquette, Jeton, ScoreTuile, maCouleur, type Ctx } from "./commun";
import s from "./Chiffres.module.css";

// Le bloc « Chiffres clés » (vitrine) : les 3 pièces au plus que le joueur
// met en avant. Chez un autre : son chiffre, ton jeton d'écart (« toi
// −1 692 ») et le score de la tuile (« toi 1 – 2 ») ; le détail passe en
// infobulle. Chez soi : le chiffre et, au plus, une petite ligne. Aux 5
// formats (mini-tuile, colonne, héros, bande, demi-bande). Exporte aussi ce
// que les blocs Questions répondues et Trophées partagent avec lui : le
// double trait en barres, le score visible, le rattrapage des questions.

/** une pièce des chiffres clés : celles du catalogue (les examens blancs compris) */
export type ClePiece = VitrineKey;
// les pièces d'une vitrine vide et la relève chez un autre : lib/profil/catalogue.ts (le serveur lit les comptes d'après elles)
export { PIECES_DEFAUT, piecesVues };
/** en dessous, un taux de victoire ne se compare pas */
const DUELS_MIN = 10;

export type Piece = {
  k: ClePiece;
  etiquette: string;
  chiffre: string;
  /** sa valeur se compare (sinon : ni jeton, ni barre, même en aperçu) */
  comparable: boolean;
  /** l'écart avec toi (null : pas de toi, ou ta valeur manque) */
  e: Ecart | null;
  /** l'infobulle du jeton (deux lignes avec le rattrapage) */
  bulle?: string;
  /** l'infobulle du chiffre quand le jeton manque (« toi : pas encore mesuré ») */
  titre?: string;
  /** chez soi : la petite ligne */
  petit?: string;
  /** le double trait (colonne) : sa valeur et la tienne */
  barre: { lui: number; toi: number } | null;
};

/** La 2e ligne de l'infobulle d'un jeton rouge de questions : « À ton rythme : 54 jours » (rien sans rythme). */
export function rattrapageQuestions(e: Ecart | null, d: DonneesBlocs): string {
  if (!e || e.sens !== "perte" || !d.toi) return "";
  const j = joursPourRattraper(e.delta, questionsSur7(d.toi.jours, d.toi.aujourdhui));
  return j === null ? "" : "\n" + T.rattrapageQuestions(j);
}

const taux = (gagnes: number, joues: number) => (joues > 0 ? Math.round((gagnes / joues) * 100) : 0);
/** une maîtrise et son « ≈ » provisoire : « ≈81 % » */
const pctMatiere = (m: { pct: number | null; statut?: string }) => `${m.statut === "provisoire" ? "≈" : ""}${pct(m.pct ?? 0)}`;

/** Une pièce : son étiquette, son chiffre, l'écart avec toi et ses infobulles, sa petite ligne chez soi. */
export function pieceDe(k: ClePiece, d: DonneesBlocs): Piece {
  const st = d.stats;
  const ts = d.toi?.stats ?? null;
  const nom = d.nom;
  // un compte simple (défis, calculs, examens) : « Défis du jour · Inès 42 · toi 30 »
  const compte = (etiquette: string, lui: number, toi: number | undefined): Piece => {
    const e = ts && toi !== undefined ? ecart(lui, toi, "compte") : null;
    return { k, etiquette, chiffre: nombre(lui), comparable: true, e, bulle: e ? T.bulle(etiquette, nom, nombre(lui), nombre(toi!)) : undefined, barre: e ? { lui, toi: toi! } : null };
  };
  switch (k) {
    case "questions": {
      const e = ts ? ecart(st.questions, ts.questions, "compte") : null;
      const bulle = e && ts ? T.bulle(V.questions, nom, nombre(st.questions), nombre(ts.questions)) + rattrapageQuestions(e, d) : undefined;
      return { k, etiquette: V.questions, chiffre: nombre(st.questions), comparable: true, e, bulle, petit: st.duJour ? V.dontAujourdhui(st.duJour) : undefined, barre: e && ts ? { lui: st.questions, toi: ts.questions } : null };
    }
    case "serie": {
      const e = ts ? ecart(st.serie, ts.serie, "jours") : null;
      const bulle = e && ts ? T.bulle(V.serie, nom, V.joursRecord(st.serie, st.meilleureSerie), V.joursRecord(ts.serie, ts.meilleureSerie)) : undefined;
      return { k, etiquette: V.serie, chiffre: V.jours(st.serie), comparable: true, e, bulle, petit: V.record(st.meilleureSerie), barre: e && ts ? { lui: st.serie, toi: ts.serie } : null };
    }
    case "duels": {
      // un taux de victoire, dans les deux vues ; trop peu de duels : « 4/6 », sans jeton
      const assez = st.duelsJoues >= DUELS_MIN;
      const chiffre = st.duelsJoues === 0 ? "—" : assez ? pct(taux(st.duelsGagnes, st.duelsJoues)) : V.fraction(st.duelsGagnes, st.duelsJoues);
      const toiAssez = !!ts && ts.duelsJoues >= DUELS_MIN;
      const e = assez && toiAssez && ts ? ecart(taux(st.duelsGagnes, st.duelsJoues), taux(ts.duelsGagnes, ts.duelsJoues), "pct") : null;
      return {
        k,
        etiquette: V.duels,
        chiffre,
        comparable: assez,
        e,
        bulle: e && ts ? T.bulle(V.duelsGagnes, nom, V.surTotal(st.duelsGagnes, st.duelsJoues), V.surTotal(ts.duelsGagnes, ts.duelsJoues)) : undefined,
        titre: !e && (d.toi || d.apercu) && !(assez && d.apercu) ? V.tropPeuDuels : undefined,
        petit: assez ? V.surTotal(st.duelsGagnes, st.duelsJoues) : undefined,
        barre: e && ts ? { lui: taux(st.duelsGagnes, st.duelsJoues), toi: taux(ts.duelsGagnes, ts.duelsJoues) } : null,
      };
    }
    case "matiere": {
      const best = [...st.matieres].filter((m) => m.pct !== null && m.answered >= 10).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];
      if (!best) return { k, etiquette: V.meilleure, chiffre: "—", comparable: false, e: null, petit: V.pasMesuree, barre: null };
      const sujet = SUBJECTS.find((x) => x.key === best.key);
      const mien = ts?.matieres.find((m) => m.key === best.key && m.pct !== null) ?? null;
      const e = mien ? ecart(best.pct, mien.pct, "pct") : null;
      return {
        k,
        etiquette: V.enMatiere(sujet?.code ?? best.key),
        chiffre: pctMatiere(best),
        comparable: true,
        e,
        bulle: e && mien ? T.bulle(V.saMeilleure(sujet?.name ?? best.key), nom, pctMatiere(best), pctMatiere(mien)) : undefined,
        titre: d.toi && !e ? T.pasMesure : undefined,
        petit: best.statut === "provisoire" ? V.provisoire : undefined,
        barre: e && mien ? { lui: best.pct ?? 0, toi: mien.pct ?? 0 } : null,
      };
    }
    case "defis":
      return compte(V.defis, st.defisRendus, ts?.defisRendus);
    case "examens":
      return compte(V.examens, st.examensBlancs ?? 0, ts ? (ts.examensBlancs ?? 0) : undefined);
    case "calculs":
      return compte(V.calculs, st.calculsJustes, ts?.calculsJustes);
    default:
      return { k, etiquette: VITRINE.find((v) => v.key === k)?.nom ?? String(k), chiffre: "—", comparable: false, e: null, barre: null };
  }
}

/**
 * Le score d'une tuile, chez un autre seulement, quand elle compare au moins
 * 2 éléments ; en aperçu, « toi – – » dès 2 éléments comparables de son côté.
 */
export function scoreVisible(d: DonneesBlocs, ecarts: (Ecart | null)[], comparables: number): React.ReactNode {
  if (d.moi) return null;
  if (d.toi) {
    const sc = score(ecarts);
    return sc ? <ScoreTuile s={sc} d={d} /> : null;
  }
  return d.apercu && comparables >= 2 ? <ScoreTuile s={null} d={d} /> : null;
}

/**
 * Le double trait en barres : la sienne épaisse à l'encre (6 px), la tienne
 * fine à ta couleur (2 px), proportionnelles à `max` (par défaut, la plus
 * grande des deux). Sans ta valeur : sa barre seule.
 */
export function DoubleBarre({ lui, toi, couleur, max, bulle }: { lui: number; toi: number | null; couleur: string; max?: number; bulle?: string }) {
  const m = Math.max(1, max ?? Math.max(lui, toi ?? 0));
  const part = (v: number) => `${Math.min(100, (Math.max(0, v) / m) * 100).toFixed(1)}%`;
  return (
    <span className={s.barres} title={bulle} aria-hidden>
      <span className={s.barreLui} style={{ width: part(lui) }} />
      {toi !== null && <span className={s.barreToi} style={{ width: part(toi), background: couleur }} />}
    </span>
  );
}

/** Le bloc Chiffres clés, à son format, dans sa vue (chez soi, chez un autre, aperçu). */
export function ChiffresBloc({ d, f }: Ctx): React.ReactNode {
  // le bandeau « Rapport de force » est au-dessus chez un autre (et en aperçu) : RapportDeForce
  const cles = piecesVues((d.showcase.length ? d.showcase : PIECES_DEFAUT) as readonly ClePiece[], !d.moi && (!!d.toi || !!d.apercu));
  const pieces = cles.map((k) => pieceDe(k, d));
  const autre = !d.moi;
  const sc = scoreVisible(
    d,
    pieces.map((p) => p.e),
    pieces.filter((p) => p.comparable).length,
  );
  const jeton = (p: Piece, taille?: number) => (autre && p.comparable ? <Jeton e={p.e} d={d} bulle={p.bulle} taille={taille} /> : null);
  // sous le chiffre : ton jeton chez un autre, la petite ligne chez soi
  const sous = (p: Piece, taille?: number) => (autre ? jeton(p, taille) : p.petit ? <span className={s.petit}>{p.petit}</span> : null);
  const titre = (p: Piece) => (autre ? p.titre : undefined);
  const n = { ["--n" as string]: pieces.length } as React.CSSProperties;

  if (f === "demi")
    return (
      <DemiBande label={V.chiffres} droite={sc ?? undefined}>
        {pieces.map((p) => (
          <Cellule key={p.k} etiquette={p.etiquette} chiffre={p.chiffre} titre={titre(p)} jeton={autre ? jeton(p) : undefined} petit={autre ? undefined : p.petit} />
        ))}
      </DemiBande>
    );

  if (f === "tuile")
    // une ligne par pièce : l'étiquette à gauche, le chiffre et, dessous, le jeton à droite
    return (
      <Coque f={f} label={V.chiffres}>
        <Etiquette f={f} icone={<Hash size={17} aria-hidden />} titre={V.chiffres} droite={sc ?? undefined} />
        <div className={s.lignes}>
          {pieces.map((p) => (
            <div key={p.k} className={s.ligne}>
              <span className={s.nomPiece}>{p.etiquette}</span>
              <span className={s.valeur}>
                <Chiffre f={f} titre={titre(p)}>
                  {p.chiffre}
                </Chiffre>
                {sous(p)}
              </span>
            </div>
          ))}
        </div>
      </Coque>
    );

  if (f === "colonne") {
    // 3 étages séparés de filets : l'étiquette, le chiffre, le jeton, puis le double trait
    const couleur = maCouleur(d);
    return (
      <Coque f={f} label={V.chiffres}>
        <Etiquette f={f} icone={<Hash size={17} aria-hidden />} titre={V.chiffres} droite={sc ?? undefined} />
        <div className={s.etages} style={n}>
          {pieces.map((p) => (
            <div key={p.k} className={s.etage}>
              <span className="t-eyebrow">{p.etiquette}</span>
              <Chiffre f={f} titre={titre(p)}>
                {p.chiffre}
              </Chiffre>
              {sous(p, 16)}
              {autre && p.barre && <DoubleBarre lui={p.barre.lui} toi={p.barre.toi} couleur={couleur} bulle={T.doubleTrait(d.nom)} />}
            </div>
          ))}
        </div>
      </Coque>
    );
  }

  if (f === "heros")
    // 3 cases séparées de filets, le jeton sous le chiffre ; le score en haut à droite
    return (
      <Coque f={f} label={V.chiffres}>
        {sc && <div className={s.haut}>{sc}</div>}
        <div className={s.cases} style={n}>
          {pieces.map((p) => (
            <div key={p.k} className={s.case}>
              <span className="t-eyebrow">{p.etiquette}</span>
              <Chiffre f={f} titre={titre(p)}>
                {p.chiffre}
              </Chiffre>
              {sous(p, 16)}
            </div>
          ))}
        </div>
      </Coque>
    );

  // bande : 3 cases, le jeton à droite du chiffre sur la même ligne de base ; le score dans une 4e cellule étroite
  return (
    <Coque f={f} label={V.chiffres}>
      <div className={s.cases + (sc ? " " + s.avecScore : "")} style={n}>
        {pieces.map((p) => (
          <div key={p.k} className={s.case}>
            <span className="t-eyebrow">{p.etiquette}</span>
            <span className={s.ligneBase}>
              <Chiffre f={f} titre={titre(p)}>
                {p.chiffre}
              </Chiffre>
              {sous(p, 16)}
            </span>
          </div>
        ))}
        {sc && <div className={s.caseScore}>{sc}</div>}
      </div>
    </Coque>
  );
}
