"use client";

import s from "./CasFsa.module.css";

/**
 * Le contrôle segmenté du site, sur toute la largeur de son bloc. Les colonnes sont égales :
 * l'indicateur se place en pourcentage, sans mesure, car le dossier peut être masqué au téléphone.
 */
export function Onglets<T extends string>({
  onglets,
  actif,
  onChange,
  libelle,
  className = "",
}: {
  onglets: { cle: T; nom: string }[];
  actif: T;
  onChange: (cle: T) => void;
  libelle: string;
  className?: string;
}) {
  const n = onglets.length;
  const ix = onglets.findIndex((o) => o.cle === actif);
  return (
    <div role="tablist" aria-label={libelle} className={"seg " + s.onglets + " " + className}>
      <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + (100% - 8px) * ${ix / n})`, width: `calc((100% - 8px) / ${n})` }} />
      {onglets.map((o, i) => (
        <button key={o.cle} type="button" role="tab" aria-selected={i === ix} onClick={() => onChange(o.cle)} className="seg-item">
          {o.nom}
        </button>
      ))}
    </div>
  );
}
