"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Minus, PanelRightClose, PanelRightOpen, Plus, LocateFixed } from "lucide-react";
import { INK } from "@/components/ui/InkDefs";
import type { LigneQuete, VueActe, VueBranche, VueChaine, VueCodex, VueContrat } from "@/lib/codex/vue";
import { CODEX, romain } from "@/lib/voice-codex";
import { Sceau, libelleSceau } from "@/components/codex/Sceau";
import { JaugePinceau } from "@/components/codex/JaugePinceau";
import { FilRouge } from "@/components/codex/FilRouge";
import { Feuille } from "@/components/ui/Feuille";
import e from "./Encre.module.css";
import c from "./Carte.module.css";

// L'arbre du Codex, en deux formes.
//   Ordinateur : une grande page de carnet qu'on fait glisser et qu'on
//   zoome (pointeur, Ctrl + molette, pincement, boutons + / −), ouverte centrée sur
//   « tu es ici ». Le tronc, ce sont les actes (du prologue en bas à
//   l'épilogue en haut) ; les dix branches de matière partent de l'acte II ;
//   les exploits tiennent dans un médaillon au-dessus du tronc, qui ouvre leur
//   galerie. La molette fait défiler la page ; Ctrl + molette et le pincement
//   zooment. Les noms de matières compensent le zoom (jamais sous 12 px).
//   À côté de la carte (à partir de 1 180 px), sinon sous elle et repliée :
//   la colonne des contrats du jour et des quêtes au long cours.
//   Téléphone : un chemin vertical par acte ou par branche, l'étape en cours
//   en grand avec son « ! », et un sélecteur.
// Tous les traits sont au pinceau (tracé partagé INK.swash, <use href>) ;
// chaque quête est un sceau tamponné (components/codex/Sceau).

type Montre = (quoi: string) => boolean;
type SurQuete = (l: LigneQuete) => void;
type SurActe = (a: VueActe) => void;

export const etiquetteActe = (a: VueActe["acte"]) => (a.numero === 0 ? "Prologue" : a.numero >= 99 ? "Épilogue" : `Acte ${romain(a.numero)}`);
export const chiffreActe = (a: VueActe["acte"]) => (a.numero === 0 ? "P" : a.numero >= 99 ? "É" : romain(a.numero));
const etatActe = (a: VueActe): LigneQuete["etat"] => (a.clos ? "terminee" : a.courant ? (a.faites > 0 ? "active" : "disponible") : "verrouillee");
const ligneActe = (a: VueActe) => ({ etat: etatActe(a), fraction: a.total ? a.faites / a.total : 0, affichage: "complet" as const, retro: false });
const visibles = (l: LigneQuete[]) => l.filter((q) => q.affichage !== "cache");
const nomEtape = (l: LigneQuete) => (l.etape ? CODEX.branches.etapes[l.etape] : l.titre);

/** Un trait de pinceau d'un point à un autre (le tracé partagé, étiré et tourné). */
function Trait({ x1, y1, x2, y2, ep = 10, className }: { x1: number; y1: number; x2: number; y2: number; ep?: number; className?: string }) {
  const long = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <g transform={`translate(${x1} ${y1}) rotate(${angle})`} className={className}>
      <svg x={0} y={-ep / 2} width={long} height={ep} viewBox="0 0 400 64" preserveAspectRatio="none" overflow="visible">
        <use href={INK.swash} fill="currentColor" />
      </svg>
    </g>
  );
}

/** « Tu es ici » : l'anneau au pinceau du site (tracé partagé INK.ring), à l'or, qui respire. */
function Ici({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <svg className={`${c.ici} rl-deco`} viewBox="0 0 240 240" width={r * 2} height={r * 2} style={{ left: x - r, top: y - r }} aria-hidden>
      <use href={INK.ring} fill="currentColor" />
    </svg>
  );
}

/** La quête « d'où l'on part » : celle que le moteur recommande, sinon la première ouverte. */
function premiereOuverte(l: LigneQuete[]): LigneQuete | undefined {
  return l.find((q) => q.etat === "active") ?? l.find((q) => q.etat === "disponible");
}

/* ================================================================== */
/* L'arbre (ordinateur)                                                */
/* ================================================================== */

const W = 2000;
const H = 1660;
const CX = 1000;
const BX = 330;
const PAS_ACTE = 130;
const yActe = (i: number) => 1520 - i * PAS_ACTE;

type Noeud = {
  cle: string;
  x: number;
  y: number;
  t: number;
  l: Pick<LigneQuete, "etat" | "fraction" | "affichage" | "retro">;
  signe?: string;
  label: string;
  ouvrir: () => void;
  ici?: boolean;
};

