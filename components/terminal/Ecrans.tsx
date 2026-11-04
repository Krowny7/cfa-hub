"use client";

import { TERMINAL as T } from "@/lib/voice-terminal";
import { CODES, type Ecran } from "./commandes";
import { COURBE, INDICES, VALEURS, bpa, capi, croissance, dec, ebitda, ecartPb, margeEbit, per, signe, valeurDe, veEbitda, type Compte, type Valeur } from "./donnees";
import { Graphique } from "./Graphique";
import s from "./Terminal.module.css";

// Les écrans du Terminal. Chaque code de valeur ou de commande affiché est un bouton : il fait
// ce que ferait la même commande tapée.

type Lancer = (commande: string) => void;

function Titre({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <div className={s.titre}>
      <h2>
        <span className={s.codeEcran}>{code}</span> {children}
      </h2>
      <span className={s.ecranFictif}>{T.ecranFictif}</span>
    </div>
  );
}

/** Le code d'une valeur ou d'une commande : un lien vers son écran. */
function Lien({ commande, children, onLancer }: { commande: string; children: React.ReactNode; onLancer: Lancer }) {
  return (
    <button type="button" className={s.lien} onClick={() => onLancer(commande)}>
      {children}
    </button>
  );
}

/** Une variation : le signe la dit, la couleur la souligne. */
function Variation({ v, unite }: { v: number; unite: string }) {
  return (
    <span className={v > 0 ? s.hausse : v < 0 ? s.baisse : undefined}>
      {signe(v)} {unite}
    </span>
  );
}

