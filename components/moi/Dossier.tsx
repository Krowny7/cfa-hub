"use client";

import { useEffect } from "react";
import s from "./Dossier.module.css";

// Le gabarit « Dossier » des sous-pages de Moi (direction du 2026-11-13, « le lieu, puis l'objet ») :
// sous la porte (son chiffre-héros), une seule colonne de papier, ouverte par un double filet ; chaque
// partie se nomme par une étiquette Mono dans la marge, sous un filet ; les chiffres s'alignent comme un
// relevé ; le détail attend derrière un repli. Pas de cadre, pas de bande noire, pas de colonne grise.
// La couleur de l'espace (jade : --pal-3 ; --pal-2 est l'améthyste, triée par luminance) ne sert qu'aux chiffres et à
// l'état ouvert d'un repli ; la nuit, éclaircie.

/** La colonne du dossier ; `plat` : les cartes des réglages posées à plat (sans fond ni ombre), entre les filets. */
export function Dossier({ children, plat = false, className }: { children: React.ReactNode; plat?: boolean; className?: string }) {
  return (
    <div className={[s.dossier, plat ? s.plat : "", className].filter(Boolean).join(" ")}>
      <OuvrirParAncre />
      {children}
    </div>
  );
}

/** Une partie du dossier : un filet, l'étiquette dans la marge (au-dessus sur téléphone), le contenu. */
export function Filet({ etiquette, droite, id, children }: { etiquette?: React.ReactNode; droite?: React.ReactNode; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={s.filet} aria-label={typeof etiquette === "string" ? etiquette : undefined}>
      {etiquette || droite ? (
        <div className={s.marge}>
          {etiquette && <h2 className={s.etiquette}>{etiquette}</h2>}
          {droite}
        </div>
      ) : (
        <span aria-hidden />
      )}
      <div className={s.corps}>{children}</div>
    </section>
  );
}

export type CaseReleve = { valeur: React.ReactNode; legende: React.ReactNode; titre?: string };

/** Le relevé : des chiffres alignés, séparés par des filets verticaux (un résumé, jamais une répétition du chiffre-héros). */
export function Releve({ items }: { items: CaseReleve[] }) {
  if (!items.length) return null;
  return (
    <dl className={s.releve}>
      {items.map((it, i) => (
        <div key={i} className={s.case} title={it.titre}>
          <dt className={s.legende}>{it.legende}</dt>
          <dd className={s.valeur}>{it.valeur}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Un repli : la ligne sous son filet (étiquette, compte, « + »), le détail derrière. `id` : l'ancre
 * (un lien « …#sons » l'ouvre tout seul, OuvrirParAncre).
 */
export function Repli({ titre, compte, id, ouvert = false, children }: { titre: React.ReactNode; compte?: React.ReactNode; id?: string; ouvert?: boolean; children: React.ReactNode }) {
  return (
    <details id={id} className={s.repli} open={ouvert || undefined}>
      <summary className={s.repliTete}>
        <span className={s.repliTitre}>{titre}</span>
        {compte !== undefined && compte !== null && <span className={s.repliCompte}>{compte}</span>}
        <span className={s.plus} aria-hidden />
      </summary>
      <div className={s.repliCorps}>{children}</div>
    </details>
  );
}

/** Une ancre (…#sons, #date, #objectif) dans un repli fermé : le repli s'ouvre et la page vient à elle. Lu après l'hydratation. */
function OuvrirParAncre() {
  useEffect(() => {
    const ouvrir = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      let p: HTMLElement | null = el;
      let change = false;
      while (p) {
        if (p instanceof HTMLDetailsElement && !p.open) {
          p.open = true;
          change = true;
        }
        p = p.parentElement;
      }
      if (change) el.scrollIntoView({ block: "start" });
    };
    ouvrir();
    window.addEventListener("hashchange", ouvrir);
    return () => window.removeEventListener("hashchange", ouvrir);
  }, []);
  return null;
}