function useGeometrie(vue: VueCodex, montre: Montre, onQuete: SurQuete, onActe: SurActe) {
  return useMemo(() => {
    const noeuds: Noeud[] = [];
    const traits: React.ReactNode[] = [];
    const etiquettes: React.ReactNode[] = [];
    const n = vue.trame.length;
    const iBase = Math.max(0, Math.min(n - 1, vue.trame.findIndex((a) => a.acte.numero === 2) === -1 ? 2 : vue.trame.findIndex((a) => a.acte.numero === 2)));
    const yBase = yActe(iBase);
    const yHaut = yActe(n - 1);
    const p = vue.prochaine?.ligne;
    let ici: { x: number; y: number } | null = null;

    // le tronc
    traits.push(<Trait key="tronc" x1={CX} y1={yActe(0) + 80} x2={CX} y2={yHaut - 40} ep={26} className={c.tronc} />);
    vue.trame.forEach((a, i) => {
      const y = yActe(i);
      const droite = i % 2 === 0;
      const contient = !!p && a.quetes.some((q) => q.id === p.id);
      if (a.courant || contient) ici ??= { x: CX, y };
      noeuds.push({ cle: "acte:" + a.acte.id, x: CX, y, t: 66, l: ligneActe(a), signe: chiffreActe(a.acte), label: `${etiquetteActe(a.acte)}, ${a.acte.titre}, ${a.faites} sur ${a.total}`, ouvrir: () => onActe(a) });
      etiquettes.push(
        <span key={"ea" + a.acte.id} className={`${c.etiquetteActe} ${droite ? c.aDroite : c.aGauche} ${!a.clos && !a.courant ? c.pale : ""}`} style={{ left: droite ? CX + 48 : undefined, right: droite ? undefined : W - CX + 48, top: i === iBase ? y - 62 : y - 26 }}>
          <span className={c.plume}>{a.acte.titre}</span>
          <span className={c.mono}>
            {etiquetteActe(a.acte)} · {a.faites}/{a.total}
          </span>
        </span>,
      );
    });

    // les branches, de l'acte II
    if (montre("codex:branches") && vue.branches.length) {
      const rangs = Math.ceil(vue.branches.length / 2);
      const yRang = (r: number) => yBase - 75 - r * 125;
      for (const cote of [-1, 1]) {
        const xB = CX + cote * BX;
        traits.push(<Trait key={"bh" + cote} x1={CX} y1={yBase} x2={xB} y2={yBase} ep={14} className={c.branche} />);
        traits.push(<Trait key={"bv" + cote} x1={xB} y1={yBase + 6} x2={xB} y2={yRang(rangs - 1) - 4} ep={13} className={c.branche} />);
      }
      vue.branches.forEach((b, k) => {
        const cote = k < rangs ? -1 : 1;
        const y = yRang(k % rangs);
        const etapes = visibles(b.etapes);
        const xJ = (j: number) => CX + cote * (BX + 62 + j * 64);
        traits.push(<Trait key={"br" + b.contenu.key} x1={CX + cote * BX} y1={y} x2={xJ(Math.max(0, etapes.length - 1))} y2={y} ep={8} className={c.rameau} />);
        const courante = premiereOuverte(etapes);
        etapes.forEach((q, j) => {
          const estIci = !!p && q.id === p.id;
          if (estIci) ici = { x: xJ(j), y };
          noeuds.push({ cle: q.id, x: xJ(j), y, t: q === courante ? 46 : 38, l: q, signe: estIci ? "!" : undefined, label: `${b.contenu.court}, ${nomEtape(q)} : ${libelleSceau(q)}`, ouvrir: () => onQuete(q), ici: estIci });
        });
        etiquettes.push(
          <span key={"eb" + b.contenu.key} className={`${c.etiquetteBranche} ${cote < 0 ? c.aGauche : c.aDroite}`} style={{ left: cote > 0 ? CX + BX + 40 : undefined, right: cote < 0 ? W - CX + BX + 40 : undefined, bottom: H - y + 24 }}>
            <span className="font-brand">{b.contenu.court}</span>
            <span className={c.mono}>
              {b.faites}/{b.total}
              {b.maitre ? " · Maître" : ""}
            </span>
          </span>,
        );
      });
    } else {
      etiquettes.push(
        <span key="blanche-b" className={`${c.blanche} ${c.aDroite}`} style={{ left: CX + BX + 20, top: yBase - 230 }}>
          {CODEX.pageBlanche}
        </span>,
      );
    }

    // les exploits : un seul médaillon au-dessus du tronc (relié par un
    // pointillé), qui ouvre la galerie nommée ; la couronne de points d'avant
    // ne se lisait pas une fois la carte dézoomée
    let medaillon: { x: number; y: number; gagnes: number; total: number } | null = null;
    if (montre("codex:exploits") && vue.exploits.length) {
      const y = yHaut - 210;
      traits.push(<line key="vers-exploits" x1={CX} y1={yHaut - 56} x2={CX} y2={y + T_MEDAILLON / 2 + 12} className={c.pointille} />);
      medaillon = { x: CX, y, gagnes: vue.exploits.filter((q) => q.etat === "terminee").length, total: vue.exploits.length };
    }

    ici ??= { x: CX, y: yActe(Math.max(0, vue.trame.findIndex((a) => a.courant))) };
    return { noeuds, traits, etiquettes, ici, medaillon };
  }, [vue, montre, onQuete, onActe]);
}

