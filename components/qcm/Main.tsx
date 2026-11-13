"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ActionEncre } from "@/components/ui/SousPage";
import { Compte } from "@/components/revoir/Pile";
import { CERCLE_CRAIE } from "@/components/ui/craie";
import { dejaVu } from "@/components/session/premiere-visite";
import type { BrowserRow } from "@/components/ContentDetailHeader";
import { SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { nombre } from "@/lib/voice";
import s from "./Main.module.css";

// L'objet-héros de /qcm (direction « le lieu, puis l'objet », 2026-11-13) : l'éventail des matières,
// une main de cartes papier. Chaque carte porte son état sur sa tranche visible : le code, les
// réussites en Mono, une encoche par QCM (pleine : fini ; contour : entamé) ; une matière sans
// réussite pâlit ; la carte du QCM en cours est entourée du cercle de craie. La carte levée (celle
// qu'on tire, ou celle du QCM en cours à l'arrivée) sort de la main, plus grande : son nom, ses QCM en
// lignes (état, thème, réussies), les quiz des fiches regroupés en une ligne et une rangée de petits
// carrés numérotés ; l'action à l'encre se pose sous elle. Sur téléphone, la main se range en petites
// cartes et la carte levée se pose dessous. Sans état au rendu (ni Date ni hasard) : les angles
// viennent du rang de la carte ; l'adresse suit la carte levée (?subject=). La donne ne se joue qu'à
// la première visite de la session.

const S = SOUS_ENTRAINEMENT.qcm;

export type CarteMatiere = { cle: string; code: string; numero: string; nom: string; rows: BrowserRow[] };
/** l'action de la carte levée : reprendre (ou ouvrir) un de ses QCM */
export type SuiteCarte = { href: string; texte: string; compte: string };

type Etat = "plein" | "cercle" | "vide";
const etatDe = (r: BrowserRow): Etat => {
  const fait = r.done ?? 0;
  if (r.count !== null && r.count > 0 && fait >= r.count) return "plein";
  return fait > 0 ? "cercle" : "vide";
};
const intitule = (r: BrowserRow) => r.main || r.lead || r.title;
const bilan = (rows: BrowserRow[]) => ({ fait: rows.reduce((n, r) => n + (r.done ?? 0), 0), total: rows.reduce((n, r) => n + (r.count ?? 0), 0) });

/** Le visage de la carte levée : nom, réussites, les QCM en lignes, les fiches en petits carrés. */
function Visage({ c }: { c: CarteMatiere }) {
  const { fait, total } = bilan(c.rows);
  const sets = c.rows.filter((r) => r.kind !== "drill");
  const fiches = c.rows.filter((r) => r.kind === "drill").sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const fichesFinies = fiches.filter((r) => etatDe(r) === "plein").length;
  return (
    <div className={s.visage}>
      <b className={s.nom}>{c.nom}</b>
      {c.rows.length > 0 ? (
        <>
          {total > 0 && <span className={s.reussies}>{S.carteReussies(fait, total)}</span>}
          <ul className={s.lignes} aria-label={S.lesQcm(c.nom)}>
            {sets.map((r) => {
              const lu = S.pastille(intitule(r), r.done ?? 0, r.count);
              return (
                <li key={r.id}>
                  <Link href={`/qcm/${r.id}`} className={"rl-presse " + s.ligne} data-etat={etatDe(r)} aria-label={lu}>
                    <i className={s.point} aria-hidden />
                    <span className={s.theme}>{intitule(r)}</span>
                    <span className={s.score} aria-hidden>
                      {S.reussies(r.done ?? 0, r.count)}
                    </span>
                  </Link>
                </li>
              );
            })}
            {fiches.length > 0 && (
              <li className={s.fiches}>
                <span className={s.fichesTete}>
                  <span className={s.theme}>{S.fiches}</span>
                  <span className={s.score}>
                    {nombre(fichesFinies)}/{nombre(fiches.length)}
                  </span>
                </span>
                <span className={s.carres}>
                  {fiches.map((r, i) => {
                    const n = r.order ?? i + 1;
                    return (
                      <Link key={r.id} href={`/qcm/${r.id}`} className={"rl-presse " + s.carre} data-etat={etatDe(r)} aria-label={S.fiche(n, r.done ?? 0, r.count)} title={S.fiche(n, r.done ?? 0, r.count)}>
                        {n}
                      </Link>
                    );
                  })}
                </span>
              </li>
            )}
          </ul>
        </>
      ) : (
        <span className={s.reussies}>{S.vide}</span>
      )}
    </div>
  );
}

function Action({ suite }: { suite: SuiteCarte }) {
  return (
    <ActionEncre href={suite.href}>
      {suite.texte}
      <Compte>{suite.compte}</Compte>
      <ArrowRight size={17} aria-hidden />
    </ActionEncre>
  );
}

export function MainQcm({ cartes, depart, suites, enCours = null }: { cartes: CarteMatiere[]; depart: number; suites: Record<string, SuiteCarte | null>; enCours?: string | null }) {
  const [haut, setHaut] = useState(depart);
  const [calme, setCalme] = useState(false);
  useEffect(() => setCalme(dejaVu("qcm")), []);
  const id = "main" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const n = cartes.length;
  const levee = cartes[haut] ?? cartes[0];
  if (!n || !levee) return null;
  const suite = suites[levee.cle];

  function tirer(i: number) {
    setHaut(i);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("subject", cartes[i].cle);
      window.history.replaceState(null, "", u.pathname + u.search);
    } catch {
      // l'adresse ne suit pas : la carte se lève quand même
    }
  }

  return (
    <div className={s.table} data-calme={calme ? "1" : undefined} data-action={suite ? "1" : undefined}>
      <svg className={s.defs} aria-hidden focusable="false">
        <defs>
          <path id={`${id}-cercle`} vectorEffect="non-scaling-stroke" d={CERCLE_CRAIE} />
        </defs>
      </svg>
      <ul className={s.main} aria-label={S.main} style={{ "--n": n } as React.CSSProperties}>
        {cartes.map((c, i) => {
          const k = i - (n - 1) / 2;
          const leve = i === haut;
          const { fait, total } = bilan(c.rows);
          const sets = c.rows.filter((r) => r.kind !== "drill");
          const courant = c.cle === enCours;
          return (
            <li
              key={c.cle}
              className={s.place}
              data-haut={leve ? "1" : undefined}
              data-droite={i > haut ? "1" : undefined}
              data-voisine={i === haut + 1 ? "1" : undefined}
              data-vide={fait === 0 ? "1" : undefined}
              style={{ "--i": i, "--k": k } as React.CSSProperties}
            >
              <button type="button" className={s.carte} aria-pressed={leve} aria-label={S.tirer(c.nom) + (courant ? `, ${S.enCours}` : "")} onClick={() => tirer(i)}>
                <span className={s.coin} aria-hidden>
                  <b>
                    {c.code}
                    {courant && (
                      <svg className={s.courant} viewBox="0 0 240 60" preserveAspectRatio="none" focusable="false">
                        <use href={`#${id}-cercle`} />
                      </svg>
                    )}
                  </b>
                  <span>{c.numero}</span>
                  {total > 0 && (
                    <em className={s.etatCarte}>
                      {nombre(fait)}/{nombre(total)}
                    </em>
                  )}
                </span>
                {sets.length > 0 && (
                  <span className={s.encoches} aria-hidden>
                    {sets.map((r) => (
                      <i key={r.id} data-etat={etatDe(r)} />
                    ))}
                  </span>
                )}
                <span className={s.dos} aria-hidden>
                  {c.code}
                </span>
                <span className={s.coinBas} aria-hidden>
                  <b>{c.code}</b>
                </span>
              </button>
              {/* la carte levée, sur ordinateur : son visage par-dessus (les liens), et l'action posée sous elle */}
              {leve && (
                <>
                  <div className={s.surCarte}>
                    <Visage c={c} />
                  </div>
                  {suite && (
                    <div className={s.actionCarte}>
                      <Action suite={suite} />
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {/* sur téléphone : la carte levée posée sous la main, puis l'action */}
      <div className={s.tiree}>
        <p className={s.tireeCode} aria-hidden>
          {levee.code}
        </p>
        <Visage c={levee} />
      </div>
      {suite && (
        <div className={s.action}>
          <Action suite={suite} />
        </div>
      )}
    </div>
  );
}
