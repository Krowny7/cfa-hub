import Link from "next/link";
import s from "./Decors.module.css";

// Les petits décors de la colonne grise du cadre à zones (CadreZones) : un chiffre, une courte liste,
// et, depuis 2026-11-13, plus de mini mur ni de platine (le mur et la platine vivent dans les rayons de Réviser B). Sans texte superflu ; un décor cliquable mène quelque part.
// Composants serveur (sans état).

/** Un seul chiffre, en grand, et sa légende. */
export function Chiffre({ valeur, legende, href }: { valeur: React.ReactNode; legende: React.ReactNode; href?: string }) {
  const corps = (
    <>
      <b className={s.valeur}>{valeur}</b>
      <span className={s.legende}>{legende}</span>
    </>
  );
  return href ? (
    <Link href={href} className={s.chiffre + " " + s.cliquable}>
      {corps}
    </Link>
  ) : (
    <div className={s.chiffre}>{corps}</div>
  );
}

export type Ligne = { cle: string; titre: React.ReactNode; detail?: React.ReactNode; href?: string; marque?: boolean };

/** Une courte liste (5 lignes au plus), chaque ligne cliquable si elle a un lien. */
export function ListeCourte({ lignes, vide }: { lignes: Ligne[]; vide?: React.ReactNode }) {
  if (!lignes.length) return vide ? <p className={s.vide}>{vide}</p> : null;
  return (
    <ol className={s.liste}>
      {lignes.slice(0, 5).map((l) => {
        const corps = (
          <>
            <span className={s.ligneTitre}>{l.titre}</span>
            {l.detail != null && <span className={s.ligneDetail}>{l.detail}</span>}
          </>
        );
        return (
          <li key={l.cle} data-marque={l.marque ? "1" : undefined}>
            {l.href ? (
              <Link href={l.href} className={s.ligne + " " + s.cliquable}>
                {corps}
              </Link>
            ) : (
              <div className={s.ligne}>{corps}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