const T_MEDAILLON = 124;

/** Le médaillon des exploits, sur la carte : un grand sceau dont l'or monte avec les exploits gagnés. */
function Medaillon({ m, onOuvrir, onFocus }: { m: { x: number; y: number; gagnes: number; total: number }; onOuvrir: () => void; onFocus: () => void }) {
  const l = { etat: (m.gagnes >= m.total ? "terminee" : m.gagnes > 0 ? "active" : "disponible") as LigneQuete["etat"], fraction: m.total ? m.gagnes / m.total : 0, affichage: "complet" as const, retro: false };
  return (
    <button
      type="button"
      className={c.medaillon}
      style={{ left: m.x - T_MEDAILLON / 2, top: m.y - T_MEDAILLON / 2, height: T_MEDAILLON }}
      onClick={onOuvrir}
      onFocus={onFocus}
      aria-haspopup="dialog"
      aria-label={`${CODEX.exploits.titre} : ${m.gagnes} sur ${m.total}. Ouvrir la galerie`}
    >
      <Sceau l={l} taille={T_MEDAILLON} />
      <span className={c.medaillonMot} aria-hidden>
        <span className={c.plume}>Exploits</span>
        <span className={c.mono}>
          {m.gagnes}/{m.total}
        </span>
      </span>
    </button>
  );
}

