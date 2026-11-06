"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Swords } from "lucide-react";
import { TetePanneau } from "@/components/salles/Stage";
import { TENUE_MANNEQUIN, peindreArene, peindreEclat, peindreOmbre, peindrePantin, peindrePoussiere, peindreSillage, peindreTrace, tenueDe, type Eclat, type Poussiere, type Tenue } from "@/components/salles/jeu-dessin";
import { COUPS, HAUTEUR, LARGEUR, SANS_ENTREE, VIES, avancer, coupActif, dernierDebout, elimine, meneur, nouveauCombattant, subir, touche, type Combattant, type Entrees, type TypeCoup } from "@/lib/salles/jeu-combat";
import { VIE_TRACE, animer, nouveauPantin, type Pantin, type Vue } from "@/lib/salles/jeu-pantin";
import { peindreEffetsEcran, peindreEffetsScene, peindreFondImpact, type Effet } from "@/components/salles/jeu-effets";
import type { SalleMembre } from "@/lib/salles/types";
import { createClient } from "@/lib/supabase/browser";
import { SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// La petite carte de la salle d'attente : un combat de plateforme entre les joueurs, en
// attendant que la partie commence. Rien en base et rien dans le chemin de la partie : tout
// passe par un canal Realtime (broadcast), et la carte disparaît au lancement. Chacun simule
// son personnage ; qui frappe prévient sa cible, qui applique le coup chez elle. Seul dans la
// salle, on s'entraîne sur un mannequin. Le clavier ne répond que quand la carte a le focus.
// Les personnages sont animés par le code (lib/salles/jeu-pantin), l'arène est une peinture.

const ENVOI_MS = 66;
const ABSENT_MS = 5000;
const NOUVELLE_MANCHE_MS = 4000;
const MANNEQUIN = "mannequin";
/** Le canevas compte deux pixels pour un : les personnages restent nets, même agrandis. */
const NET = 2;
/** Au-delà de ce délai sans toucher, le compteur de combo repart de zéro. */
const COMBO_MS = 900;
const VIE_BULLE = 0.8;

type Vu = Combattant & { cx: number; cy: number; vu: number };
type Goutte = { x: number; y: number; vx: number; vy: number; vie: number; r: number; teinte: string };
type Acteur = { id: string; vue: Vue; invincible: number; degats: number; nom: string; tenue: Tenue };
type Ligne = { id: string; degats: number; vies: number };

/** Les coups qui projettent : plus d'encre, un arrêt sur image plus long. */
const lourd = (t: TypeCoup) => t === "fort" || t === "final";

const nomDe = (m: SalleMembre | undefined) => m?.username?.trim() || "Un joueur";

/** Un état reçu du canal, s'il a la bonne forme. */
function etatLu(p: unknown): (Pick<Combattant, "x" | "y" | "vx" | "vy" | "sol" | "etourdi" | "dir" | "degats" | "vies" | "coup" | "dash" | "danse"> & { id: string }) | null {
  const m = p as { id?: unknown; x?: unknown; y?: unknown; vx?: unknown; vy?: unknown; d?: unknown; g?: unknown; v?: unknown; c?: unknown; t?: unknown; s?: unknown; e?: unknown; h?: unknown; n?: unknown } | null;
  if (!m || typeof m.id !== "string" || typeof m.x !== "number" || typeof m.y !== "number" || typeof m.g !== "number" || typeof m.v !== "number") return null;
  const type = typeof m.c === "string" && m.c in COUPS ? (m.c as TypeCoup) : null;
  return { id: m.id, x: m.x, y: m.y, vx: Number(m.vx) || 0, vy: Number(m.vy) || 0, sol: m.s === 1, etourdi: Number(m.e) || 0, dir: m.d === -1 ? -1 : 1, degats: m.g, vies: m.v, coup: type ? { type, t: Number(m.t) || 0 } : null, dash: m.h === 1 ? 0.1 : 0, danse: m.n === 1 ? 0.2 : 0 };
}

export function JeuAttente({ canal, moiId, membres }: { canal: string; moiId: string; membres: SalleMembre[] }) {
  const [actif, setActif] = useState(false);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [gagnant, setGagnant] = useState<string | null>(null);
  const toile = useRef<HTMLCanvasElement | null>(null);
  const voie = useRef<RealtimeChannel | null>(null);
  const touches = useRef(new Set<string>());
  const appuis = useRef(new Set<string>());
  const parId = useMemo(() => new Map(membres.map((m) => [m.userId, m])), [membres]);
  const ids = useRef<ReadonlySet<string>>(new Set());
  ids.current = new Set(parId.keys());
  const noms = useRef(parId);
  noms.current = parId;
  /** la place de chaque adversaire présent : elle fait sa tenue, et ne change pas tant qu'il reste */
  const places = useRef(new Map<string, number>());
  const rang = Math.max(0, membres.findIndex((m) => m.userId === moiId));
  const moi = useRef<Combattant>(nouveauCombattant(rang));
  const autres = useRef(new Map<string, Vu>());
  const mannequin = useRef<Combattant>(nouveauCombattant(rang + 1));
  const pantins = useRef(new Map<string, Pantin>());
  const gouttes = useRef<Goutte[]>([]);
  const poussiere = useRef<Poussiere[]>([]);
  const eclats = useRef<Eclat[]>([]);
  const secousse = useRef(0);
  /** les coups qu'on vient d'enchaîner, et le chiffre qui s'affiche au-dessus de la cible */
  const combo = useRef({ n: 0, fin: 0 });
  const bulle = useRef<{ x: number; y: number; n: number; vie: number } | null>(null);
  /** le spectacle du combo : les effets, l'image d'impact, le ralenti et le zoom */
  const effets = useRef<Effet[]>([]);
  const impact = useRef<{ x: number; y: number; vie: number } | null>(null);
  const ralenti = useRef(0);
  const zoom = useRef<{ x: number; y: number; k: number; vie: number; max: number } | null>(null);
  const calme = useRef(false);
  /** l'arrêt sur image après un coup, en secondes */
  const gel = useRef(0);
  /** qui on vient de toucher nous-mêmes : son état reçu ensuite ne relance pas les effets */
  const touchesRecentes = useRef(new Map<string, number>());
  const finDeManche = useRef<string | null>(null);

  const envoyer = (event: string, payload: Record<string, unknown>) => {
    void voie.current?.send({ type: "broadcast", event, payload });
  };

  const eclabousser = (x: number, y: number, dir: number, force: number) => {
    for (let i = 0; i < 8 + force * 10; i++) {
      gouttes.current.push({ x, y: y - 40, vx: dir * (60 + Math.random() * 300) + (Math.random() - 0.5) * 160, vy: -80 - Math.random() * 260, vie: 0.35 + Math.random() * 0.4, r: 1.5 + Math.random() * 3, teinte: i % 4 === 0 ? "#c9402a" : "#1a120b" });
    }
    secousse.current = Math.min(10, 3 + force * 6);
  };

  /** Tout ce qui fait sentir un coup : l'encre, l'étoile, le flash et l'arrêt sur image. */
  const marquerCoup = (id: string, x: number, y: number, dir: number, fort: boolean) => {
    eclabousser(x, y, dir, fort ? 1 : 0.4);
    eclats.current.push({ x, y: y - 42, vie: 0.13, max: 0.13, fort, tourne: Math.random() * Math.PI });
    gel.current = fort ? 0.09 : 0.05;
    const p = pantins.current.get(id);
    if (p) p.flash = 0.08;
  };

  /** Le spectacle d'un combo, de plus en plus grand. À partir de trois coups, tout y passe. */
  const spectacle = (n: number, x: number, y: number, dir: number) => {
    const yc = y - 42;
    if (calme.current) {
      bulle.current = { x, y: Math.max(40, y - 108), n, vie: VIE_BULLE };
      return;
    }
    if (n === 2) {
      bulle.current = { x, y: Math.max(40, y - 108), n, vie: VIE_BULLE };
      gel.current = Math.max(gel.current, 0.1);
      zoom.current = { x, y: yc, k: 1.18, vie: 0.32, max: 0.32 };
      secousse.current = 12;
      effets.current.push({ sorte: "lignes", x, y: yc, vie: 0.2, max: 0.2 }, { sorte: "onde", x, y: yc, r: 130, couleur: "#fff6e4", vie: 0.26, max: 0.26 });
      return;
    }
    bulle.current = null;
    impact.current = { x, y: yc, vie: 0.13 };
    gel.current = 0.2;
    ralenti.current = 0.55;
    zoom.current = { x, y: yc, k: 1.5 + Math.min(0.3, (n - 3) * 0.1), vie: 0.85, max: 0.85 };
    eclabousser(x, y, dir, 4);
    secousse.current = 20;
    effets.current.push(
      { sorte: "lignes", x, y: yc, vie: 0.55, max: 0.55 },
      { sorte: "taille", x, y: yc, angle: -0.5 * dir, vie: 0.34, max: 0.34 },
      { sorte: "taille", x, y: yc, angle: 0.72 * dir, vie: 0.42, max: 0.42 },
      { sorte: "onde", x, y: yc, r: 300, couleur: "#fff6e4", vie: 0.42, max: 0.42 },
      { sorte: "onde", x, y: yc, r: 480, couleur: "#d8432a", vie: 0.6, max: 0.6 },
      { sorte: "titre", texte: SALLES.jeuCombo(n), vie: 1.25, max: 1.25 },
    );
  };

  /** Un coup qu'on vient de porter : il prolonge le combo s'il arrive à temps. */
  const compter = (x: number, y: number, dir: number) => {
    const maintenant = Date.now();
    const k = combo.current;
    k.n = maintenant < k.fin ? k.n + 1 : 1;
    k.fin = maintenant + COMBO_MS;
    if (k.n >= 2) spectacle(k.n, x, y, dir);
  };

  const soulever = (x: number, y: number, n: number, force: number) => {
    for (let i = 0; i < n; i++) {
      const sens = i % 2 === 0 ? 1 : -1;
      poussiere.current.push({ x: x + sens * Math.random() * 12, y: y - 2, vx: sens * (20 + Math.random() * 90) * force, vy: -10 - Math.random() * 34, r: 3 + Math.random() * 4, vie: 0.3, max: 0.3 });
    }
  };

  const relancer = () => {
    moi.current = nouveauCombattant(rang);
    mannequin.current = nouveauCombattant(rang + 1);
    finDeManche.current = null;
    setGagnant(null);
  };

  useEffect(() => {
    let fin = () => {};
    try {
      const sb = createClient();
      const c = sb.channel(`salle-jeu:${canal}`, { config: { broadcast: { self: false } } });
      c.on("broadcast", { event: "etat" }, ({ payload }) => {
        const p = etatLu(payload);
        if (!p || p.id === moiId || !ids.current.has(p.id)) return;
        const avant = autres.current.get(p.id);
        if (avant && p.degats > avant.degats && Date.now() - (touchesRecentes.current.get(p.id) ?? 0) > 500) marquerCoup(p.id, p.x, p.y, p.vx >= 0 ? 1 : -1, p.degats - avant.degats >= COUPS.final.degats);
        // le coup en cours : on garde notre horloge, plus fluide que les messages reçus
        const memeCoup = avant?.coup && p.coup && avant.coup.type === p.coup.type && avant.coup.t > p.coup.t;
        autres.current.set(p.id, { ...nouveauCombattant(0), ...p, coup: memeCoup ? (avant?.coup ?? null) : p.coup, cx: avant?.cx ?? p.x, cy: avant?.cy ?? p.y, vu: Date.now() });
      });
      c.on("broadcast", { event: "coup" }, ({ payload }) => {
        const p = payload as { de?: unknown; cible?: unknown; type?: unknown; dir?: unknown } | null;
        if (p?.cible !== moiId || typeof p.de !== "string" || !ids.current.has(p.de) || typeof p.type !== "string" || !(p.type in COUPS)) return;
        const dir = p.dir === -1 ? -1 : 1;
        const avant = moi.current;
        moi.current = subir(avant, p.type as TypeCoup, dir);
        if (moi.current !== avant) {
          marquerCoup(moiId, avant.x, avant.y, dir, lourd(p.type as TypeCoup));
          if (p.type === "final") spectacle(3, avant.x, avant.y, dir);
        }
      });
      c.on("broadcast", { event: "fin" }, ({ payload }) => {
        const g = (payload as { gagnant?: unknown } | null)?.gagnant;
        if (typeof g === "string" && ids.current.has(g)) setGagnant(g);
      });
      c.on("broadcast", { event: "manche" }, () => relancer());
      c.subscribe();
      voie.current = c;
      fin = () => {
        voie.current = null;
        void sb.removeChannel(c);
      };
    } catch {
      // sans canal, on s'entraîne seul : le jeu tourne quand même
    }
    return () => fin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canal, moiId]);

  useEffect(() => {
    const el = toile.current;
    const c = el?.getContext("2d");
    if (!el || !c) return;
    let image = 0;
    let avant = performance.now();
    let dernierEnvoi = 0;
    let dernierTableau = 0;
    const dejaTouches = new Set<string>();
    let coupVu: unknown = null;
    const sage = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const police = getComputedStyle(el).getPropertyValue("--font-brand").trim() || "system-ui";
    calme.current = sage;
    const tenue = (id: string): Tenue => (id === MANNEQUIN ? TENUE_MANNEQUIN : tenueDe(id === moiId ? null : (places.current.get(id) ?? 0)));

    const boucle = (t: number) => {
      image = requestAnimationFrame(boucle);
      if (document.hidden) {
        avant = t;
        return;
      }
      const brut = Math.max(0, Math.min(0.033, (t - avant) / 1000));
      avant = t;
      const maintenant = Date.now();
      // l'arrêt sur image : le temps du jeu s'arrête un instant, pas celui des effets
      const dt = sage ? brut : gel.current > 0 ? 0 : ralenti.current > 0 ? brut * 0.28 : brut;
      if (gel.current > 0) gel.current = Math.max(0, gel.current - brut);
      else ralenti.current = Math.max(0, ralenti.current - brut);

      const k = touches.current;
      const a = appuis.current;
      const e: Entrees = { gauche: k.has("gauche"), droite: k.has("droite"), bas: k.has("bas"), saut: a.has("saut"), dash: a.has("dash"), danse: a.has("danse"), leger: a.has("leger"), fort: a.has("fort") };
      a.clear();

      const m = elimine(moi.current) ? moi.current : avancer(moi.current, e, dt);
      if (m.vies < moi.current.vies) eclabousser(Math.max(30, Math.min(LARGEUR - 30, moi.current.x)), Math.min(HAUTEUR - 30, Math.max(60, moi.current.y)), moi.current.x < 512 ? 1 : -1, 1);
      if (m.dash > moi.current.dash && m.sol) soulever(m.x - m.dir * 12, m.y, 7, 1.5);
      moi.current = m;

      for (const [id, o] of autres.current) {
        if (maintenant - o.vu > ABSENT_MS) {
          autres.current.delete(id);
          continue;
        }
        o.x += o.vx * brut;
        o.y += o.vy * brut;
        o.cx += (o.x - o.cx) * Math.min(1, brut * 16);
        o.cy += (o.y - o.cy) * Math.min(1, brut * 16);
        o.etourdi = Math.max(0, o.etourdi - brut);
        o.dash = Math.max(0, o.dash - brut);
        o.danse = Math.max(0, o.danse - brut);
        if (o.coup) {
          const avance = o.coup.t + brut;
          o.coup = avance >= COUPS[o.coup.type].total ? null : { ...o.coup, t: avance };
        }
      }
      for (const id of places.current.keys()) if (!autres.current.has(id)) places.current.delete(id);
      for (const id of autres.current.keys()) {
        if (places.current.has(id)) continue;
        const prises = new Set(places.current.values());
        let libre = 0;
        while (prises.has(libre)) libre++;
        places.current.set(id, libre);
      }
      const estSeul = autres.current.size === 0;
      if (estSeul) {
        const pantin = mannequin.current.vies <= 0 ? nouveauCombattant(rang + 1) : mannequin.current;
        mannequin.current = avancer({ ...pantin, dir: pantin.etourdi > 0 ? pantin.dir : m.x < pantin.x ? -1 : 1 }, SANS_ENTREE, dt);
      }

      // le coup : une seule touche par cible et par coup
      if (m.coup !== coupVu) {
        if (!m.coup || m.coup.t === 0) dejaTouches.clear();
        coupVu = m.coup;
      }
      if (coupActif(m) && m.coup) {
        const type = m.coup.type;
        if (estSeul && !dejaTouches.has(MANNEQUIN) && touche(m, mannequin.current)) {
          dejaTouches.add(MANNEQUIN);
          const cible = mannequin.current;
          mannequin.current = subir(cible, type, m.dir);
          if (mannequin.current !== cible) {
            marquerCoup(MANNEQUIN, cible.x, cible.y, m.dir, lourd(type));
            compter(cible.x, cible.y, m.dir);
          }
        }
        for (const [id, o] of autres.current) {
          if (dejaTouches.has(id) || elimine(o) || o.dash > 0 || !touche(m, { x: o.cx, y: o.cy })) continue;
          dejaTouches.add(id);
          envoyer("coup", { de: moiId, cible: id, type, dir: m.dir });
          touchesRecentes.current.set(id, maintenant);
          marquerCoup(id, o.cx, o.cy, m.dir, lourd(type));
          compter(o.cx, o.cy, m.dir);
        }
      }

      if (t - dernierEnvoi > ENVOI_MS) {
        dernierEnvoi = t;
        envoyer("etat", { id: moiId, x: Math.round(m.x), y: Math.round(m.y), vx: Math.round(m.vx), vy: Math.round(m.vy), s: m.sol ? 1 : 0, e: Math.round(m.etourdi * 100) / 100, d: m.dir, g: m.degats, v: m.vies, c: m.coup?.type ?? "", t: m.coup?.t ?? 0, h: m.dash > 0 ? 1 : 0, n: m.danse > 0 ? 1 : 0 });
      }

      // la fin de la manche, décidée par le meneur
      const joueurs = [{ id: moiId, vies: m.vies }, ...[...autres.current].map(([id, o]) => ({ id, vies: o.vies }))];
      if (meneur(joueurs.map((j) => j.id)) === moiId && !finDeManche.current) {
        const dernier = dernierDebout(joueurs);
        if (dernier) {
          finDeManche.current = dernier;
          setGagnant(dernier);
          envoyer("fin", { gagnant: dernier });
          setTimeout(() => {
            envoyer("manche", {});
            relancer();
          }, NOUVELLE_MANCHE_MS);
        } else if (joueurs.every((j) => j.vies <= 0)) {
          // seul contre le mannequin, ou tout le monde à terre : pas de gagnant, on repart quand même
          finDeManche.current = moiId;
          setTimeout(() => {
            envoyer("manche", {});
            relancer();
          }, NOUVELLE_MANCHE_MS);
        }
      }

      if (t - dernierTableau > 150) {
        dernierTableau = t;
        setLignes(joueurs.map((j) => ({ id: j.id, vies: j.vies, degats: j.id === moiId ? m.degats : (autres.current.get(j.id)?.degats ?? 0) })));
      }

      // qui est sur la scène, et où en est chaque pantin
      const scene: Acteur[] = [];
      for (const [id, o] of autres.current) if (!elimine(o)) scene.push({ id, vue: { ...o, x: o.cx, y: o.cy }, invincible: 0, degats: o.degats, nom: nomDe(noms.current.get(id)), tenue: tenue(id) });
      if (estSeul) scene.push({ id: MANNEQUIN, vue: mannequin.current, invincible: mannequin.current.invincible, degats: mannequin.current.degats, nom: SALLES.jeuMannequin, tenue: tenue(MANNEQUIN) });
      if (!elimine(m)) scene.push({ id: moiId, vue: m, invincible: m.invincible, degats: m.degats, nom: nomDe(noms.current.get(moiId)), tenue: tenue(moiId) });
      for (const id of pantins.current.keys()) if (!scene.some((j) => j.id === id)) pantins.current.delete(id);
      for (const j of scene) {
        const { x, y, vx, vy, dir, etourdi } = j.vue;
        let p = pantins.current.get(j.id);
        if (!p) {
          p = nouveauPantin(j.vue);
          pantins.current.set(j.id, p);
        }
        const ev = animer(p, j.vue, j.id === moiId || j.id === MANNEQUIN ? dt : brut);
        if (ev.atterri > 240) soulever(x, y, 6, 1 + ev.atterri / 900);
        if (ev.decolle) soulever(x, y, 4, 0.7);
        if (ev.pas) soulever(x - dir * 10, y, 1, 0.5);
        if (j.vue.danse > 0 && Math.random() < brut * 5) effets.current.push({ sorte: "note", x: x + (Math.random() - 0.5) * 34, y: y - 86, glyphe: Math.random() < 0.5 ? "♪" : "♫", couleur: j.tenue.pans > 0 ? j.tenue.echarpe : "#fff6e4", vie: 0.9, max: 0.9 });
        if (etourdi > 0 && Math.hypot(vx, vy) > 560 && dt > 0) gouttes.current.push({ x, y: y - 36, vx: -vx * 0.12, vy: -vy * 0.12, vie: 0.3, r: 1.5 + Math.random() * 3, teinte: "#1a120b" });
      }

      // l'image
      const choc = sage ? 0 : secousse.current;
      secousse.current = Math.max(0, secousse.current - brut * 40);
      // la caméra : elle plonge sur l'impact, puis revient. Ancrée sur lui, elle ne montre jamais le bord
      let loupe = 1;
      let kx = 0;
      let ky = 0;
      const z = zoom.current;
      if (z && z.vie > 0) {
        const u = Math.min(1, (z.max - z.vie) / 0.06) * Math.min(1, z.vie / (z.max * 0.5));
        loupe = 1 + (z.k - 1) * u * u * (3 - 2 * u);
        kx = z.x * (1 - loupe);
        ky = z.y * (1 - loupe);
        z.vie -= brut;
      }
      c.setTransform(NET * loupe, 0, 0, NET * loupe, (kx + (Math.random() - 0.5) * choc) * NET, (ky + (Math.random() - 0.5) * choc) * NET);
      peindreArene(c);
      for (const j of scene) peindreOmbre(c, j.vue.x, j.vue.y);

      for (const j of scene) {
        const p = pantins.current.get(j.id);
        if (!p) continue;
        peindreSillage(c, p, j.tenue);
        peindrePantin(c, p, j.tenue, j.invincible > 0 && Math.floor(t / 90) % 2 === 0);
        peindreTrace(c, p.trace, VIE_TRACE);
      }

      poussiere.current = poussiere.current.filter((g) => g.vie > 0);
      for (const g of poussiere.current) {
        g.vie -= brut;
        g.x += g.vx * brut;
        g.y += g.vy * brut;
      }
      peindrePoussiere(c, poussiere.current);

      gouttes.current = gouttes.current.filter((g) => g.vie > 0);
      for (const g of gouttes.current) {
        g.vie -= brut;
        g.vy += 1100 * brut;
        g.x += g.vx * brut;
        g.y += g.vy * brut;
        c.fillStyle = g.teinte;
        c.beginPath();
        c.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        c.fill();
      }

      eclats.current = eclats.current.filter((e) => e.vie > 0);
      for (const e of eclats.current) {
        e.vie -= brut;
        peindreEclat(c, e);
      }

      peindreEffetsScene(c, effets.current);

      c.font = "600 20px system-ui, sans-serif";
      c.textAlign = "center";
      c.lineJoin = "round";
      c.lineWidth = 5;
      for (const j of scene) {
        // tout en haut de l'arène, le nom passe sous les pieds pour ne pas couvrir la tête
        const y = j.vue.y - 92 < 22 ? j.vue.y + 26 : j.vue.y - 92;
        const texte = `${j.nom.slice(0, 12)} ${Math.round(j.degats)} %`;
        c.strokeStyle = "rgba(26, 18, 11, 0.85)";
        c.strokeText(texte, j.vue.x, y);
        c.fillStyle = "#fff";
        c.fillText(texte, j.vue.x, y);
      }

      const b = bulle.current;
      if (b && b.vie > 0) {
        b.vie -= brut;
        b.y -= 26 * brut;
        const entree = Math.min(1, (VIE_BULLE - b.vie) / 0.07);
        c.globalAlpha = Math.min(1, Math.max(0, b.vie) / 0.25);
        c.font = `400 ${Math.round((26 + Math.min(14, b.n * 3)) * (1.35 - 0.35 * entree))}px ${police}, system-ui, sans-serif`;
        c.lineWidth = 6;
        c.strokeText(SALLES.jeuCombo(b.n), b.x, b.y);
        c.fillStyle = b.n >= 3 ? "#f0c04f" : "#fff";
        c.fillText(SALLES.jeuCombo(b.n), b.x, b.y);
        c.globalAlpha = 1;
      }

      c.setTransform(NET, 0, 0, NET, 0, 0);
      peindreEffetsEcran(c, effets.current, police);
      for (const e of effets.current) e.vie -= brut;
      effets.current = effets.current.filter((e) => e.vie > 0);

      // l'image d'impact : noir et blanc, puis rouge et noir, le temps d'un battement
      const choc2 = impact.current;
      if (choc2 && choc2.vie > 0) {
        const noir = choc2.vie > 0.065;
        peindreFondImpact(c, choc2.x, choc2.y, noir);
        for (const j of scene) {
          const p = pantins.current.get(j.id);
          if (!p) continue;
          const flash = p.flash;
          p.flash = noir ? 1 : 0;
          peindrePantin(c, p, j.tenue, false);
          p.flash = flash;
        }
        choc2.vie -= brut;
      }
    };
    image = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(image);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moiId]);

  const sensDe = (e: React.KeyboardEvent) => {
    const cle = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    return ({ ArrowLeft: "gauche", ArrowRight: "droite", ArrowDown: "bas", ArrowUp: "saut", q: "gauche", a: "gauche", d: "droite", s: "bas", z: "saut", w: "saut", " ": "saut", j: "leger", x: "leger", k: "fort", c: "fort", l: "dash", v: "dash", Shift: "dash", e: "danse" } as Record<string, string>)[cle];
  };
  const clavier = (e: React.KeyboardEvent, enfoncee: boolean) => {
    // les raccourcis du navigateur (Ctrl+L, Alt+←…) ne sont pas des coups
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const sens = sensDe(e);
    if (!sens) return;
    e.preventDefault();
    if (enfoncee) {
      if (!e.repeat && (sens === "saut" || sens === "dash" || sens === "danse" || sens === "leger" || sens === "fort")) appuis.current.add(sens);
      touches.current.add(sens);
    } else touches.current.delete(sens);
  };
  const bouton = (nom: string, texte: string) => (
    <button
      type="button"
      aria-label={nom}
      onPointerDown={(e) => {
        e.preventDefault();
        if (nom === "saut" || nom === "dash" || nom === "danse" || nom === "leger" || nom === "fort") appuis.current.add(nom);
        else touches.current.add(nom);
      }}
      onPointerUp={() => touches.current.delete(nom)}
      onPointerLeave={() => touches.current.delete(nom)}
    >
      {texte}
    </button>
  );

  return (
    <section className={s.panneau} aria-labelledby="salle-jeu">
      <TetePanneau id="salle-jeu" icone={<Swords size={16} />} droite={<span className={s.compte}>{SALLES.jeuVies(VIES)}</span>}>
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
          onKeyDown={(e) => clavier(e, true)}
          onKeyUp={(e) => clavier(e, false)}
        >
          <canvas ref={toile} width={LARGEUR * NET} height={HAUTEUR * NET} />
          {!actif && <span className={s.jeuAide}>{SALLES.jeuClique}</span>}
          {gagnant && <span className={s.jeuManche}>{SALLES.jeuManche(nomDe(parId.get(gagnant)))}</span>}
        </div>
        <div className={s.jeuTouches}>
          {bouton("gauche", "←")}
          {bouton("droite", "→")}
          {bouton("saut", "↑")}
          {bouton("dash", SALLES.jeuDash)}
          {bouton("danse", "♪")}
          {bouton("leger", SALLES.jeuCoup)}
          {bouton("fort", SALLES.jeuCoupFort)}
        </div>
        <ol className={s.jeuScores}>
          {lignes.map((l) => (
            <li key={l.id}>
              <span>{nomDe(parId.get(l.id))}</span>
              <b className="t-num">{Math.round(l.degats)} %</b>
              <span aria-label={SALLES.jeuViesRestantes(l.vies)}>{"●".repeat(Math.max(0, l.vies))}</span>
            </li>
          ))}
        </ol>
        <ul className={s.jeuConsigne}>
          {SALLES.jeuConsignes.map(([touche, geste]) => (
            <li key={geste}>
              <kbd>{touche}</kbd> {geste}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
