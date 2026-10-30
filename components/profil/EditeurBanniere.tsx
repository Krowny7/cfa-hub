"use client";

import { memo, useEffect, useId, useMemo, useRef, useState, type Dispatch, type KeyboardEvent, type PointerEvent, type ReactNode, type SetStateAction } from "react";
import { ArrowDown, ArrowUp, ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CarteBanniere } from "@/components/profil/CarteBanniere";
import { ChoixPanneau } from "@/components/profil/ChoixPanneau";
import { ScenePosable } from "@/components/profil/ScenePosable";
import { createClient } from "@/lib/supabase/browser";
import { QuotaFichiers, Refus } from "@/lib/profil/envoi-media";
import { envoyerImageBanniere, supprimerEnAttente, type ImageEnvoyee } from "@/lib/profil/envoi-banniere";
import {
  CALQUE_H_MAX,
  CALQUE_H_MIN,
  CALQUE_L_MAX,
  CALQUE_L_MIN,
  CLES_IMAGE,
  PREREGLAGES,
  SCENE,
  adresseImage,
  compositionDefaut,
  compositionDe,
  hauteurCalque,
  imagePrereglage,
  prereglageDe,
  serialiserComposition,
  type Calque,
  type CleCalque,
  type CleImage,
  type Composition,
  type Panneau,
} from "@/lib/profil/banniere";
import {
  avecCadrage,
  avecCalque,
  avecChamp,
  avecImage,
  avecVerrou,
  devantLeCadre,
  peutPousser,
  pousser,
  reinitialiser,
  selectionDepart,
} from "@/lib/profil/banniere-edition";
import type { BadgeChoix } from "@/lib/profil/banniere-badges";
import { assemblerPanneau, type DonneesPanneau } from "@/lib/profil/panneau-editeur";
import type { StyleProfil } from "@/lib/profil/catalogue";
import { BANNIERE_ED } from "@/lib/voice-banniere";
import c from "./EditeurBanniere.module.css";

// Personnaliser › Ta bannière : l'éditeur de la bannière composée
// (lib/profil/banniere.ts). Le joueur règle lui-même ses quatre éléments, dans
// une bannière de taille fixe entourée d'une marge de débordement :
//   - le FOND (une image qui remplit la bannière : on l'envoie, on choisit son
//     point de cadrage, rien d'autre) ;
//   - le PERSONNAGE, la PIÈCE DU HAUT et la PIÈCE DU BAS : une image chacun
//     (envoyée, ou une pièce toute prête du site pour le haut et le bas),
//     qu'on pose À LA MAIN sur l'aperçu (glisser pour déplacer, poignées pour
//     redimensionner : ScenePosable) ou aux curseurs précis (gauche, haut,
//     largeur, hauteur, verrou des proportions), « Réinitialiser » par élément ;
//   - l'ORDRE d'empilement (devant ou derrière les autres et le cadre).
// Dessous, le choix du panneau de gauche (ChoixPanneau) avec l'aperçu de la
// carte complète, à jour à chaque choix.
// Le brouillon est le style de Personnaliser (`b.style.banniere`) : le premier
// changement crée la composition (avec l'ancien personnage repris comme
// calque s'il y en avait un, que l'enregistrement retire : `perso: null`) ;
// « Revenir à la bannière simple » la retire. Pendant un geste sur l'aperçu,
// seul cet éditeur se redessine (`live`) ; le brouillon change au relâcher.
// Les images partent dans le dossier du joueur, une par élément : celle
// qu'on remplace avant d'enregistrer est supprimée tout de suite, sauf si la
// bannière enregistrée s'en sert. Le serveur revalide tout (validerComposition).

/** Le brouillon dont l'éditeur a besoin : le style et de quoi le changer. */
export type BrouillonBanniere = { style: StyleProfil; setStyle: Dispatch<SetStateAction<StyleProfil>> };

