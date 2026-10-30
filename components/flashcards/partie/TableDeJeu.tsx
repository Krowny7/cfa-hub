"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { RichText } from "@/components/RichText";
import { VersoCompact } from "@/components/flashcards/Verso";
import { poseLeonard, serieDePas, serieEnCours, SERIE_MIN, type CarteJeu, type SituationTable, type Verdicts } from "@/lib/flashcards/partie";
import { PARTIE_TABLE as T, bulleTable } from "@/lib/voice-partie";
import { AjusteCarte } from "./AjusteCarte";
import { PortraitLeonard } from "./PanneauCroupier";
import type { PropsTable } from "./types";
import { useEchelle } from "./useEchelle";
import t from "./Table.module.css";

// La table de jeu : Léonard le croupier distribue des mains de cartes face
// cachée sur un tapis vu en perspective. On touche une carte : elle se soulève
// et montre son RECTO (on cherche la réponse soi-même) ; on la touche encore
// (ou Espace) : le VERSO ; puis « Maîtrisée » (1) ou « Pas encore » (2). La
// carte jugée file sur sa pile, chaque « Maîtrisée » envoie un jeton du rack
// de Léonard à ta plaque, et la main suivante est distribuée. Après la
// dernière : le bilan (BilanPartie).
//
// Un seul état (`Etat`), tout le reste en découle : la phase de chaque carte,
// les piles, le rack, la plaque, les pastilles, la pose et la phrase de
// Léonard (poseLeonard / bulleTable, lib/flashcards/partie.ts et
// lib/voice-partie.ts). Chaque verdict passe par `juger` (PartieDeCartes →
// EnregistreurPartie : boucle du paquet, répétition espacée, Codex), une seule
// fois par carte. Les animations sont du CSS (Table.module.css), coupées par
// prefers-reduced-motion et le mode discret.

type Phase = 0 | 1 | 2 | 3 | 4; // face cachée, recto, verso, maîtrisée, pas encore
type Jugee = { id: string; ok: boolean };
type Etat = {
  main: number;
  ouverte: { id: string; face: "recto" | "verso" } | null;
  jugees: Jugee[];
  /** les jetons arrivés sur la plaque (un peu après leur envol) */
  gagnes: number;
  /** le dernier jeton envoyé : sa colonne du rack, et un compteur (la clé de son animation) */
  vol: { n: number; col: number } | null;
  /** change à chaque donne (main suivante, « Recommencer ») : rejoue la distribution */
  donne: number;
};

/** Les trois colonnes du rack de Léonard : de quoi remplir 0 à 27 jetons (au-delà, elles restent pleines), le plus lourd à gauche. */
export function hauteursRack(restants: number): [number, number, number] {
  const base = Math.floor(restants / 3);
  const reste = restants % 3;
  const h = (i: number) => Math.min(9, base + (i < reste ? 1 : 0));
  return [h(0), h(1), h(2)];
}

/** La colonne d'où part le jeton quand il reste `restants` jetons au rack (celle qui perd un jeton à la hauteur suivante). */
export const colonneDuJeton = (restants: number): number => (Math.max(1, restants) - 1) % 3;

const ROTATIONS = [-2, 2, -1];
const hauteurPile = (rang: number) => 4 + 3 * Math.min(8, rang);

/** Mouvement réduit, mode discret ou animations coupées : les jetons arrivent tout de suite. */
function sansMouvement(): boolean {
  try {
    const d = document.documentElement;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches || d.dataset.discreet === "1" || d.dataset.rlMotion === "off";
  } catch {
    return false;
  }
}

function etatInitial(p: PropsTable): Etat {
  const a = p.apercu;
  const jugees = a?.jugees ?? [];
  return {
    main: a?.main ?? 0,
    ouverte: a?.ouverte ?? null,
    jugees,
    gagnes: a?.gagnes ?? jugees.filter((j) => j.ok).length,
    vol: a?.vol ? { n: 1, col: a.vol.col } : null,
    donne: 0,
  };
}