function Aide({ onLancer }: { onLancer: Lancer }) {
  return (
    <>
      <Titre code="AIDE">{T.aideTitre}</Titre>
      <dl className={s.commandes}>
        {CODES.map((c) => (
          <div key={c}>
            <dt>
              <Lien commande={c} onLancer={onLancer}>
                {c}
              </Lien>
            </dt>
            <dd>{T.descriptions[c]}</dd>
          </div>
        ))}
        <div>
          <dt>
            <Lien commande={T.exoCommande} onLancer={onLancer}>
              {T.exoCommande}
            </Lien>
          </dt>
          <dd>{T.exoDescription}</dd>
        </div>
      </dl>
      <h3 className={s.sousTitre}>{T.aideValeurs}</h3>
      <dl className={s.commandes}>
        {VALEURS.map((v) => (
          <div key={v.code}>
            <dt>
              <Lien commande={`FICHE ${v.code}`} onLancer={onLancer}>
                {v.code}
              </Lien>
            </dt>
            <dd>{v.nom}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function Marches({ onLancer }: { onLancer: Lancer }) {
  const taux = COURBE.filter((c) => ["2 ans", "10 ans", "30 ans"].includes(c.maturite));
  return (
    <>
      <Titre code="MARCHES">{T.marchesTitre}</Titre>
      <div className={s.blocs}>
        <section>
          <h3 className={s.sousTitre}>{T.indices}</h3>
          <div className={s.defile}>
            <table className={s.grille}>
              <thead>
                <tr>
                  <th scope="col">{T.colonnes.nom}</th>
                  <th scope="col">{T.colonnes.niveau}</th>
                  <th scope="col">{T.colonnes.variation}</th>
                </tr>
              </thead>
              <tbody>
                {INDICES.map((i) => (
                  <tr key={i.nom}>
                    <th scope="row">{i.nom}</th>
                    <td>{dec(i.niveau, 1)}</td>
                    <td>
                      <Variation v={i.variation} unite="%" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h3 className={s.sousTitre}>{T.taux}</h3>
          <div className={s.defile}>
            <table className={s.grille}>
              <thead>
                <tr>
                  <th scope="col">{T.colonnes.maturite}</th>
                  <th scope="col">{T.colonnes.taux}</th>
                  <th scope="col">{T.colonnes.ecart}</th>
                </tr>
              </thead>
              <tbody>
                {taux.map((c) => (
                  <tr key={c.maturite}>
                    <th scope="row">{c.maturite}</th>
                    <td>{dec(c.taux)} %</td>
                    <td>{signe(ecartPb(c.taux, c.avant), 0)} {T.pb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <h3 className={s.sousTitre}>{T.valeurs}</h3>
      <div className={s.defile}>
        <table className={s.grille}>
          <thead>
            <tr>
              <th scope="col">{T.colonnes.valeur}</th>
              <th scope="col" className={s.gauche}>
                {T.colonnes.nom}
              </th>
              <th scope="col">{T.colonnes.cours}</th>
              <th scope="col">{T.colonnes.variation}</th>
            </tr>
          </thead>
          <tbody>
            {VALEURS.map((v) => (
              <tr key={v.code}>
                <th scope="row">
                  <Lien commande={`FICHE ${v.code}`} onLancer={onLancer}>
                    {v.code}
                  </Lien>
                </th>
                <td className={s.gauche}>{v.nom}</td>
                <td>{dec(v.cours)}</td>
                <td>
                  <Variation v={v.variation} unite="%" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Fiche({ v, onLancer }: { v: Valeur; onLancer: Lancer }) {
  const histoire = v.historique.map((y, i, tout) => ({ x: i === tout.length - 1 ? "M" : `M-${tout.length - 1 - i}`, y }));
  const chiffres: [string, string][] = [
    [T.fiche.capi, `${dec(capi(v), 0)} ${T.millions}`],
    [T.fiche.actions, `${dec(v.actions, 0)} ${T.millions}`],
    [T.fiche.bpa, dec(bpa(v))],
    [T.fiche.dividende, dec(v.dividende)],
    [T.fiche.detteNette, `${dec(v.detteNette, 0)} ${T.millions}`],
    [T.fiche.ebitda, `${dec(ebitda(v), 0)} ${T.millions}`],
  ];
  return (
    <>
      <Titre code={`FICHE ${v.code}`}>{v.nom}</Titre>
      <p className={s.cours}>
        <b>{dec(v.cours)}</b> <Variation v={v.variation} unite="%" /> <span className={s.doux}>{v.secteur}</span>
      </p>
      <Graphique points={histoire} format={(y) => dec(y)} libelle={T.coursSur12Mois(v.nom, dec(v.historique[0]), dec(v.cours))} />
      <dl className={s.chiffres}>
        {chiffres.map(([nom, valeur]) => (
          <div key={nom}>
            <dt>{nom}</dt>
            <dd>{valeur}</dd>
          </div>
        ))}
      </dl>
      <p className={s.renvoi}>
        <Lien commande={`ETATS ${v.code}`} onLancer={onLancer}>
          ETATS {v.code}
        </Lien>
      </p>
    </>
  );
}

const LIGNES_COMPTES: { cle: keyof Omit<Compte, "annee">; nom: string }[] = [
  { cle: "ca", nom: T.lignes.ca },
  { cle: "ebitda", nom: T.lignes.ebitda },
  { cle: "ebit", nom: T.lignes.ebit },
  { cle: "rn", nom: T.lignes.rn },
  { cle: "fcf", nom: T.lignes.fcf },
];

function Etats({ v, onLancer }: { v: Valeur; onLancer: Lancer }) {
  return (
    <>
      <Titre code={`ETATS ${v.code}`}>{v.nom}</Titre>
      <h3 className={s.sousTitre}>{T.etatsTitre}</h3>
      <div className={s.defile}>
        <table className={s.grille}>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">{T.colonnes.nom}</span>
              </th>
              {v.comptes.map((c) => (
                <th key={c.annee} scope="col">
                  {c.annee}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LIGNES_COMPTES.map((l) => (
              <tr key={l.cle}>
                <th scope="row">{l.nom}</th>
                {v.comptes.map((c) => (
                  <td key={c.annee}>{dec(c[l.cle], 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={s.renvoi}>
        <Lien commande={`FICHE ${v.code}`} onLancer={onLancer}>
          FICHE {v.code}
        </Lien>
      </p>
    </>
  );
}

function Comparer({ onLancer }: { onLancer: Lancer }) {
  const c = T.colonnes;
  return (
    <>
      <Titre code="COMPARER">{T.comparerTitre}</Titre>
      <div className={s.defile}>
        <table className={s.grille}>
          <thead>
            <tr>
              <th scope="col">{c.valeur}</th>
              <th scope="col" className={s.gauche}>
                {c.secteur}
              </th>
              <th scope="col">{c.capi}</th>
              <th scope="col">{c.per}</th>
              <th scope="col">{c.veEbitda}</th>
              <th scope="col">{c.marge}</th>
              <th scope="col">{c.croissance}</th>
            </tr>
          </thead>
          <tbody>
            {VALEURS.map((v) => (
              <tr key={v.code}>
                <th scope="row">
                  <Lien commande={`FICHE ${v.code}`} onLancer={onLancer}>
                    {v.code}
                  </Lien>
                </th>
                <td className={s.gauche}>{v.secteur}</td>
                <td>{dec(capi(v), 0)}</td>
                <td>{dec(per(v), 1)}x</td>
                <td>{dec(veEbitda(v), 1)}x</td>
                <td>{dec(margeEbit(v), 1)} %</td>
                <td>{signe(croissance(v), 1)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Courbe() {
  const premier = COURBE[0];
  const dernier = COURBE[COURBE.length - 1];
  return (
    <>
      <Titre code="COURBE">{T.courbeTitre}</Titre>
      <Graphique points={COURBE.map((c) => ({ x: c.maturite, y: c.taux }))} format={(y) => `${dec(y)} %`} libelle={T.courbeLibelle(`${dec(premier.taux)} %`, `${dec(dernier.taux)} %`)} />
      <div className={s.defile}>
        <table className={s.grille}>
          <thead>
            <tr>
              <th scope="col">{T.colonnes.maturite}</th>
              <th scope="col">{T.colonnes.taux}</th>
              <th scope="col">{T.colonnes.ilYaUnMois}</th>
              <th scope="col">{T.colonnes.ecart}</th>
            </tr>
          </thead>
          <tbody>
            {COURBE.map((c) => (
              <tr key={c.maturite}>
                <th scope="row">{c.maturite}</th>
                <td>{dec(c.taux)} %</td>
                <td>{dec(c.avant)} %</td>
                <td>{signe(ecartPb(c.taux, c.avant), 0)} {T.pb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function EcranActif({ ecran, onLancer }: { ecran: Ecran; onLancer: Lancer }) {
  if ("valeur" in ecran) {
    const v = valeurDe(ecran.valeur);
    return ecran.code === "FICHE" ? <Fiche v={v} onLancer={onLancer} /> : <Etats v={v} onLancer={onLancer} />;
  }
  if (ecran.code === "MARCHES") return <Marches onLancer={onLancer} />;
  if (ecran.code === "COMPARER") return <Comparer onLancer={onLancer} />;
  if (ecran.code === "COURBE") return <Courbe />;
  return <Aide onLancer={onLancer} />;
}
