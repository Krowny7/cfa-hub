import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import n from "./neuves.module.css";

// Ce que partagent les sept tuiles de plus (Duels, Jour J, Matière phare,
// Classement, Examens blancs, Codex, Rythme) : la tête (l'étiquette discrète
// et son repère), la mention « Visible par » de Personnaliser, la part en %
// et le poids d'un chiffre (le CSS en tire la taille qui remplit la largeur).
// Sans état : rendus au serveur comme au client.

/** La largeur d'un chiffre en « chiffres » (une espace, un « % » ou un « h » ne pèsent pas autant) : le CSS en tire la taille qui remplit la largeur. */
const LARGEUR: Record<string, number> = { " ": 0.45, " ": 0.45, " ": 0.45, "%": 1.15, "/": 0.55, "-": 0.6, j: 0.8, J: 0.85, h: 0.9, e: 0.85, r: 0.8, "≈": 0.9 };
export const poids = (c: string) => Math.round([...c].reduce((t, x) => t + (LARGEUR[x] ?? 1), 0) * 100) / 100;

/** Une variable CSS dans un style (--p, --w, --i…). */
export const vars = (o: Record<string, string | number>) => o as React.CSSProperties;

/** La part de `j` sur `t`, en %, entière : 0 et 100 ne tombent qu'aux bornes exactes (comme pctScore). */
export function part(j: number, t: number): number {
  if (!(t > 0)) return 0;
  const x = Math.max(0, Math.min(t, j));
  return x === 0 ? 0 : x === t ? 100 : Math.min(99, Math.max(1, Math.round((x / t) * 100)));
}

/** La tête d'une tuile : l'étiquette discrète (le titre de la tuile) et, à droite, un repère. */
export function Tete({ titre, repere, id }: { titre: string; repere?: React.ReactNode; id?: string }) {
  return (
    <div className={n.tete}>
      <h3 id={id} className={"t-eyebrow m-0 " + n.lab}>
        {titre}
      </h3>
      {repere ? <span className={n.repere}>{repere}</span> : null}
    </div>
  );
}

/** Personnaliser : qui voit cette tuile (elle suit la visibilité du Journal). Rien ailleurs. */
export function Mention({ d, edition, texte }: { d: DonneesBlocs; edition: boolean; texte?: string }) {
  return edition ? <p className={"t-micro m-0 " + n.mention}>{texte ?? T.visiblePar(d.visibiliteJournal)}</p> : null;
}

/** La même mention, à droite d'une demi-bande. */
export const mentionDemi = (d: DonneesBlocs, edition: boolean): React.ReactNode => (edition ? <span className="t-micro">{T.visiblePar(d.visibiliteJournal)}</span> : undefined);