export function TableDeJeu(props: PropsTable) {
  const { partie, juger, terminer, abandonner, apercu } = props;
  const [e, setE] = useState<Etat>(() => etatInitial(props));
  const racine = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const k = useEchelle(racine, scene);
  const minuteurs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const toutes = useMemo(() => partie.mains.flat(), [partie]);
  const total = toutes.length;
  const cartes = useMemo(() => partie.mains[e.main] ?? [], [partie, e.main]);
  const n = Math.max(1, cartes.length);
  const verdictDe = useMemo(() => new Map(e.jugees.map((j) => [j.id, j.ok])), [e.jugees]);
  const idsMain = useMemo(() => new Set(cartes.map((c) => c.id)), [cartes]);

  const phase = (c: CarteJeu): Phase => {
    const v = verdictDe.get(c.id);
    if (v !== undefined) return v ? 3 : 4;
    if (e.ouverte?.id === c.id) return e.ouverte.face === "recto" ? 1 : 2;
    return 0;
  };
  const jugeesMain = cartes.filter((c) => verdictDe.has(c.id)).length;
  const maitriseesMain = cartes.filter((c) => verdictDe.get(c.id) === true).length;
  const toutJuge = cartes.length > 0 && jugeesMain >= cartes.length;
  const derniere = e.main >= partie.mains.length - 1;
  const historique = e.jugees.map((j) => j.ok);
  const dernierMain = [...e.jugees].reverse().find((j) => idsMain.has(j.id))?.ok ?? null;
  const maitrisees = e.jugees.filter((j) => j.ok).length;
  const restants = Math.max(0, partie.jetons - maitrisees);
  const serie = serieEnCours(historique);

  const situation: SituationTable = {
    main: e.main,
    nbMains: partie.mains.length,
    tailleMain: cartes.length,
    jugeesMain,
    maitriseesMain,
    ouverte: e.ouverte?.face ?? null,
    dernier: dernierMain,
    serie,
    serieKo: serieDePas(historique),
  };

  // ——— Les gestes ———
  const cliquer = useCallback((id: string) => {
    setE((x) => {
      if (!x.ouverte && !x.jugees.some((j) => j.id === id)) return { ...x, ouverte: { id, face: "recto" } };
      if (x.ouverte?.id === id && x.ouverte.face === "recto") return { ...x, ouverte: { id, face: "verso" } };
      return x;
    });
  }, []);

  const verdict = useCallback(
    (ok: boolean) => {
      const ouverte = e.ouverte;
      if (!ouverte || ouverte.face !== "verso") return;
      const carte = cartes.find((c) => c.id === ouverte.id);
      if (!carte || verdictDe.has(carte.id)) return;
      juger(carte, ok); // une fois par carte : l'enregistrement (boucle du paquet, répétition espacée, Codex)
      const rapide = sansMouvement();
      const col = colonneDuJeton(Math.max(0, partie.jetons - maitrisees));
      setE((x) => ({
        ...x,
        ouverte: null,
        jugees: [...x.jugees, { id: carte.id, ok }],
        vol: ok && !rapide ? { n: (x.vol?.n ?? 0) + 1, col } : x.vol,
        gagnes: ok && rapide ? x.gagnes + 1 : x.gagnes,
      }));
      if (ok && !rapide) {
        // le jeton atterrit sur la plaque à la fin de son vol
        minuteurs.current.push(setTimeout(() => setE((x) => ({ ...x, gagnes: x.gagnes + 1 })), 720));
      }
    },
    [e.ouverte, cartes, verdictDe, juger, partie.jetons, maitrisees]
  );

  const suivante = useCallback(() => {
    if (!toutJuge) return;
    if (derniere) {
      const verdicts: Record<string, boolean> = {};
      for (const j of e.jugees) verdicts[j.id] = j.ok;
      terminer(verdicts as Verdicts, e.jugees.map((j) => j.ok));
    } else setE((x) => ({ ...x, main: x.main + 1, ouverte: null, donne: x.donne + 1 }));
  }, [toutJuge, derniere, e.jugees, terminer]);

  const retourner = useCallback(() => {
    if (toutJuge) return suivante();
    if (e.ouverte?.face === "recto") return cliquer(e.ouverte.id);
    if (!e.ouverte) {
      const premiere = cartes.find((c) => !verdictDe.has(c.id));
      if (premiere) cliquer(premiere.id);
    }
  }, [toutJuge, suivante, e.ouverte, cartes, verdictDe, cliquer]);

  const recommencer = useCallback(() => {
    for (const m of minuteurs.current) clearTimeout(m);
    minuteurs.current = [];
    setE((x) => ({ main: 0, ouverte: null, jugees: [], gagnes: 0, vol: null, donne: x.donne + 1 }));
  }, []);

  useEffect(
    () => () => {
      for (const m of minuteurs.current) clearTimeout(m);
    },
    []
  );

  // Les raccourcis : seulement quand le focus est dans la partie (l'élément racine reçoit les touches de ses enfants).
  const touche = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat) return;
    const cible = ev.target as HTMLElement;
    if (cible.closest("input, textarea, select, [contenteditable]")) return;
    if (ev.key === "1") {
      ev.preventDefault();
      verdict(true);
    } else if (ev.key === "2") {
      ev.preventDefault();
      verdict(false);
    } else if (ev.key === " " || ev.key === "Spacebar" || ev.key === "Enter") {
      // sur un bouton ou un lien, la touche garde son effet habituel (le bouton se déclenche)
      if (cible.closest("button, a, [role=button]")) return;
      ev.preventDefault();
      retourner();
    }
  };

  // Le focus reste dans la partie : à l'ouverture, et quand le bouton qu'on vient d'utiliser disparaît
  useLayoutEffect(() => {
    if (!apercu) racine.current?.focus({ preventScroll: true });
  }, [apercu]);
  useEffect(() => {
    const a = document.activeElement;
    if (racine.current && (!a || a === document.body)) racine.current.focus({ preventScroll: true });
  }, [e.ouverte, e.jugees.length, e.main]);

  // ——— Ce qu'on voit ———
  const rack = hauteursRack(restants);
  const rangPile = (id: string, ok: boolean) => {
    let r = 0;
    for (const j of e.jugees) {
      if (j.id === id) break;
      if (j.ok === ok) r++;
    }
    return r;
  };
  const pilesAnciennes = e.jugees.filter((j) => !idsMain.has(j.id));
  const derniereJugee = e.jugees[e.jugees.length - 1]?.id ?? null;
  const taillePastille = total <= 15 ? 18 : total <= 30 ? 13 : 9;
  const finsDeMain = useMemo(() => new Set(partie.mains.slice(0, -1).map((m) => m[m.length - 1]?.id)), [partie]);

  let consigne: { titre: string; sous: string };
  if (toutJuge) consigne = { titre: T.mainJouee, sous: T.pastilles(maitriseesMain, cartes.length) };
  else if (e.ouverte?.face === "verso") consigne = T.cmdVerso;
  else if (e.ouverte?.face === "recto") consigne = T.cmdRecto;
  else consigne = { titre: T.consigne, sous: T.touches };

  const etatNom = (p: Phase) => (p === 0 ? "cachee" : p === 1 ? "recto" : p === 2 ? "verso" : p === 3 ? "ok" : "ko");
  const style = { "--k": k } as CSSProperties;

  return (
    <div ref={racine} className={t.fenetre} style={style} tabIndex={-1} onKeyDown={touche} role="group" aria-label={T.hud.titre}>
      {/* ——— La barre du haut ——— */}
      <div className={t.hud}>
        <div className={t.hudG}>
          <span className={t.eyebrow}>{T.hud.titre}</span>
          <i className={t.sep} aria-hidden />
          <span className={t.eyebrow}>{T.hud.main}</span>
          <b className={t.grand}>{e.main + 1}</b>
          <span className={t.mono}>/ {partie.mains.length}</span>
        </div>
        <div className={t.pastilles} role="img" aria-label={T.pastilles(maitrisees, total)} style={{ "--pw": `${taillePastille}px` } as CSSProperties}>
          {toutes.map((c) => {
            const v = verdictDe.get(c.id);
            return (
              <i
                key={c.id}
                className={t.pst}
                data-r={v === undefined ? undefined : v ? "ok" : "ko"}
                data-cur={v === undefined && idsMain.has(c.id) ? "" : undefined}
                data-g={finsDeMain.has(c.id) && total <= 30 ? "" : undefined}
                data-nouv={!apercu && c.id === derniereJugee ? "" : undefined}
              />
            );
          })}
        </div>
        <div className={t.hudD}>
          <div className={t.stat}>
            <span className={t.eyebrow}>{T.hud.maitrisees}</span>
            <b className={t.grand}>{maitrisees}</b>
            <span className={t.mono}>/ {total}</span>
          </div>
          <button type="button" className={t.petit} onClick={recommencer}>
            <RotateCcw size={16} className={t.btnIcone} aria-hidden />
            <span className={t.btnTexte}>{T.hud.recommencer}</span>
          </button>
          <button type="button" className={t.petit} onClick={abandonner}>
            <SlidersHorizontal size={16} className={t.btnIcone} aria-hidden />
            <span className={t.btnTexte}>{T.hud.parametres}</span>
          </button>
        </div>
      </div>

      {/* ——— La scène ——— */}
      <div ref={scene} className={t.scene}>
        <div className={t.cadre}>
          <div className={t.stage}>
            <div className={t.halo} aria-hidden />
            <div className={t.anneau} aria-hidden />
            <div className={t.leoBox}>
              <PortraitLeonard pose={poseLeonard(situation)} className={t.leoStage} />
            </div>

            <div className={t.monde}>
              <div className={t.plateau} style={{ "--n": n } as CSSProperties}>
                <div className={t.nappe} aria-hidden>
                  <div className={t.rail} />
                  <div className={t.piqure} />
                  <div className={t.feutre} />
                  <div className={t.bois}>
                    {[-1, 0, 1].map((m) => (
                      <i key={m} className={t.puits} style={{ "--cm": m } as CSSProperties} />
                    ))}
                  </div>
                  <p className={t.etiquette}>
                    {T.rackEtiquette.toUpperCase()} · <b>{T.rackJetons(restants).toUpperCase()}</b>
                  </p>
                  <p className={`${t.etiquettePile} ${t.etiquetteKo}`}>{T.pileKo.toUpperCase()}</p>
                  <p className={`${t.etiquettePile} ${t.etiquetteOk}`}>{T.pileOk.toUpperCase()}</p>
                  <i className={`${t.emplPile} ${t.emplKo}`} />
                  <i className={`${t.emplPile} ${t.emplOk}`} />
                  {cartes.map((c, i) => (
                    <i key={c.id} className={t.empl} style={{ "--i": i - (n - 1) / 2 } as CSSProperties} />
                  ))}
                </div>

                {/* le rack de Léonard : trois colonnes de jetons debout */}
                {rack.map((h, i) => (
                  <div key={i} className={t.pileJ} style={{ "--cm": i - 1 } as CSSProperties}>
                    {h > 0 && <i className={t.col} style={{ "--n": h } as CSSProperties} />}
                  </div>
                ))}
                <div className={t.sabot} aria-hidden>
                  <i className={t.dessus} />
                  <i className={t.devant} />
                  <i className={t.flanc} />
                  <i className={t.orlisere} />
                  <i className={t.paquet} />
                </div>

                {/* les cartes jouées aux mains précédentes, empilées */}
                {pilesAnciennes.map((j) => {
                  const r = rangPile(j.id, j.ok);
                  return <i key={j.id} className={t.cartePile} data-s={j.ok ? "ok" : "ko"} style={{ "--pz": hauteurPile(r), "--r": ROTATIONS[r % 3] } as CSSProperties} />;
                })}

                {/* les cartes de la main en cours */}
                {cartes.map((c, i) => {
                  const p = phase(c);
                  const r = p >= 3 ? rangPile(c.id, p === 3) : 0;
                  const libre = !e.ouverte && p === 0;
                  const cliquable = libre || p === 1;
                  return (
                    <div
                      key={`${e.donne}-${c.id}`}
                      className={t.poste}
                      data-ph={p}
                      data-libre={libre ? "" : undefined}
                      data-donne={apercu ? undefined : ""}
                      style={{ "--i": i - (n - 1) / 2, "--rg": i, "--pz": hauteurPile(r), "--r": ROTATIONS[r % 3] } as CSSProperties}
                    >
                      <div className={t.ombreSol} />
                      <div className={t.ombreLeve} />
                      <div className={t.leve}>
                        <div className={t.carte} data-ph={p}>
                          <div className={`${t.face} ${t.fRecto}`}>
                            <div className={t.contenu}>
                              <div className={t.eyebrow2}>
                                <span>{c.abrege}</span>
                                <span className={t.mono}>{T.rang(c.rang, total)}</span>
                              </div>
                              <AjusteCarte base={19} min={9} cle={c.id} className={`${t.fit} ${t.question}`}>
                                <RichText text={c.front} />
                              </AjusteCarte>
                              <p className={t.pied}>{c.lieu}</p>
                            </div>
                            <i className={t.reflet} />
                          </div>
                          <div className={t.face}>
                            <div className={t.dosCalque}>
                              <span className={t.dosHaut}>{T.dos}</span>
                              <b className={t.dosRL}>{T.dosMarque}</b>
                            </div>
                            <div className={t.versoCalque}>
                              <div className={t.contenu}>
                                <div className={t.eyebrow2}>
                                  <span>{c.abrege}</span>
                                  <span className={t.mono}>{T.rang(c.rang, total)}</span>
                                </div>
                                <AjusteCarte base={13} min={8} cle={c.id} className={`${t.fit} ${t.verso}`}>
                                  <VersoCompact back={c.back} />
                                </AjusteCarte>
                              </div>
                              <span className={`${t.badge} ${t.bM}`}>{T.maitrisee}</span>
                              <span className={`${t.badge} ${t.bP}`}>{T.pasEncore}</span>
                              <i className={t.reflet} />
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={t.zone}
                          aria-label={T.etatCarte(c.rang, total, p === 0 ? "cachee" : p === 1 ? "recto" : p === 2 ? "verso" : p === 3 ? "ok" : "ko")}
                          aria-disabled={cliquable ? undefined : true}
                          onClick={() => cliquable && cliquer(c.id)}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* le jeton qui vole du rack vers ta plaque */}
                {e.vol && (
                  <i
                    key={e.vol.n}
                    className={t.vol}
                    aria-hidden
                    style={{ "--cm": e.vol.col - 1, ...(apercu?.vol ? { animationPlayState: "paused", animationDelay: "-0.34s" } : null) } as CSSProperties}
                  >
                    {T.dosMarque}
                  </i>
                )}
              </div>
            </div>

            <div className={t.bulle} aria-live="polite">
              <p>{bulleTable({ ...situation, totalCartes: total })}</p>
            </div>

            {/* ta plaque : l'avatar, tes jetons gagnés */}
            <div className={t.plaque} role="group" aria-label={T.plaque}>
              <div className={t.mini} aria-hidden>
                <i className={t.mc} style={{ "--n": Math.min(9, e.gagnes) } as CSSProperties} data-n={Math.min(9, e.gagnes)} data-rebond={e.gagnes > 0 && !apercu ? "" : undefined} key={e.gagnes} />
              </div>
              <div className={t.avatar} aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                  <circle cx="12" cy="8.5" r="4" />
                  <path d="M3.5 21c.6-4.6 4.2-7 8.5-7s7.9 2.4 8.5 7z" />
                </svg>
              </div>
              <div className={t.plaqueTxt}>
                <b>{T.toi}</b>
                <span className={t.mono}>{T.plaqueJetons(e.gagnes)}</span>
              </div>
              {serie >= SERIE_MIN && (
                <span key={serie} className={t.serie}>
                  {T.serieX(serie)}
                </span>
              )}
              {e.gagnes > 0 && !apercu && (
                <span key={e.gagnes} className={t.plus} aria-hidden>
                  {T.plusUn}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ——— Le pied : consigne et commandes ——— */}
      <div className={t.dock}>
        <p className={t.consigne}>
          {consigne.titre}
          <span>{consigne.sous}</span>
        </p>
        <div className={t.actions}>
          {!toutJuge && e.ouverte?.face === "recto" && (
            <button type="button" className={t.contour} onClick={retourner}>
              {T.retourner}
              <span className={t.kbd}>{T.toucheEspace}</span>
            </button>
          )}
          {!toutJuge && e.ouverte?.face === "verso" && (
            <>
              <button type="button" className={t.encreV} onClick={() => verdict(true)}>
                {T.maitrisee}
                <span className={t.kbd}>1</span>
              </button>
              <button type="button" className={t.contour} onClick={() => verdict(false)}>
                {T.pasEncore}
                <span className={t.kbd}>2</span>
              </button>
            </>
          )}
          {toutJuge && (
            <button type="button" className={t.encreV} onClick={suivante}>
              {derniere ? T.voirBilan : T.mainSuivante}
              <span className={t.kbd}>{T.toucheEspace}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
