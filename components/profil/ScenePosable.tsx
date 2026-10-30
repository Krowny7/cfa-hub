"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { BanniereComposee, styleCalque } from "@/components/profil/BanniereComposee";
import { NOMS_ELEMENTS, hauteurCalque, type Calque, type CleCalque, type CleImage, type Composition } from "@/lib/profil/banniere";
import { avancerGeste, commencerGeste, finDeGeste, memeCalque, parClavier, pointDeScene, poigneesDe, type Geste, type Poignee } from "@/lib/profil/banniere-edition";
import { BANNIERE_ED } from "@/lib/voice-banniere";
import c from "./EditeurBanniere.module.css";

// La scène de l'éditeur de bannière : l'aperçu en grand (BanniereComposee, le
// même rendu que le profil et le podium) avec sa zone de débordement bordée
// de pointillés, et par-dessus, de quoi poser les calques à la main.
//   - Le calque choisi a un CADRE : on le DÉPLACE en le glissant (souris,
//     doigt et stylet : pointer events), on le REDIMENSIONNE par ses poignées
//     (quatre coins, huit quand les proportions sont libres), on le bouge aux
//     flèches (Maj : plus vite) et on le grossit avec + et −.
//   - Les autres calques et le fond se choisissent d'un toucher (ils ne
//     capturent ni le défilement de la page ni le glisser).
// Pendant un geste, la scène ne parle qu'à son parent par `onVivre` (le
// calque en cours, pour l'aperçu et les curseurs) ; le calque ne s'enregistre
// dans le brouillon qu'au relâcher (`onValider`), une seule fois. Un geste
// sans effet (un simple toucher) n'enregistre rien. Les mouvements partent
// toujours du calque de départ (lib/profil/banniere-edition.ts : bornes de la
// zone de débordement respectées, aucune dérive). Le pointeur est capturé
// par l'élément qui l'a reçu : pas d'écouteur sur la fenêtre, donc rien à
// retirer ; un geste interrompu (pointercancel) rend le calque à sa place.

const LIBELLES_POIGNEE: Record<Poignee, string> = {
  nw: "coin haut gauche",
  n: "bord haut",
  ne: "coin haut droit",
  e: "bord droit",
  se: "coin bas droit",
  s: "bord bas",
  sw: "coin bas gauche",
  w: "bord gauche",
};

export function ScenePosable({
  composition,
  selection,
  fond,
  onSelect,
  onVivre,
  onValider,
}: {
  /** la composition à montrer, calque en cours de geste compris */
  composition: Composition;
  selection: CleImage;
  /** le fond du profil, quand le joueur n'a pas envoyé le sien */
  fond?: ReactNode;
  onSelect: (cle: CleImage) => void;
  /** le calque en cours de geste (null : le geste est abandonné) */
  onVivre: (cle: CleCalque, k: Calque | null) => void;
  /** le calque au relâcher, ou après une touche */
  onValider: (cle: CleCalque, k: Calque) => void;
}) {
  const racine = useRef<HTMLDivElement | null>(null);
  const session = useRef<Geste | null>(null);
  // un geste en cours quand la scène disparaît, ou quand un autre calque est choisi : rien à retirer (pas d'écouteur de fenêtre), on oublie seulement la session
  useEffect(() => {
    session.current = null;
    return () => {
      session.current = null;
    };
  }, [selection]);

  const debut = (e: PointerEvent<HTMLElement>, mode: Geste["mode"], cle: CleCalque) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // un seul doigt à la fois : un deuxième pointeur ne reprend pas le geste en cours
    if (session.current && session.current.id !== e.pointerId) return;
    const r = racine.current?.getBoundingClientRect();
    if (!r) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    session.current = commencerGeste(e.pointerId, mode, cle, composition[cle], pointDeScene(e.clientX, e.clientY, r));
  };
  const bouge = (e: PointerEvent<HTMLElement>) => {
    const s = session.current;
    const r = racine.current?.getBoundingClientRect();
    if (!s || !r || e.pointerId !== s.id) return;
    e.stopPropagation();
    const suite = avancerGeste(s, pointDeScene(e.clientX, e.clientY, r));
    session.current = suite;
    onVivre(suite.cle, suite.dernier);
  };
  const fin = (e: PointerEvent<HTMLElement>, valider: boolean) => {
    const s = session.current;
    if (!s || e.pointerId !== s.id) return;
    e.stopPropagation();
    session.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    // un simple toucher n'écrit rien dans le brouillon
    const final = valider ? finDeGeste(s) : null;
    if (final) onValider(s.cle, final);
    else onVivre(s.cle, null);
  };
  const gestes = (mode: Geste["mode"], cle: CleCalque) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => debut(e, mode, cle),
    onPointerMove: bouge,
    onPointerUp: (e: PointerEvent<HTMLElement>) => fin(e, true),
    onPointerCancel: (e: PointerEvent<HTMLElement>) => fin(e, false),
    onLostPointerCapture: (e: PointerEvent<HTMLElement>) => fin(e, true),
  });

  const touche = (e: KeyboardEvent<HTMLElement>, cle: CleCalque) => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = parClavier(composition[cle], e.key, e.shiftKey);
    if (!k) return;
    e.preventDefault();
    if (!memeCalque(k, composition[cle])) onValider(cle, k);
  };

  const calqueChoisi = selection !== "fond" ? composition[selection] : null;
  // ce qui se choisit d'un toucher : le fond, puis les calques qui ont une image, dans l'ordre d'empilement (le plus en avant capte en dernier)
  const choisissables = composition.ordre.filter((k): k is CleCalque => k !== "cadre" && k !== selection && !!composition[k].image);

  return (
    <div className={c.scene} ref={racine} data-scene-posable="">
      {/* la marge de débordement : pointillés et damier léger (le transparent) */}
      <span aria-hidden className={c.debord}>
        <span className={c.legende}>{BANNIERE_ED.zoneDebord}</span>
      </span>
      <BanniereComposee composition={composition} fond={fond} charge="eager" />
      {/* les repères : où se tient la bannière elle-même */}
      <span aria-hidden className={c.repere} data-actif={selection === "fond" ? "true" : "false"} />
      <div className={c.calques}>
        {selection !== "fond" && (
          <button type="button" tabIndex={-1} aria-hidden className={c.zoneFond} onClick={() => onSelect("fond")} />
        )}
        {choisissables.map((k) => (
          <button key={k} type="button" tabIndex={-1} aria-hidden className={c.zoneCalque} style={styleCalque(composition[k])} onClick={() => onSelect(k)} data-choisir={k} />
        ))}
        {calqueChoisi && selection !== "fond" && composition[selection].image && (
          <div
            className={c.selection}
            style={styleCalque(calqueChoisi)}
            tabIndex={0}
            role="group"
            aria-roledescription="calque à placer"
            aria-label={`${NOMS_ELEMENTS[selection]} : gauche ${calqueChoisi.x} %, haut ${calqueChoisi.y} %, largeur ${calqueChoisi.l} %, hauteur ${Math.round(hauteurCalque(calqueChoisi) * 10) / 10} %. ${BANNIERE_ED.clavier}`}
            data-selection={selection}
            onKeyDown={(e) => touche(e, selection)}
            {...gestes("deplacer", selection)}
          >
            {poigneesDe(calqueChoisi).map((p) => (
              <span key={p} className={c.poignee} data-poignee={p} title={`Redimensionner : ${LIBELLES_POIGNEE[p]}`} {...gestes(p, selection)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
