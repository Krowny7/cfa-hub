import Link from "next/link";
import s from "./Decors.module.css";

// Les petits décors de la colonne grise du cadre à zones (CadreZones) : un chiffre, une courte liste,
// un mini mur épinglé, une platine. Sans texte superflu ; un décor cliquable mène quelque part.
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

/** Un petit mur où des feuilles sont épinglées (les one-pagers) : mène à leur page. */
export function MurMini({ images, href, aide }: { images: string[]; href: string; aide: string }) {
  return (
    <Link href={href} className={s.mur} aria-label={aide} title={aide}>
      {images.slice(0, 4).map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src + i} src={src} alt="" loading="lazy" decoding="async" className={s.feuille} />
      ))}
    </Link>
  );
}

/** Une platine (l'audio des cours) : un disque qui tourne au survol, mène à l'écoute. */
export function Platine({ href, aide, titre }: { href: string; aide: string; titre?: React.ReactNode }) {
  return (
    <Link href={href} className={s.platine} aria-label={aide} title={aide}>
      <span className={s.disque} aria-hidden>
        <span className={s.etiquette} />
      </span>
      <span className={s.bras} aria-hidden />
      {titre && <span className={s.platineTitre}>{titre}</span>}
    </Link>
  );
}
