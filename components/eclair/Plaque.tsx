import { Check, X } from "lucide-react";
import { ArcCoin } from "@/components/ui/ArcCoin";
import css from "./Plaque.module.css";

// L'objet-héros des séries éclair (direction « le lieu, puis l'objet », 2026-11-13) : une plaque
// d'ébène biseautée, comme un écran de départ de jeu. Au départ : ma précision sur les 20 dernières
// en Dela (sinon le numéro de la série), les cinq cases à remplir. Au bilan : le score en Dela et
// son pourcentage, les cinq cases remplies (juste, rature), le verdict en tampon, le temps, l'XP et
// le combo en Mono. Couleurs fixes, de jour comme de nuit (liseré clair la nuit). Sans état.
// Sur son coin bas droit, l'arc électrique des 5 du jour (ArcCoin, même palier, même courant : Théo veut cet
// effet pour tous les éclairs, 2026-11-13).

export type CaseEclair = "ok" | "ko" | "vide";

export function Plaque({
  haut,
  chiffre,
  legende,
  cases,
  pied,
  tampon,
}: {
  /** en haut à gauche, en Mono (« SÉRIE ÉCLAIR · 4E DU JOUR ») */
  haut?: React.ReactNode;
  /** le chiffre en Dela (« 78 % », « 4/5 ») */
  chiffre: React.ReactNode;
  /** à côté du chiffre, en Mono */
  legende: React.ReactNode;
  cases: CaseEclair[];
  /** sous les cases, en Mono */
  pied?: React.ReactNode;
  /** le verdict, tamponné en haut à droite (« TRAIT TENU ») */
  tampon?: React.ReactNode;
}) {
  return (
    <div className={css.plaque} data-tampon={tampon ? "1" : undefined}>
      <ArcCoin palier={3} />
      {haut && (
        <p className={css.haut}>
          <span>{haut}</span>
        </p>
      )}
      {tampon && <span className={css.tampon}>{tampon}</span>}
      <p className={css.chiffre}>
        <b>{chiffre}</b>
        <span>{legende}</span>
      </p>
      <ol className={css.cases} aria-hidden>
        {cases.map((c, i) => (
          <li key={i} data-etat={c} style={{ ["--i" as string]: i }}>
            {c === "ok" ? <Check size={18} strokeWidth={2.8} /> : c === "ko" ? <X size={18} strokeWidth={2.8} /> : null}
          </li>
        ))}
      </ol>
      {pied && <p className={css.pied}>{pied}</p>}
    </div>
  );
}
