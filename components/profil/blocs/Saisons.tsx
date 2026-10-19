import { useId } from "react";
import { Hexagon } from "lucide-react";
import { hrefOnglet } from "@/lib/profil/onglets";
import { nomPalier, type PalierSaison, type Saisons } from "@/lib/profil/saisons";
import { TIERS } from "@/lib/ranks";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import type { Format } from "@/lib/profil/disposition";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { BLOCS_RADAR as R } from "@/lib/voice-blocs-radar";
import { SAISONS } from "@/lib/voice-saisons";
import { Cellule, Coque, DemiBande, Etiquette, Lien, Repere, Vide, type Ctx } from "./commun";
import sa from "./saisons.module.css";

// Le bloc « Saisons » (spec des tuiles : « Écussons »). Le même dessin chez
// soi et chez un autre : un écusson hexagonal par saison (les gravées du
// palmarès, puis la saison en cours), aux couleurs du métal de son palier
// (TIERS[palier].metal), la division au centre ; dessous le numéro et le
// palier (« S2 · Diamant III ») et la place (« 5e / 212 ») ; la saison en
// cours respire doucement. Du plus ancien au plus récent. Mini-tuile : trois
// écussons au plus. Pas de comparaison. Chez soi, en plus : le lien « Tes
// saisons » en mini-tuile. Sans état.

const icone = <Hexagon size={17} aria-hidden />;