/** Un champ numérique qu'on peut taper : la saisie en cours reste telle quelle, la valeur bornée revient à la sortie du champ. */
function ChampNombre({ valeur, min, max, step, label, disabled, onChange }: { valeur: number; min: number; max: number; step: number; label: string; disabled?: boolean; onChange: (v: number) => void }) {
  const [texte, setTexte] = useState<string | null>(null);
  return (
    <input
      type="number"
      className={c.nombre}
      aria-label={label}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      value={texte ?? String(Math.round(valeur * 10) / 10)}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        setTexte(e.target.value);
        const n = Number(e.target.value.replace(",", "."));
        if (e.target.value.trim() !== "" && Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => setTexte(null)}
    />
  );
}

/** Un réglage : son nom, un curseur et la case où taper la valeur. */
function Reglage({ label, valeur, min, max, step = 0.5, disabled, onChange }: { label: string; valeur: number; min: number; max: number; step?: number; disabled?: boolean; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div className={c.reglage}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={Math.max(min, Math.min(max, valeur))} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={`${Math.round(valeur * 10) / 10} %`} />
      <ChampNombre valeur={valeur} min={min} max={max} step={step} label={`${label} (%)`} disabled={disabled} onChange={onChange} />
    </div>
  );
}

/** Le point de cadrage du fond : un carré où l'on pose un point (le curseur en cadre aussi, au clavier). */
function PointCadrage({ px, py, onChange }: { px: number; py: number; onChange: (px: number, py: number) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const poser = (e: PointerEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return;
    onChange(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
  };
  return (
    <div
      ref={ref}
      aria-hidden
      className="relative h-[92px] w-[92px] shrink-0 cursor-crosshair rounded-[10px] border border-line-2 bg-[var(--paper-2)] [touch-action:none]"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        poser(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) poser(e);
      }}
    >
      <span className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--pen)] bg-[var(--surface)]" style={{ left: `${px}%`, top: `${py}%` }} />
    </div>
  );
}

/** L'aperçu de la carte complète, redessiné seulement quand la composition ou le panneau changent (pas à chaque mouvement d'un geste). */
const ApercuCarte = memo(function ApercuCarte({ composition, panneau, fond }: { composition: Composition; panneau: ReturnType<typeof assemblerPanneau>; fond?: ReactNode }) {
  return <CarteBanniere composition={composition} panneau={panneau} fond={fond} charge="eager" />;
});

const VOIR = {
  fond: BANNIERE_ED.fond,
  perso: BANNIERE_ED.perso,
  haut: BANNIERE_ED.haut,
  bas: BANNIERE_ED.bas,
} as const;