/** La galerie des exploits : chacun avec son nom (ou son indice, s'il est caché), les tamponnés d'abord. */
function GalerieExploits({ exploits, onQuete }: { exploits: LigneQuete[]; onQuete: SurQuete }) {
  const rang = { terminee: 0, active: 1, disponible: 2, verrouillee: 3 } as const;
  const liste = visibles(exploits)
    .map((q, i) => ({ q, i }))
    .sort((a, b) => rang[a.q.etat] - rang[b.q.etat] || a.i - b.i)
    .map((x) => x.q);
  const caches = exploits.length - liste.length;
  return (
    <div className={e.carnet}>
      <p className={c.repliqueChemin} style={{ marginTop: 0 }}>
        « {CODEX.exploits.sous} »
      </p>
      <ul className={c.galerie}>
        {liste.map((q) => {
          const enigme = q.affichage === "indice" && q.etat !== "terminee";
          return (
            <li key={q.id + q.periode}>
              <button type="button" className={c.compacte} onClick={() => onQuete(q)} aria-haspopup="dialog" aria-label={enigme ? `Exploit caché : ${q.indice ?? CODEX.exploits.enigme}` : libelleSceau(q)}>
                <Sceau l={q} taille={40} />
                <span className="min-w-0 flex-1">
                  <span className={c.compacteTitre}>{enigme ? CODEX.exploits.enigme : q.titre}</span>
                  <span className={c.galerieSous}>{enigme ? (q.indice ?? CODEX.etat[q.etat]) : q.etat === "active" && q.cible > 1 ? `${Math.floor(q.valeur)}/${Math.floor(q.cible)}` : CODEX.etat[q.etat]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {caches > 0 && <p className="t-micro m-0 mt-3 text-center">{caches === 1 ? "Et un exploit dont je ne dis rien." : `Et ${caches} exploits dont je ne dis rien.`}</p>}
    </div>
  );
}

// le point visé à l'ouverture : à mi-chemin entre « tu es ici » et le tronc,
// pour que l'étape en cours ET les actes (et leurs noms) tiennent dans la vue
const vise = (p: { x: number; y: number }) => ({ x: (p.x + CX) / 2, y: p.y });

const Z_MIN = 0.32;
const Z_DEPART = (rw: number) => (rw < 1100 ? 0.54 : 0.66);
const Z_MAX = 1.6;
// la colonne « Aujourd'hui » se tient à côté de la carte à partir de cette
// largeur d'écran (Carte.module.css, .zone) ; en dessous, elle passe sous la
// carte, repliée
const LARGE = "(min-width: 1180px)";

export function ArbreCodex({ vue, montre, onQuete, onActe, colonne }: { vue: VueCodex; montre: Montre; onQuete: SurQuete; onActe: SurActe; colonne: React.ReactNode }) {
  // la colonne part repliée tant qu'elle n'a rien à montrer (nouveau compte)
  const colonneUtile = montre("codex:contrats") || montre("codex:longcours");
  const { noeuds, traits, etiquettes, ici, medaillon } = useGeometrie(vue, montre, onQuete, onActe);
  const boite = useRef<HTMLDivElement | null>(null);
  const monde = useRef<HTMLDivElement | null>(null);
  const cam = useRef({ tx: 0, ty: 0, z: 0.8, pret: false, w: 0, h: 0 });
  const pointeurs = useRef(new Map<number, { x: number; y: number }>());
  const geste = useRef<{ x: number; y: number; tx: number; ty: number; bouge: boolean } | null>(null);
  const pince = useRef<{ d: number; z: number } | null>(null);
  // null : l'état par défaut, réglé en CSS (à côté de la carte à partir de
  // 1 180 px, repliée sous elle en dessous) ; sinon, le choix du joueur
  const [colChoix, setColChoix] = useState<boolean | null>(colonneUtile ? null : false);
  const [large, setLarge] = useState(false);
  const colOuverte = colChoix ?? large;
  const [galerie, setGalerie] = useState(false);
  const [astuce, setAstuce] = useState(false);
  const minuteur = useRef<number | undefined>(undefined);

  useEffect(() => {
    const mq = window.matchMedia(LARGE);
    const maj = () => setLarge(mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);

  const appliquer = useCallback(() => {
    const b = boite.current;
    const m = monde.current;
    if (!b || !m) return;
    const { width: rw, height: rh } = b.getBoundingClientRect();
    const k = cam.current;
    const bw = W * k.z;
    const bh = H * k.z;
    const marge = 160;
    k.tx = bw + 2 * marge < rw ? (rw - bw) / 2 : Math.min(marge, Math.max(rw - bw - marge, k.tx));
    k.ty = bh + 2 * marge < rh ? (rh - bh) / 2 : Math.min(marge, Math.max(rh - bh - marge, k.ty));
    m.style.transform = `translate(${k.tx}px, ${k.ty}px) scale(${k.z})`;
    // l'inverse du zoom : les noms de matières le compensent (jamais sous 12 px à l'écran)
    m.style.setProperty("--zinv", (1 / k.z).toFixed(3));
  }, []);

  const centrer = useCallback(
    (pt: { x: number; y: number }, z?: number) => {
      const b = boite.current;
      if (!b) return;
      const { width: rw, height: rh } = b.getBoundingClientRect();
      if (!rw) return;
      const k = cam.current;
      k.z = z ?? k.z;
      k.tx = rw / 2 - pt.x * k.z;
      k.ty = rh / 2 - pt.y * k.z;
      k.pret = true;
      appliquer();
    },
    [appliquer],
  );

  const zoomer = useCallback(
    (nz: number, mx?: number, my?: number) => {
      const b = boite.current;
      if (!b) return;
      const r = b.getBoundingClientRect();
      const k = cam.current;
      const z = Math.min(Z_MAX, Math.max(Z_MIN, nz));
      const x = mx ?? r.width / 2;
      const y = my ?? r.height / 2;
      k.tx = x - ((x - k.tx) * z) / k.z;
      k.ty = y - ((y - k.ty) * z) / k.z;
      k.z = z;
      appliquer();
    },
    [appliquer],
  );

  // ouverte centrée sur « tu es ici », dès que la carte a une taille (elle est
  // cachée sur téléphone) ; ensuite, quand la carte change de taille (la
  // colonne se plie ou se déplie), le centre de la vue reste en place
  useEffect(() => {
    const b = boite.current;
    if (!b) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = b.getBoundingClientRect();
      if (!width) return;
      const k = cam.current;
      if (!k.pret) centrer(vise(ici), Z_DEPART(width));
      else {
        k.tx += (width - k.w) / 2;
        k.ty += (height - k.h) / 2;
        appliquer();
      }
      k.w = width;
      k.h = height;
    });
    ro.observe(b);
    return () => ro.disconnect();
  }, [ici, centrer, appliquer]);

  // la molette seule fait défiler la page (un mot rappelle le geste du zoom) ;
  // Ctrl (ou ⌘) + molette zoome autour du pointeur, comme le pincement du pavé
  // tactile, que le navigateur envoie avec ctrlKey (écouteur non passif : on
  // garde alors la page en place)
  useEffect(() => {
    const b = boite.current;
    if (!b) return;
    const roue = (ev: WheelEvent) => {
      if (!ev.ctrlKey && !ev.metaKey) {
        setAstuce(true);
        window.clearTimeout(minuteur.current);
        minuteur.current = window.setTimeout(() => setAstuce(false), 1600);
        return;
      }
      ev.preventDefault();
      const r = b.getBoundingClientRect();
      const dy = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
      // un cran de molette : ×1,2 ; le pincement (petits pas réguliers) : en proportion
      const pas = Math.abs(dy) >= 40 ? Math.sign(dy) * 0.18 : dy * 0.01;
      zoomer(cam.current.z * Math.exp(-pas), ev.clientX - r.left, ev.clientY - r.top);
    };
    b.addEventListener("wheel", roue, { passive: false });
    return () => {
      b.removeEventListener("wheel", roue);
      window.clearTimeout(minuteur.current);
    };
  }, [zoomer]);

  const bas = (ev: React.PointerEvent) => {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    if ((ev.target as HTMLElement).closest("[data-hors-carte]")) return;
    pointeurs.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const k = cam.current;
    if (pointeurs.current.size === 2) {
      const [a, b] = [...pointeurs.current.values()];
      pince.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: k.z };
      geste.current = geste.current ? { ...geste.current, bouge: true } : null;
    } else geste.current = { x: ev.clientX, y: ev.clientY, tx: k.tx, ty: k.ty, bouge: false };
  };
  const bouge = (ev: React.PointerEvent) => {
    if (!pointeurs.current.has(ev.pointerId)) return;
    pointeurs.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const b = boite.current!;
    if (pointeurs.current.size === 2 && pince.current) {
      const [p1, p2] = [...pointeurs.current.values()];
      const r = b.getBoundingClientRect();
      zoomer((pince.current.z * Math.hypot(p1.x - p2.x, p1.y - p2.y)) / pince.current.d, (p1.x + p2.x) / 2 - r.left, (p1.y + p2.y) / 2 - r.top);
      return;
    }
    const g = geste.current;
    if (!g) return;
    const dx = ev.clientX - g.x;
    const dy = ev.clientY - g.y;
    if (!g.bouge && Math.hypot(dx, dy) > 5) {
      g.bouge = true;
      b.setPointerCapture(ev.pointerId);
    }
    if (g.bouge) {
      cam.current.tx = g.tx + dx;
      cam.current.ty = g.ty + dy;
      appliquer();
    }
  };
  const haut = (ev: React.PointerEvent) => {
    pointeurs.current.delete(ev.pointerId);
    if (pointeurs.current.size < 2) pince.current = null;
    if (pointeurs.current.size === 0) setTimeout(() => (geste.current = null), 0);
  };

  const clavier = (ev: React.KeyboardEvent) => {
    if (ev.target !== boite.current) return;
    const k = cam.current;
    const pas = 80;
    const fl: Record<string, [number, number]> = { ArrowLeft: [pas, 0], ArrowRight: [-pas, 0], ArrowUp: [0, pas], ArrowDown: [0, -pas] };
    if (fl[ev.key]) {
      ev.preventDefault();
      k.tx += fl[ev.key][0];
      k.ty += fl[ev.key][1];
      appliquer();
    } else if (ev.key === "+" || ev.key === "=") zoomer(k.z * 1.2);
    else if (ev.key === "-") zoomer(k.z / 1.2);
  };

  // un sceau atteint au clavier hors de la vue : la carte vient à lui
  const voir = (x: number, y: number) => {
    const b = boite.current;
    if (!b) return;
    const r = b.getBoundingClientRect();
    const k = cam.current;
    const sx = k.tx + x * k.z;
    const sy = k.ty + y * k.z;
    if (sx < 40 || sy < 40 || sx > r.width - 40 || sy > r.height - 40) centrer({ x, y });
  };

  const exploitsGagnes = medaillon?.gagnes ?? 0;
  const contratsFaits = vue.contrats.filter((ct) => ct.ligne.etat === "terminee").length;

  return (
    <div className={c.zone} data-col={colChoix === null ? "auto" : colChoix ? "1" : "0"}>
      <div className={`${c.arbreCadre} ${e.carnet}`}>
        <div
          ref={boite}
          className={c.arbre}
          tabIndex={0}
          role="group"
          aria-label="La carte du Codex. Fais glisser pour te déplacer ; Ctrl + molette, pincement ou boutons pour zoomer ; flèches au clavier."
          onPointerDown={bas}
          onPointerMove={bouge}
          onPointerUp={haut}
          onPointerCancel={haut}
          onClickCapture={(ev) => {
            if (geste.current?.bouge) {
              ev.stopPropagation();
              ev.preventDefault();
            }
          }}
          onKeyDown={clavier}
        >
          <div
            ref={monde}
            className={c.monde}
            style={{ width: W, height: H, transform: `translate(${430 - vise(ici).x * 0.66}px, ${330 - ici.y * 0.66}px) scale(0.66)`, ["--zinv" as string]: (1 / 0.66).toFixed(3) }}
          >
            <svg className={c.traits} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
              {traits}
            </svg>
            {etiquettes}
            <Ici x={ici.x} y={ici.y} r={60} />
            <span className={c.iciMot} style={{ left: ici.x + 44, top: ici.y + 26 }} aria-hidden>
              ta prochaine
            </span>
            {medaillon && <Medaillon m={medaillon} onOuvrir={() => setGalerie(true)} onFocus={() => voir(medaillon.x, medaillon.y)} />}
            {noeuds.map((nd) => (
              <button
                key={nd.cle}
                type="button"
                className={c.noeud}
                style={{ left: nd.x - nd.t / 2, top: nd.y - nd.t / 2, width: nd.t, height: nd.t }}
                aria-label={nd.label}
                aria-haspopup="dialog"
                title={nd.label}
                onClick={nd.ouvrir}
                onFocus={() => voir(nd.x, nd.y)}
              >
                <Sceau l={nd.l} taille={nd.t} signe={nd.signe} />
              </button>
            ))}
          </div>
        </div>

        <div className={c.outils} data-hors-carte>
          <button type="button" className={c.outil} onClick={() => zoomer(cam.current.z * 1.25)} aria-label="Zoomer">
            <Plus size={17} aria-hidden />
          </button>
          <button type="button" className={c.outil} onClick={() => zoomer(cam.current.z / 1.25)} aria-label="Dézoomer">
            <Minus size={17} aria-hidden />
          </button>
          <button type="button" className={c.outil} onClick={() => centrer(vise(ici), Z_DEPART(boite.current?.getBoundingClientRect().width ?? 1200))}>
            <LocateFixed size={16} aria-hidden /> Où j'en suis
          </button>
        </div>

        <Legende />
        <p className={`${c.astuce} ${astuce ? c.astuceOn : ""}`} aria-hidden>
          Ctrl + molette, ou pincement, pour zoomer
        </p>
      </div>

      <aside className={`${c.colonne} ${e.carnet}`} aria-label="Aujourd'hui et au long cours">
        <button type="button" className={c.colonneBascule} onClick={() => setColChoix(!colOuverte)} aria-expanded={colOuverte} aria-controls="codex-colonne">
          <span className={c.colonneMot}>
            <span className={c.plume}>Aujourd'hui</span>
            <span className={c.mono}>
              {vue.contrats.length ? `${contratsFaits}/${vue.contrats.length} contrats · ` : ""}
              au long cours
            </span>
          </span>
          <span className="sr-only">{colOuverte ? "Replier la colonne" : "Déplier la colonne"}</span>
          {large ? colOuverte ? <PanelRightClose size={17} aria-hidden /> : <PanelRightOpen size={17} aria-hidden /> : <ChevronDown size={18} aria-hidden className={colOuverte ? c.retourne : undefined} />}
        </button>
        <div id="codex-colonne" className={c.colonneCorps}>
          {colonne}
        </div>
      </aside>

      <Feuille ouvert={galerie} onFermer={() => setGalerie(false)} titre={`${CODEX.exploits.titre} · ${exploitsGagnes}/${vue.exploits.length}`}>
        <GalerieExploits
          exploits={vue.exploits}
          onQuete={(q) => {
            setGalerie(false);
            onQuete(q);
          }}
        />
      </Feuille>
    </div>
  );
}

function Legende() {
  const l = (etat: LigneQuete["etat"], fraction = 0.5) => ({ etat, fraction, affichage: "complet" as const, retro: false });
  return (
    <ul className={c.legende} data-hors-carte aria-label="Légende">
      <li>
        <Sceau l={l("terminee")} taille={18} /> tamponnée
      </li>
      <li>
        <Sceau l={l("active")} taille={18} /> en cours
      </li>
      <li>
        <Sceau l={l("disponible")} taille={18} /> à prendre
      </li>
      <li>
        <Sceau l={l("verrouillee")} taille={18} /> à conquérir
      </li>
    </ul>
  );
}

/* ================================================================== */
/* La colonne : aujourd'hui, au long cours                             */
/* ================================================================== */

export function Colonne({ vue, montre, onQuete, onChanger, occupe }: { vue: VueCodex; montre: Montre; onQuete: SurQuete; onChanger: (c: VueContrat) => void; occupe: boolean }) {
  return (
    <>
      <section aria-labelledby="col-jour" data-leonard="contrats">
        <h2 id="col-jour" className={c.colTitre}>
          Aujourd'hui
        </h2>
        {!montre("codex:contrats") ? (
          <p className={c.blancheCol}>{CODEX.pageBlanche}</p>
        ) : vue.contrats.length === 0 ? (
          <p className={c.blancheCol}>Les contrats d'aujourd'hui se tirent à la première visite du jour.</p>
        ) : (
          <>
            <ul className={c.colListe}>
              {vue.contrats.map((ct) => (
                <li key={ct.emplacement}>
                  <LigneCompacte l={ct.ligne} sur={CODEX.contrats.emplacement[ct.emplacement]} onQuete={onQuete} />
                  {ct.ligne.etat !== "terminee" && ct.changeable && (
                    <button type="button" className={e.lienDiscret} style={{ marginLeft: 46, fontSize: 12 }} disabled={occupe} onClick={() => onChanger(ct)} title={CODEX.contrats.changerAide}>
                      {CODEX.contrats.changer}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="t-micro m-0 mt-2">{vue.trio.fait ? CODEX.contrats.trioFait(vue.trio.xp) : `${CODEX.contrats.trio(vue.trio.xp)} (${vue.trio.faits}/${vue.trio.total})`}</p>
          </>
        )}
      </section>
      <section aria-labelledby="col-long" data-leonard="longcours" className="mt-5">
        <h2 id="col-long" className={c.colTitre}>
          {CODEX.longCours.titre}
        </h2>
        {!montre("codex:longcours") ? <p className={c.blancheCol}>{CODEX.pageBlanche}</p> : <ChainesCompactes chaines={vue.longCours} onQuete={onQuete} />}
      </section>
      {/* le fil rouge, sous les chaînes (V3 §1.5) : dévoilé avec elles */}
      {montre("codex:longcours") && <FilRouge fil={vue.filRouge} onQuete={onQuete} />}
    </>
  );
}

function LigneCompacte({ l, sur, onQuete }: { l: LigneQuete; sur?: string; onQuete: SurQuete }) {
  return (
    <button type="button" className={c.compacte} onClick={() => onQuete(l)} aria-label={libelleSceau(l)} aria-haspopup="dialog">
      <Sceau l={l} taille={34} />
      <span className="min-w-0 flex-1">
        {sur && <span className={c.compacteSur}>{sur}</span>}
        <span className={c.compacteTitre}>{l.titre}</span>
        {l.cible > 1 && l.etat !== "terminee" && <JaugePinceau fraction={l.fraction} or={l.etat === "active"} className="mt-1.5" />}
      </span>
    </button>
  );
}

export function ChainesCompactes({ chaines, onQuete }: { chaines: VueChaine[]; onQuete: SurQuete }) {
  return (
    <ul className={c.colListe}>
      {chaines.map((ch) => (
        <li key={ch.chaine.id} className={c.chaine}>
          <div className="flex items-baseline justify-between gap-2">
            <span className={c.chaineTitre}>{ch.chaine.titre}</span>
            <span className={c.mono}>
              {ch.faits}/{ch.paliers.length}
            </span>
          </div>
          <ol className={c.paliers} aria-label={CODEX.longCours.palier(Math.min(ch.faits + 1, ch.paliers.length), ch.paliers.length)}>
            {ch.paliers.map((pa) => (
              <li key={pa.id}>
                <Sceau l={pa} taille={16} />
              </li>
            ))}
          </ol>
          {ch.courant ? <LigneCompacte l={ch.courant} onQuete={onQuete} /> : <p className="t-micro m-0">{CODEX.longCours.fini}</p>}
        </li>
      ))}
    </ul>
  );
}

/* ================================================================== */
/* Le chemin (téléphone, et la feuille d'un acte)                      */
/* ================================================================== */

const LARGEUR_CHEMIN = 340;
const PAS_CHEMIN = 104;
const xChemin = (i: number) => LARGEUR_CHEMIN / 2 + Math.sin(i * 1.15 + 0.4) * 84;

export function Chemin({ quetes, ici, onQuete, nom }: { quetes: LigneQuete[]; ici?: string | null; onQuete: SurQuete; nom: (l: LigneQuete) => string }) {
  const liste = visibles(quetes);
  const courante = (ici && liste.find((q) => q.id === ici && q.etat !== "terminee")) || premiereOuverte(liste);
  const iCour = courante ? liste.indexOf(courante) : liste.length;
  const h = liste.length * PAS_CHEMIN + 30;
  return (
    <div className={c.chemin} style={{ height: h, width: LARGEUR_CHEMIN }}>
      <svg className={c.traits} width={LARGEUR_CHEMIN} height={h} viewBox={`0 0 ${LARGEUR_CHEMIN} ${h}`} aria-hidden>
        {liste.slice(1).map((q, j) => {
          const i = j + 1;
          const x1 = xChemin(i - 1);
          const y1 = 52 + (i - 1) * PAS_CHEMIN;
          const x2 = xChemin(i);
          const y2 = 52 + i * PAS_CHEMIN;
          return i <= iCour ? (
            <Trait key={q.id} x1={x1} y1={y1} x2={x2} y2={y2} ep={9} className={c.rameau} />
          ) : (
            <line key={q.id} x1={x1} y1={y1} x2={x2} y2={y2} className={c.pointille} />
          );
        })}
      </svg>
      <ol className={c.cheminListe}>
        {liste.map((q, i) => {
          const grand = q === courante;
          const t = grand ? 78 : 54;
          const x = xChemin(i);
          const y = 52 + i * PAS_CHEMIN;
          const aGauche = x > LARGEUR_CHEMIN / 2;
          const enigme = q.affichage === "indice" && q.etat !== "terminee";
          return (
            <li key={q.id + q.periode}>
              {grand && <Ici x={x} y={y} r={56} />}
              <button type="button" className={c.noeud} style={{ left: x - t / 2, top: y - t / 2, width: t, height: t }} onClick={() => onQuete(q)} aria-label={libelleSceau(q)} aria-haspopup="dialog">
                <Sceau l={q} taille={t} signe={grand ? "!" : undefined} />
              </button>
              <span
                className={`${c.cheminEtiquette} ${grand ? c.fort : ""} ${q.etat === "verrouillee" ? c.pale : ""}`}
                style={aGauche ? { right: LARGEUR_CHEMIN - x + t / 2 + 10, top: y - 18, textAlign: "right" } : { left: x + t / 2 + 10, top: y - 18 }}
                aria-hidden
              >
                {enigme ? CODEX.exploits.enigme : nom(q)}
                <small>
                  {q.etat === "active" && q.cible > 1 ? `${Math.floor(q.valeur)}/${Math.floor(q.cible)}` : grand ? "ta prochaine" : CODEX.etat[q.etat].toLowerCase()}
                </small>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

type Choix = { type: "acte"; id: string } | { type: "branche"; key: string } | { type: "exploits" } | { type: "longcours" };

export function CheminCodex({ vue, montre, onQuete }: { vue: VueCodex; montre: Montre; onQuete: SurQuete }) {
  const p = vue.prochaine?.ligne;
  const depart: Choix = useMemo(() => {
    if (p?.matiere && montre("codex:branches")) return { type: "branche", key: p.matiere };
    const a = vue.trame.find((x) => p && x.quetes.some((q) => q.id === p.id)) ?? vue.trame.find((x) => x.courant) ?? vue.trame[0];
    return { type: "acte", id: a?.acte.id ?? "" };
  }, [p, vue.trame, montre]);
  const [choix, setChoix] = useState<Choix>(depart);
  const acte = choix.type === "acte" ? vue.trame.find((a) => a.acte.id === choix.id) : undefined;
  const branche = choix.type === "branche" ? vue.branches.find((b) => b.contenu.key === choix.key) : undefined;
  const pareil = (x: Choix) => JSON.stringify(x) === JSON.stringify(choix);

  return (
    <div className={`${c.tel} ${e.carnet}`}>
      <div className={c.selecteur} role="group" aria-label="Les actes">
        {vue.trame.map((a) => {
          const x: Choix = { type: "acte", id: a.acte.id };
          return (
            <button key={a.acte.id} type="button" className={`${c.puce} ${pareil(x) ? c.puceOn : ""}`} aria-pressed={pareil(x)} onClick={() => setChoix(x)} aria-label={`${etiquetteActe(a.acte)}, ${a.acte.titre}`}>
              <Sceau l={ligneActe(a)} taille={28} signe={chiffreActe(a.acte)} />
            </button>
          );
        })}
      </div>
      <div className={c.selecteur} role="group" aria-label="Les branches et le reste">
        {montre("codex:branches") &&
          vue.branches.map((b) => {
            const x: Choix = { type: "branche", key: b.contenu.key };
            return (
              <button key={b.contenu.key} type="button" className={`${c.puceTexte} ${pareil(x) ? c.puceOn : ""}`} aria-pressed={pareil(x)} onClick={() => setChoix(x)}>
                {b.contenu.court}
                <span className={c.mono}>
                  {b.faites}/{b.total}
                </span>
              </button>
            );
          })}
        {montre("codex:longcours") && (
          <button type="button" className={`${c.puceTexte} ${choix.type === "longcours" ? c.puceOn : ""}`} aria-pressed={choix.type === "longcours"} onClick={() => setChoix({ type: "longcours" })}>
            Long cours
          </button>
        )}
        {montre("codex:exploits") && (
          <button type="button" className={`${c.puceTexte} ${choix.type === "exploits" ? c.puceOn : ""}`} aria-pressed={choix.type === "exploits"} onClick={() => setChoix({ type: "exploits" })}>
            Exploits
          </button>
        )}
      </div>

      <div className={c.telCorps} data-leonard="trame">
        {acte && (
          <>
            <TeteChemin sur={`${etiquetteActe(acte.acte)} · ${acte.clos ? CODEX.trame.clos : acte.courant ? CODEX.trame.enCours : CODEX.trame.aVenir} · ${acte.faites}/${acte.total}`} titre={acte.acte.titre} replique={acte.replique.texte} />
            <Chemin quetes={acte.quetes} ici={p?.id} onQuete={onQuete} nom={(l) => l.titre} />
          </>
        )}
        {branche && <BrancheChemin b={branche} ici={p?.id} onQuete={onQuete} />}
        {choix.type === "exploits" && (
          <>
            <TeteChemin sur={CODEX.exploits.gagnes(vue.exploits.filter((q) => q.etat === "terminee").length)} titre={CODEX.exploits.titre} replique={CODEX.exploits.sous} />
            <Chemin quetes={vue.exploits} onQuete={onQuete} nom={(l) => l.titre} />
          </>
        )}
        {choix.type === "longcours" && (
          <>
            <TeteChemin sur="Les grands chantiers" titre={CODEX.longCours.titre} replique={CODEX.longCours.sous} />
            <ChainesCompactes chaines={vue.longCours} onQuete={onQuete} />
            <FilRouge fil={vue.filRouge} onQuete={onQuete} />
          </>
        )}
      </div>
    </div>
  );
}

function BrancheChemin({ b, ici, onQuete }: { b: VueBranche; ici?: string; onQuete: SurQuete }) {
  return (
    <>
      <TeteChemin sur={`Branche · ${b.faites}/${b.total}${b.maitre ? " · Maître" : ""}`} titre={b.contenu.nom} replique={CODEX.branches.sous} />
      <Chemin quetes={b.etapes} ici={ici} onQuete={onQuete} nom={nomEtape} />
    </>
  );
}

export function TeteChemin({ sur, titre, replique }: { sur: string; titre: string; replique?: string }) {
  return (
    <div className={c.teteChemin}>
      <p className={c.mono}>{sur}</p>
      <h2 className={`${c.plume} ${c.titreChemin}`}>{titre}</h2>
      {replique && <p className={c.repliqueChemin}>« {replique} »</p>}
    </div>
  );
}