/** Un écusson hexagonal : le métal du palier en dégradé, un filet intérieur, la division au centre. `null` : pas classée (pointillés). */
function Ecusson({ pic, grand = true }: { pic: PalierSaison | null; grand?: boolean }) {
  const id = "ecu" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const metal = pic ? (TIERS[pic.palier] ?? TIERS[0]).metal : null;
  const division = pic ? (pic.division ?? "10") : "—";
  return (
    <svg viewBox="0 0 62 70" className={sa.hex} aria-hidden focusable="false" style={metal ? { ["--m1" as string]: metal[0], ["--m2" as string]: metal[1], ["--m3" as string]: metal[2] } : undefined}>
      {metal ? (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--m1)" />
              <stop offset="1" stopColor="var(--m2)" />
            </linearGradient>
          </defs>
          <polygon points="31,2 59,18 59,52 31,68 3,52 3,18" fill={`url(#${id})`} stroke="var(--m3)" strokeWidth={2.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {/* la facette du haut, plus claire */}
          <polygon points="31,2 59,18 31,34 3,18" fill="#fff" fillOpacity={0.2} />
          <polygon points="31,11 51,23 51,47 31,59 11,47 11,23" fill="none" stroke="var(--m3)" strokeOpacity={0.45} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        </>
      ) : (
        <polygon points="31,2 59,18 59,52 31,68 3,52 3,18" fill="none" stroke="var(--ink-3)" strokeWidth={1.6} strokeDasharray="4 4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      )}
      {grand && (
        <text x="31" y="41" textAnchor="middle" className={sa.division} fill={metal ? "var(--m3)" : "var(--ink-3)"} fontSize={division.length > 2 ? 15 : division.length === 2 ? 18 : 21}>
          {division}
        </text>
      )}
    </svg>
  );
}

/** Une saison à montrer : une gravée du palmarès ou la saison en cours (du plus ancien au plus récent). */
type Ecu = {
  cle: string;
  numero: number;
  pic: PalierSaison | null;
  /** « S2 · Diamant III » */
  nom: string;
  /** « 5e / 212 », « en cours » */
  place: string;
  enCours: boolean;
  bulle: string;
};

function ecussons(s: Saisons): Ecu[] {
  const { courante: c, palmares } = s;
  const gravees: Ecu[] = [...palmares]
    .sort((x, y) => x.numero - y.numero)
    .map((r) => ({
      cle: r.cle,
      numero: r.numero,
      pic: r.pic,
      nom: `${SAISONS.court(r.numero)} · ${nomPalier(r.pic)}`,
      place: R.placeSur(r.place, r.joueurs),
      enCours: false,
      bulle: R.bulleGravee(SAISONS.court(r.numero), nomPalier(r.pic), r.place, r.joueurs),
    }));
  if (!c) return gravees;
  const pic = c.moi?.pic ?? null;
  return [
    ...gravees.filter((g) => g.cle !== c.cle),
    {
      cle: c.cle,
      numero: c.numero,
      pic,
      nom: `${SAISONS.court(c.numero)} · ${pic ? nomPalier(pic) : R.pasClassee}`,
      place: SAISONS.enCours,
      enCours: true,
      bulle: R.bulleCourante(SAISONS.saison(c.numero, c.nom), pic ? nomPalier(pic) : null),
    },
  ];
}

/** Les écussons d'un format : au plus `n`, les plus récents, du plus ancien au plus récent. */
function Rangee({ liste, n, classe, taille, grand = true, court = false }: { liste: Ecu[]; n: number; classe: string; taille: number; grand?: boolean; court?: boolean }) {
  const montres = liste.slice(-n);
  return (
    <ul className={classe} aria-label={SAISONS.palmares} style={{ ["--w" as string]: `${taille}px` }}>
      {montres.map((e, i) => (
        <li key={e.cle} className={sa.ecu + (e.enCours ? " " + sa.cours : "")} style={{ ["--k" as string]: i }} title={e.bulle}>
          <Ecusson pic={e.pic} grand={grand} />
          <b className={sa.nom}>{court ? SAISONS.court(e.numero) : e.nom}</b>
          <span className={sa.place}>{e.place}</span>
        </li>
      ))}
    </ul>
  );
}

export function SaisonsBloc({ d, f, edition }: Ctx): React.ReactNode {
  const s = d.saisons;
  if (!s || (!s.courante && s.palmares.length === 0)) return edition ? <Vide bloc={{ k: "saisons", f }} f={f} icone={icone} /> : null;
  return saisonsDe(d, s, f);
}

function saisonsDe(d: DonneesBlocs, s: Saisons, f: Format): React.ReactNode {
  const { courante: c, palmares } = s;
  const liste = ecussons(s);
  const moi = d.moi;
  const lien = hrefOnglet(d.id, "sceaux");

  // demi-bande : « Saison 3 » / le palier / « pic 1 502 », puis les écussons en petit
  if (f === "demi") {
    const titre = c ? R.saison(c.numero) : T.saisons;
    return (
      <DemiBande label={titre} dessin={liste.length > 0 ? <Rangee liste={liste} n={8} classe={sa.demiRangee} taille={32} grand={false} court /> : undefined}>
        <Cellule
          etiquette={<span title={c ? SAISONS.saison(c.numero, c.nom) : undefined}>{titre}</span>}
          chiffre={c?.moi ? nomPalier(c.moi.pic) : <span className={sa.pasClassee}>{c ? R.pasClassee : "—"}</span>}
          petit={c?.moi ? R.picElo(c.moi.eloPic) : c ? R.sansPic : undefined}
        />
      </DemiBande>
    );
  }

  const etiquette = <Etiquette f={f} icone={icone} titre={T.saisons} droite={palmares.length > 0 ? <Repere>{T.gravees(palmares.length)}</Repere> : undefined} />;
  const nomLien = moi ? T.tesSaisons : T.sesSaisons;

  // colonne : deux écussons par rangée, six au plus, au milieu de la hauteur
  if (f === "colonne")
    return (
      <Coque f={f} label={T.saisons}>
        {etiquette}
        <div className={sa.milieu}>
          <Rangee liste={liste} n={6} classe={sa.grille} taille={70} />
        </div>
        <Lien href={lien}>{nomLien}</Lien>
      </Coque>
    );

  // bande (et héros, si on le lui donne) : tous en ligne, huit au plus
  if (f === "bande" || f === "heros")
    return (
      <Coque f={f} label={T.saisons}>
        {etiquette}
        <div className={sa.milieu}>
          <Rangee liste={liste} n={8} classe={sa.ligne} taille={78} />
        </div>
        <Lien href={lien}>{nomLien}</Lien>
      </Coque>
    );

  // mini-tuile : trois écussons au plus, en bas
  return (
    <Coque f={f} label={T.saisons}>
      {etiquette}
      <div className={sa.bas}>
        <Rangee liste={liste} n={3} classe={sa.trio} taille={60} />
        {moi && <Lien href={lien}>{nomLien}</Lien>}
      </div>
    </Coque>
  );
}
