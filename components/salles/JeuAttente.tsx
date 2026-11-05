"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Gamepad2 } from "lucide-react";
import { TetePanneau } from "@/components/salles/Stage";
import { TAILLE_CARTE, echarpeDe, peindreCour, peindreRouleau, peindreSamourai } from "@/components/salles/jeu-dessin";
import { ETAT_VIDE, MANCHE, ROULEAUX_MAX, avancer, caseDeRouleau, centreDe, classement, depart, directionDe, etatLu, meneur, prendre, rouleauAPortee, type Direction, type EtatJeu, type Point } from "@/lib/salles/jeu-attente";
import type { SalleMembre } from "@/lib/salles/types";
import { createClient } from "@/lib/supabase/browser";
import { SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// La petite carte de la salle d'attente : chacun promène son samouraï dans la cour et ramasse
// les rouleaux. Tout passe par un canal Realtime (broadcast), rien en base et rien dans le
// chemin de la partie : la carte disparaît quand la partie commence. Le joueur au plus petit
// identifiant mène le jeu : lui seul pose les rouleaux et tient les scores. Le clavier ne
// répond que quand la carte a le focus, pour ne pas gêner la page ni le chat.

/** Pixels du canevas par pixel de carte : assez pour des noms nets, le CSS l'ajuste à la carte. */
const ZOOM = 4;
const ENVOI_MS = 120;
const VIE_MS = 2000;
const ABSENT_MS = 7000;
const POSE_MS = 2500;
const ETAT_MS = 4000;
const NOUVELLE_MANCHE_MS = 4000;

type Autre = { x: number; y: number; cx: number; cy: number; direction: Direction; marche: boolean; vu: number };

const nomDe = (m: SalleMembre | undefined) => m?.username?.trim() || "Un joueur";

/** Une position reçue du canal, si elle a la bonne forme. */
function posLue(p: unknown): { id: string; x: number; y: number; direction: Direction; marche: boolean } | null {
  const m = p as { id?: unknown; x?: unknown; y?: unknown; d?: unknown; m?: unknown } | null;
  if (!m || typeof m.id !== "string" || typeof m.x !== "number" || typeof m.y !== "number") return null;
  const direction: Direction = m.d === "haut" || m.d === "gauche" || m.d === "droite" ? m.d : "bas";
  return { id: m.id, x: m.x, y: m.y, direction, marche: m.m === true };
}

export function JeuAttente({ canal, moiId, membres }: { canal: string; moiId: string; membres: SalleMembre[] }) {
  const [etat, setEtat] = useState<EtatJeu>(ETAT_VIDE);
  const [actif, setActif] = useState(false);
  const toile = useRef<HTMLCanvasElement | null>(null);
  const voie = useRef<RealtimeChannel | null>(null);
  const jeu = useRef<EtatJeu>(ETAT_VIDE);
  const touches = useRef(new Set<string>());
  const cible = useRef<Point | null>(null);
  const moi = useRef({ ...depart(moiId), direction: "bas" as Direction, marche: false });
  const autres = useRef(new Map<string, Autre>());
  const parId = useMemo(() => new Map(membres.map((m) => [m.userId, m])), [membres]);
  const ids = useRef<ReadonlySet<string>>(new Set());
  ids.current = new Set(parId.keys());
  const noms = useRef(parId);
  noms.current = parId;

  const poser = (e: EtatJeu) => {
    jeu.current = e;
    setEtat(e);
  };
  const envoyer = (event: string, payload: Record<string, unknown>) => {
    void voie.current?.send({ type: "broadcast", event, payload });
  };
  const presents = () => [moiId, ...autres.current.keys()];
  const jeMene = () => meneur(presents()) === moiId;

  useEffect(() => {
    let fin = () => {};
    try {
      const sb = createClient();
      const c = sb.channel(`salle-jeu:${canal}`, { config: { broadcast: { self: false } } });
      c.on("broadcast", { event: "pos" }, ({ payload }) => {
        const p = posLue(payload);
        if (!p || p.id === moiId || !ids.current.has(p.id)) return;
        const avant = autres.current.get(p.id);
        autres.current.set(p.id, { x: p.x, y: p.y, cx: avant?.cx ?? p.x, cy: avant?.cy ?? p.y, direction: p.direction, marche: p.marche, vu: Date.now() });
      });
      c.on("broadcast", { event: "etat" }, ({ payload }) => {
        if (jeMene()) return;
        const e = etatLu(payload, ids.current);
        if (e) poser(e);
      });
      c.on("broadcast", { event: "prise" }, ({ payload }) => {
        const p = payload as { joueur?: unknown; rouleau?: unknown } | null;
        if (!jeMene() || typeof p?.joueur !== "string" || typeof p.rouleau !== "string" || !ids.current.has(p.joueur)) return;
        const e = prendre(jeu.current, p.joueur, p.rouleau);
        if (e !== jeu.current) {
          poser(e);
          envoyer("etat", e);
        }
      });
      c.subscribe();
      voie.current = c;
      fin = () => {
        voie.current = null;
        void sb.removeChannel(c);
      };
    } catch {
      // sans canal, on joue seul : le jeu tourne quand même
    }
    return () => fin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canal, moiId]);

  useEffect(() => {
    const el = toile.current;
    const c = el?.getContext("2d");
    if (!el || !c) return;
    c.imageSmoothingEnabled = false;
    const cours = [0, 1].map((phase) => {
      const f = document.createElement("canvas");
      f.width = TAILLE_CARTE.largeur;
      f.height = TAILLE_CARTE.hauteur;
      const fc = f.getContext("2d");
      if (fc) peindreCour(fc, phase);
      return f;
    });
    let image = 0;
    let avant = performance.now();
    let dernierEnvoi = 0;
    let derniereVie = 0;
    let dernierePose = 0;
    let dernierEtat = 0;
    let finManche = 0;
    let marchait = false;

    const boucle = (t: number) => {
      image = requestAnimationFrame(boucle);
      if (document.hidden) {
        avant = t;
        return;
      }
      const dt = Math.min(0.1, (t - avant) / 1000);
      avant = t;
      const maintenant = Date.now();
      const m = moi.current;

      // où aller : le clavier d'abord, sinon le point touché
      const k = touches.current;
      let dx = (k.has("droite") ? 1 : 0) - (k.has("gauche") ? 1 : 0);
      let dy = (k.has("bas") ? 1 : 0) - (k.has("haut") ? 1 : 0);
      if (dx || dy) cible.current = null;
      else if (cible.current) {
        dx = cible.current.x - m.x;
        dy = cible.current.y - m.y;
        if (Math.hypot(dx, dy) < 2) {
          cible.current = null;
          dx = 0;
          dy = 0;
        }
      }
      const suivant = avancer(m, dx, dy, dt);
      const bouge = suivant.x !== m.x || suivant.y !== m.y;
      if ((dx || dy) && !bouge) cible.current = null;
      m.x = suivant.x;
      m.y = suivant.y;
      m.direction = directionDe(dx, dy, m.direction);
      m.marche = bouge;

      // le réseau : souvent quand on marche, de temps en temps pour rester présent
      if ((bouge && t - dernierEnvoi > ENVOI_MS) || marchait !== bouge || t - derniereVie > VIE_MS) {
        dernierEnvoi = t;
        derniereVie = t;
        envoyer("pos", { id: moiId, x: Math.round(m.x), y: Math.round(m.y), d: m.direction, m: bouge });
      }
      marchait = bouge;

      for (const [id, a] of autres.current) {
        if (maintenant - a.vu > ABSENT_MS) {
          autres.current.delete(id);
          continue;
        }
        a.cx += (a.x - a.cx) * Math.min(1, dt * 10);
        a.cy += (a.y - a.cy) * Math.min(1, dt * 10);
      }

      // le rouleau sous les pieds
      const e = jeu.current;
      const trouve = rouleauAPortee(m, e.rouleaux);
      if (trouve) {
        if (jeMene()) {
          const n = prendre(e, moiId, trouve.id);
          poser(n);
          envoyer("etat", n);
        } else {
          poser({ ...e, rouleaux: e.rouleaux.filter((r) => r.id !== trouve.id) });
          envoyer("prise", { joueur: moiId, rouleau: trouve.id });
        }
      }

      // le meneur pose les rouleaux, relance la manche et redit l'état pour ceux qui arrivent
      if (jeMene()) {
        const j = jeu.current;
        if (j.gagnant) {
          finManche ||= t;
          if (t - finManche > NOUVELLE_MANCHE_MS) {
            finManche = 0;
            poser(ETAT_VIDE);
            envoyer("etat", ETAT_VIDE);
          }
        } else if (j.rouleaux.length < ROULEAUX_MAX && t - dernierePose > POSE_MS) {
          dernierePose = t;
          const k2 = caseDeRouleau(j.rouleaux, Math.random());
          if (k2) {
            const n = { ...j, rouleaux: [...j.rouleaux, { id: `${Math.round(t)}`, c: k2.c, l: k2.l }] };
            poser(n);
            envoyer("etat", n);
          }
        }
        if (t - dernierEtat > ETAT_MS) {
          dernierEtat = t;
          envoyer("etat", jeu.current);
        }
      }

      // l'image : la cour, les rouleaux, puis les joueurs du plus haut au plus bas
      c.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
      c.drawImage(cours[Math.floor(t / 700) % 2], 0, 0);
      const sec = t / 1000;
      for (const r of jeu.current.rouleaux) {
        const p = centreDe(r);
        peindreRouleau(c, p.x, p.y, sec);
      }
      const pas = (marche: boolean) => (marche ? (Math.floor(t / 160) % 2) + 1 : 0);
      const scene = [
        { id: moiId, x: m.x, y: m.y, direction: m.direction, marche: m.marche },
        ...[...autres.current].map(([id, a]) => ({ id, x: a.cx, y: a.cy, direction: a.direction, marche: a.marche })),
      ].sort((a, b) => a.y - b.y);
      for (const j of scene) peindreSamourai(c, j.x, j.y, j.direction, pas(j.marche), echarpeDe(j.id, j.id === moiId));

      c.setTransform(1, 0, 0, 1, 0, 0);
      c.font = "600 21px system-ui, sans-serif";
      c.textAlign = "center";
      c.lineJoin = "round";
      c.lineWidth = 5;
      for (const j of scene) {
        const nom = nomDe(noms.current.get(j.id)).slice(0, 14);
        c.strokeStyle = "rgba(26, 18, 11, 0.8)";
        c.strokeText(nom, j.x * ZOOM, (j.y - 18) * ZOOM);
        c.fillStyle = "#fff";
        c.fillText(nom, j.x * ZOOM, (j.y - 18) * ZOOM);
      }
    };
    image = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(image);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moiId]);

  const touche = (e: React.KeyboardEvent, enfoncee: boolean) => {
    const sens = { ArrowUp: "haut", ArrowDown: "bas", ArrowLeft: "gauche", ArrowRight: "droite", z: "haut", s: "bas", q: "gauche", d: "droite", w: "haut", a: "gauche" }[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!sens) return;
    e.preventDefault();
    if (enfoncee) touches.current.add(sens);
    else touches.current.delete(sens);
  };

  const viser = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    cible.current = { x: ((e.clientX - r.left) / r.width) * TAILLE_CARTE.largeur, y: ((e.clientY - r.top) / r.height) * TAILLE_CARTE.hauteur };
  };

  const scores = classement(etat.scores).slice(0, 4);

  return (
    <section className={s.panneau} aria-labelledby="salle-jeu">
      <TetePanneau id="salle-jeu" icone={<Gamepad2 size={16} />} droite={<span className={s.compte}>{SALLES.jeuBut(MANCHE)}</span>}>
        {SALLES.jeuTitre}
      </TetePanneau>
      <div className={s.panneauCorps}>
        <div
          className={s.jeuCadre}
          tabIndex={0}
          role="application"
          aria-label={SALLES.jeuAide}
          onFocus={() => setActif(true)}
          onBlur={() => {
            setActif(false);
            touches.current.clear();
          }}
          onKeyDown={(e) => touche(e, true)}
          onKeyUp={(e) => touche(e, false)}
        >
          <canvas ref={toile} width={TAILLE_CARTE.largeur * ZOOM} height={TAILLE_CARTE.hauteur * ZOOM} onPointerDown={viser} />
          {!actif && <span className={s.jeuAide}>{SALLES.jeuAide}</span>}
          {etat.gagnant && <span className={s.jeuManche}>{SALLES.jeuManche(nomDe(parId.get(etat.gagnant)))}</span>}
        </div>
        {scores.length > 0 && (
          <ol className={s.jeuScores}>
            {scores.map(([id, n]) => (
              <li key={id}>
                <span>{nomDe(parId.get(id))}</span>
                <b className="t-num">{n}</b>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