export function EditeurBanniere({
  b,
  enregistree,
  dispo,
  fond,
  donnees,
  badges,
  titre,
  onEnvoi,
  ranger,
  client = createClient,
  selectionInitiale,
}: {
  b: BrouillonBanniere;
  /** la composition enregistrée (ses fichiers ne sont jamais supprimés) */
  enregistree: Composition | null;
  /** la base a la colonne (migration_bannieres_composees.sql) ; sinon une ligne dit que la fonction arrive */
  dispo: boolean;
  /** le fond du profil, quand le joueur n'a pas envoyé le sien */
  fond: ReactNode;
  /** le rang, les valeurs et les badges décrits, lus par le serveur */
  donnees: DonneesPanneau;
  /** ce qu'il a gagné et peut mettre dans son panneau */
  badges: BadgeChoix[];
  /** son titre porté, lisible (celui du brouillon) */
  titre: string | null;
  onEnvoi: (enCours: boolean) => void;
  /** le dossier est plein : le serveur le range (en gardant la composition donnée), puis un seul nouvel essai */
  ranger: (banniereEnCours: unknown) => Promise<boolean>;
  /** le client de stockage, créé seulement quand on envoie ou retire une image */
  client?: () => SupabaseClient;
  /** l'élément ouvert au départ (aperçus et tests) ; sinon le premier qui a une image */
  selectionInitiale?: CleImage;
}) {
  const { style, setStyle } = b;
  const base = useMemo(() => style.banniere ?? compositionDe(style) ?? compositionDefaut(), [style]);
  const commence = !!style.banniere;
  const reprise = !commence && !!base.perso.image;
  const [sel, setSel] = useState<CleImage>(() => selectionInitiale ?? selectionDepart(base));
  const [live, setLive] = useState<{ cle: CleCalque; calque: Calque } | null>(null);
  const [msg, setMsg] = useState<{ cle: CleImage; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState<CleImage | null>(null);
  const fichier = useRef<HTMLInputElement | null>(null);
  const courante = useRef(base);
  useEffect(() => {
    courante.current = base;
  }, [base]);
  const vue = live ? avecCalque(base, live.cle, live.calque) : base;

  /** Change la composition du brouillon (la crée au premier changement ; l'ancien personnage s'en va). */
  const maj = (f: (comp: Composition) => Composition) => setStyle((s) => ({ ...s, banniere: f(s.banniere ?? compositionDe(s) ?? compositionDefaut()), perso: null }));
  const gardees = [enregistree?.fond.image, enregistree?.perso.image, enregistree?.haut.image, enregistree?.bas.image];
  const oublier = (ancien: string | null) => {
    // une image envoyée puis remplacée avant d'enregistrer : supprimée tout de suite (au mieux)
    if (ancien && !prereglageDe(ancien)) void supprimerEnAttente(client(), ancien, gardees);
  };

  async function envoyer(cle: CleImage, file: File | undefined) {
    if (!file) return;
    setMsg({ cle, texte: BANNIERE_ED.envoi });
    setEnvoi(cle);
    onEnvoi(true);
    try {
      const sb = client();
      let r: ImageEnvoyee;
      try {
        r = await envoyerImageBanniere(sb, cle, file);
      } catch (e) {
        if (!(e instanceof QuotaFichiers)) throw e;
        // le dossier est plein de fichiers en attente : le serveur le range (sans toucher à la bannière enregistrée ni à celle-ci), puis un seul nouvel essai
        await ranger(serialiserComposition(courante.current));
        r = await envoyerImageBanniere(sb, cle, file);
      }
      const ancien = courante.current[cle].image;
      maj((comp) => avecImage(comp, cle, r.url, r.ratio));
      oublier(ancien);
      setSel(cle);
      setMsg(null);
    } catch (e) {
      setMsg({ cle, texte: e instanceof Refus ? e.message : BANNIERE_ED.erreurEnvoi });
    } finally {
      setEnvoi(null);
      onEnvoi(false);
      if (fichier.current) fichier.current.value = "";
    }
  }
  const retirerImage = (cle: CleImage) => {
    const ancien = base[cle].image;
    maj((comp) => avecImage(comp, cle, null));
    oublier(ancien);
    setMsg(null);
  };
  const prendrePrereglage = (cle: CleCalque, id: string | null) => {
    const ancien = base[cle].image;
    maj((comp) => avecImage(comp, cle, id ? imagePrereglage(id) : null));
    oublier(ancien);
  };

  const calque = sel !== "fond" ? vue[sel] : null;
  const hh = calque ? hauteurCalque(calque) : 0;
  const reglerCalque = (cle: CleCalque, champ: "x" | "y" | "l" | "h", v: number) => maj((comp) => avecCalque(comp, cle, avecChamp(comp[cle], champ, v)));
  const panneau = useMemo(() => assemblerPanneau(donnees, base.panneau, titre), [donnees, base.panneau, titre]);
  const changerPanneau = (p: Panneau) => maj((comp) => ({ ...comp, panneau: p }));

  const tabs: CleImage[] = [...CLES_IMAGE];
  const clavierTabs = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const suite = tabs[(i + d + tabs.length) % tabs.length];
    setSel(suite);
    document.getElementById(`rl-bn-onglet-${suite}`)?.focus();
  };

  const urlImage = (cle: CleImage) => (cle === "fond" ? vue.fond.image : adresseImage(cle, vue[cle].image));
  const aImage = (cle: CleImage) => !!(cle === "fond" ? vue.fond.image : vue[cle].image);

  return (
    <section id="rl-perso-banniere" aria-labelledby="rl-bn-titre" className="flex scroll-mt-24 flex-col gap-5" data-editeur-banniere="">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-[1_1_320px]">
          <h2 id="rl-bn-titre" className="t-eyebrow m-0">
            {BANNIERE_ED.titre}
          </h2>
          <p className="t-small m-0 mt-1 max-w-[680px]">{BANNIERE_ED.aide}</p>
        </div>
        {dispo && commence && (
          <button type="button" className="btn btn-ghost btn-sm max-sm:min-h-[44px]" onClick={() => setStyle((s) => ({ ...s, banniere: null }))} title={BANNIERE_ED.retirerToutAide}>
            <Trash2 size={14} aria-hidden /> {BANNIERE_ED.retirerTout}
          </button>
        )}
      </div>

      {!dispo ? (
        <p className="t-small m-0 rounded-[12px] border border-dashed border-line-2 p-3">{BANNIERE_ED.bientot}</p>
      ) : (
        <>
          {reprise && <p className="t-small m-0 rounded-[12px] border border-dashed border-line-2 p-3">{BANNIERE_ED.repris}</p>}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)] lg:items-start">
            {/* l'aperçu en grand, avec sa marge de débordement en pointillés */}
            <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-24">
              <div className={c.stage} role="group" aria-label={BANNIERE_ED.apercu}>
                <ScenePosable
                  composition={vue}
                  selection={sel}
                  fond={fond}
                  onSelect={setSel}
                  onVivre={(cle, k) => setLive(k ? { cle, calque: k } : null)}
                  onValider={(cle, k) => {
                    maj((comp) => avecCalque(comp, cle, k));
                    setLive(null);
                  }}
                />
              </div>
              <p className="t-micro m-0 text-center">{BANNIERE_ED.legendeScene}</p>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <div role="tablist" aria-label={BANNIERE_ED.elements} className={c.onglets}>
                {tabs.map((k, i) => {
                  const src = urlImage(k);
                  return (
                    <button key={k} type="button" role="tab" id={`rl-bn-onglet-${k}`} aria-selected={sel === k} aria-controls="rl-bn-volet" tabIndex={sel === k ? 0 : -1} className={c.onglet} onClick={() => setSel(k)} onKeyDown={(e) => clavierTabs(e, i)}>
                      {src && !src.startsWith("piece:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className={c.miniature} draggable={false} />
                      ) : (
                        <span aria-hidden className={`${c.miniature} ${c.miniatureVide}`}>
                          {BANNIERE_ED.vide}
                        </span>
                      )}
                      <span>{VOIR[k]}</span>
                    </button>
                  );
                })}
              </div>

              <div role="tabpanel" id="rl-bn-volet" aria-labelledby={`rl-bn-onglet-${sel}`} className="flex flex-col gap-4">
                {/* l'image de l'élément */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input ref={fichier} type="file" accept="image/png,image/webp,image/jpeg" className="sr-only" id="rl-bn-fichier" onChange={(e) => envoyer(sel, e.target.files?.[0])} disabled={envoi !== null} />
                    <label htmlFor="rl-bn-fichier" className={"btn btn-secondary btn-sm cursor-pointer max-sm:min-h-[44px]" + (envoi !== null ? " pointer-events-none opacity-60" : "")}>
                      <ImagePlus size={15} aria-hidden /> {aImage(sel) && !(sel !== "fond" && prereglageDe(vue[sel].image)) ? BANNIERE_ED.changer : BANNIERE_ED.choisir}
                    </label>
                    {aImage(sel) && (
                      <button type="button" className="btn btn-ghost btn-sm max-sm:min-h-[44px]" onClick={() => retirerImage(sel)} disabled={envoi !== null}>
                        <Trash2 size={14} aria-hidden /> {BANNIERE_ED.retirer}
                      </button>
                    )}
                    {msg && msg.cle === sel && (
                      <span role="status" className="text-[12.5px] font-medium">
                        {msg.texte}
                      </span>
                    )}
                  </div>
                  <p className="t-micro m-0">{sel === "fond" ? `${BANNIERE_ED.formatsFond} ${BANNIERE_ED.formats}` : BANNIERE_ED.formats}</p>
                </div>

                {/* les pièces toutes prêtes du site (haut et bas) */}
                {(sel === "haut" || sel === "bas") && (
                  <div className="flex flex-col gap-2" role="radiogroup" aria-label={BANNIERE_ED.prereglages}>
                    <p className="t-micro m-0">
                      <b>{BANNIERE_ED.prereglages}</b> · {BANNIERE_ED.prereglagesAide}
                    </p>
                    <div className={c.pieces}>
                      <button type="button" role="radio" aria-checked={!vue[sel].image} className={c.piece} onClick={() => prendrePrereglage(sel, null)}>
                        <span>{BANNIERE_ED.aucune}</span>
                      </button>
                      {PREREGLAGES.map((p) => {
                        const actif = vue[sel].image === imagePrereglage(p.id);
                        const fichierPiece = sel === "haut" ? p.haut.fichier : p.bas.fichier;
                        return (
                          <button key={p.id} type="button" role="radio" aria-checked={actif} className={c.piece} onClick={() => prendrePrereglage(sel, p.id)} data-prereglage={p.id}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/bannieres/pieces/${fichierPiece}`} alt="" draggable={false} loading="lazy" />
                            <span>{p.nom}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* le fond : seulement son point de cadrage */}
                {sel === "fond" && vue.fond.image && (
                  <div className="flex flex-col gap-2">
                    <p className="t-micro m-0">
                      <b>{BANNIERE_ED.cadrage}</b> · {BANNIERE_ED.cadrageAide}
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <PointCadrage px={vue.fond.px} py={vue.fond.py} onChange={(px, py) => maj((comp) => avecCadrage(comp, px, py))} />
                      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
                        <Reglage label={BANNIERE_ED.cadrageX} valeur={vue.fond.px} min={0} max={100} step={1} onChange={(v) => maj((comp) => avecCadrage(comp, v, comp.fond.py))} />
                        <Reglage label={BANNIERE_ED.cadrageY} valeur={vue.fond.py} min={0} max={100} step={1} onChange={(v) => maj((comp) => avecCadrage(comp, comp.fond.px, v))} />
                      </div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm w-fit max-sm:min-h-[44px]" onClick={() => maj((comp) => reinitialiser(comp, "fond"))} disabled={vue.fond.px === 50 && vue.fond.py === 50}>
                      <RotateCcw size={14} aria-hidden /> {BANNIERE_ED.reinitialiser}
                    </button>
                  </div>
                )}
                {sel === "fond" && !vue.fond.image && <p className="t-small m-0">Sans image, c&apos;est le fond de ton profil (sa bannière) qui remplit la bannière.</p>}

                {/* le placement d'un calque */}
                {calque && sel !== "fond" && calque.image && (
                  <div className="flex flex-col gap-1" data-placement={sel}>
                    <p className="t-micro m-0 font-semibold">{BANNIERE_ED.placement}</p>
                    <Reglage label={BANNIERE_ED.x} valeur={calque.x} min={SCENE.x0} max={SCENE.x1 - calque.l} onChange={(v) => reglerCalque(sel, "x", v)} />
                    <Reglage label={BANNIERE_ED.y} valeur={calque.y} min={SCENE.y0} max={SCENE.y1 - hh} onChange={(v) => reglerCalque(sel, "y", v)} />
                    <Reglage label={BANNIERE_ED.largeur} valeur={calque.l} min={CALQUE_L_MIN} max={CALQUE_L_MAX} onChange={(v) => reglerCalque(sel, "l", v)} />
                    <Reglage label={BANNIERE_ED.hauteur} valeur={hh} min={CALQUE_H_MIN} max={CALQUE_H_MAX} disabled={calque.h === null} onChange={(v) => reglerCalque(sel, "h", v)} />
                    <label className="flex min-h-[44px] items-center gap-2.5 text-[13px] font-semibold">
                      <input type="checkbox" className="h-[18px] w-[18px]" style={{ accentColor: "var(--ink)" }} checked={calque.h === null} onChange={(e) => maj((comp) => avecCalque(comp, sel, avecVerrou(comp[sel], e.target.checked)))} />
                      <span>
                        {BANNIERE_ED.verrou}
                        <span className="t-micro block font-normal">{BANNIERE_ED.verrouAide}</span>
                      </span>
                    </label>
                    <p className="t-micro m-0">{BANNIERE_ED.clavier}</p>
                    <button type="button" className="btn btn-ghost btn-sm mt-1 w-fit max-sm:min-h-[44px]" onClick={() => maj((comp) => reinitialiser(comp, sel))}>
                      <RotateCcw size={14} aria-hidden /> {BANNIERE_ED.reinitialiser}
                    </button>
                  </div>
                )}
              </div>

              {/* l'ordre d'empilement : du plus en avant au plus en arrière */}
              <div className="flex flex-col gap-2 border-t border-line pt-4">
                <div>
                  <p className="t-eyebrow m-0">{BANNIERE_ED.ordre}</p>
                  <p className="t-micro m-0 mt-1">{BANNIERE_ED.ordreAide}</p>
                </div>
                <ol className={c.pile} aria-label={BANNIERE_ED.ordre}>
                  {[...vue.ordre].reverse().map((k) =>
                    k === "cadre" ? (
                      <li key={k} className={c.rang} data-fixe="true" data-ordre="cadre">
                        <span className={c.rangNom}>
                          {BANNIERE_ED.cadre} · {BANNIERE_ED.cadreSite}
                        </span>
                      </li>
                    ) : (
                      <li key={k} className={c.rang} data-choisi={sel === k ? "true" : "false"} data-ordre={k}>
                        <button type="button" className={`${c.rangNom} cursor-pointer`} onClick={() => setSel(k)} aria-pressed={sel === k}>
                          {VOIR[k]}
                          {!vue[k].image && <span className="font-normal text-muted"> · {BANNIERE_ED.vide}</span>}
                          <span className="t-micro block font-normal">{devantLeCadre(vue.ordre, k) ? BANNIERE_ED.devantCadre : BANNIERE_ED.derriereCadre}</span>
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm !min-h-[40px] !px-2" disabled={!peutPousser(vue.ordre, k, 1)} onClick={() => maj((comp) => ({ ...comp, ordre: pousser(comp.ordre, k, 1) }))} aria-label={`${BANNIERE_ED.devant} : ${VOIR[k]}`} title={BANNIERE_ED.devant}>
                          <ArrowUp size={15} aria-hidden />
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm !min-h-[40px] !px-2" disabled={!peutPousser(vue.ordre, k, -1)} onClick={() => maj((comp) => ({ ...comp, ordre: pousser(comp.ordre, k, -1) }))} aria-label={`${BANNIERE_ED.derriere} : ${VOIR[k]}`} title={BANNIERE_ED.derriere}>
                          <ArrowDown size={15} aria-hidden />
                        </button>
                      </li>
                    ),
                  )}
                  <li className={c.rang} data-fixe="true" data-ordre="fond">
                    <span className={c.rangNom}>{BANNIERE_ED.fond}</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* le panneau de gauche : l'aperçu de la carte complète et ce qu'on y met */}
          <div className="flex flex-col gap-4 border-t border-line pt-5" data-panneau-editeur="">
            <div>
              <h3 className="t-eyebrow m-0">{BANNIERE_ED.panneau}</h3>
              <p className="t-small m-0 mt-1 max-w-[680px]">{BANNIERE_ED.panneauAide}</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)] lg:items-start">
              <div className="mx-auto w-full max-w-[400px] lg:sticky lg:top-24 lg:max-w-none" role="img" aria-label={BANNIERE_ED.panneauApercu}>
                <ApercuCarte composition={base} panneau={panneau} fond={fond} />
              </div>
              <div className="min-w-0 max-w-[520px]">
                <ChoixPanneau panneau={base.panneau} badges={badges} donnees={donnees} onChange={changerPanneau} />
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
