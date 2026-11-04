"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import type { CasFsa, EtatFinancier, Extrait } from "@/lib/cas-fsa/types";
import { CAS, anneesDe, cellule } from "@/lib/voice-cas-fsa";
import { Onglets } from "./Onglets";
import s from "./CasFsa.module.css";

// Le dossier du cas : les trois états financiers et les extraits du document, consultables à
// tout moment à côté des questions. Le tableau défile dans son cadre, jamais la page.

type Onglet = "resultat" | "bilan" | "flux" | "extraits";

const ONGLETS: { cle: Onglet; nom: string }[] = [
  { cle: "resultat", nom: CAS.onglets.resultat },
  { cle: "bilan", nom: CAS.onglets.bilan },
  { cle: "flux", nom: CAS.onglets.flux },
  { cle: "extraits", nom: CAS.onglets.extraits },
];

function Tableau({ etat, annees }: { etat: EtatFinancier; annees: { n: string; n1: string } }) {
  return (
    <>
      <p className={s.etatTete}>
        <b lang="en">{etat.titre}</b>
        <span>{etat.unite}</span>
      </p>
      <div className={s.tableCadre} role="region" aria-label={etat.titre} tabIndex={0}>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">{CAS.ligne}</span>
              </th>
              <th scope="col">{annees.n}</th>
              <th scope="col">{annees.n1}</th>
            </tr>
          </thead>
          <tbody>
            {etat.lignes.map((l, i) =>
              l.n === null && l.n1 === null ? (
                <tr key={i} className={s.ligneTitre}>
                  <th scope="colgroup" colSpan={3} lang="en">
                    {l.libelle}
                  </th>
                </tr>
              ) : (
                <tr key={i} className={l.total ? s.ligneTotal : undefined}>
                  <th scope="row" lang="en" data-niveau={l.niveau || undefined}>
                    {l.libelle}
                  </th>
                  <td>{cellule(l.n)}</td>
                  <td>{cellule(l.n1)}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Extraits({ extraits }: { extraits: Extrait[] }) {
  return (
    <ul className={s.extraits}>
      {extraits.map((e) => (
        <li key={e.id}>
          <h3 className={s.extraitTitre}>{e.titre}</h3>
          <blockquote className={s.extraitTexte} lang="en">
            {e.texte}
          </blockquote>
          <p className={s.extraitOu}>{e.ou}</p>
        </li>
      ))}
    </ul>
  );
}

export function Etats({ cas }: { cas: CasFsa }) {
  const [onglet, setOnglet] = useState<Onglet>("resultat");
  return (
    <section className={s.etats} aria-label={CAS.etatsLibelle}>
      <Onglets onglets={ONGLETS} actif={onglet} onChange={setOnglet} libelle={CAS.etatsOnglets} />
      <div className={s.panneau} role="tabpanel">
        {onglet === "extraits" ? <Extraits extraits={cas.extraits} /> : <Tableau etat={cas.etats[onglet]} annees={anneesDe(cas.exercice)} />}
      </div>
      <a href={cas.source.url} target="_blank" rel="noopener noreferrer" className={s.document} title={cas.source.titre}>
        <ExternalLink size={14} aria-hidden /> {CAS.document}
      </a>
    </section>
  );
}
