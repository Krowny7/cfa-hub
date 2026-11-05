"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Swords } from "lucide-react";
import { TetePanneau } from "@/components/salles/Stage";
import { echarpeDe, peindreArene, poseDe } from "@/components/salles/jeu-dessin";
import { COUPS, HAUTEUR, LARGEUR, SANS_ENTREE, VIES, avancer, coupActif, dernierDebout, elimine, meneur, nouveauCombattant, subir, touche, type Combattant, type Entrees, type TypeCoup } from "@/lib/salles/jeu-combat";
import type { SalleMembre } from "@/lib/salles/types";
import { createClient } from "@/lib/supabase/browser";
import { SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// La petite carte de la salle d'attente : un combat de plateforme entre les joueurs, en
// attendant que la partie commence. Rien en base et rien dans le chemin de la partie : tout
// passe par un canal Realtime (broadcast), et la carte disparaît au lancement. Chacun simule
// son personnage ; qui frappe prévient sa cible, qui applique le coup chez elle. Seul dans la
// salle, on s'entraîne sur un mannequin. Le clavier ne répond que quand la carte a le focus.

const TAILLE = 4.6;
const ENVOI_MS = 66;
const ABSENT_MS = 5000;
const NOUVELLE_MANCHE_MS = 4000;
const MANNEQUIN = "mannequin";

type Vu = Combattant & { cx: number; cy: number; vu: number };
type Goutte = { x: number; y: number; vx: number; vy: number; vie: number; r: number; teinte: string };
type Ligne = { id: string; degats: number; vies: number };

const nomDe = (m: SalleMembre | undefined) => m?.username?.trim() || "Un joueur";

/** Un état reçu du canal, s'il a la bonne forme. */
function etatLu(p: unknown): (Pick<Combattant, "x" | "y" | "vx" | "vy" | "dir" | "degats" | "vies" | "coup"> & { id: string }) | null {
  const m = p as { id?: unknown; x?: unknown; y?: unknown; vx?: unknown; vy?: unknown; d?: unknown; g?: unknown; v?: unknown; c?: unknown; t?: unknown } | null;
  if (!m || typeof m.id !== "string" || typeof m.x !== "number" || typeof m.y !== "number" || typeof m.g !== "number" || typeof m.v !== "number") return null;
  const type = m.c === "leger" || m.c === "fort" ? m.c : null;
  return { id: m.id, x: m.x, y: m.y, vx: Number(m.vx) || 0, vy: Number(m.vy) || 0, dir: m.d === -1 ? -1 : 1, degats: m.g, vies: m.v, coup: type ? { type, t: Number(m.t) || 0 } : null };
}

export function JeuAttente({ canal, moiId, membres }: { canal: string; moiId: string; membres: SalleMembre[] }) {
  const [actif, setActif] = useState(false);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [gagnant, setGagnant] = useState<string | null>(null);
  const [seul, setSeul] = useState(true);
  const toile = useRef<HTMLCanvasElement | null>(null);
  const voie = useRef<RealtimeChannel | null>(null);
  const touches = useRef(new Set<string>());
  const appuis = useRef(new Set<string>());
  const parId = useMemo(() => new Map(membres.map((m) => [m.userId, m])), [membres]);
  const ids = useRef<ReadonlySet<string>>(new Set());
  ids.current = new Set(parId.keys());
  const noms = useRef(parId);
  noms.current = parId;
  const rang = Math.max(0, membres.findIndex((m) => m.userId === moiId));
  const moi = useRef<Combattant>(nouveauCombattant(rang));
  const autres = useRef(new Map<string, Vu>());
  const mannequin = useRef<Combattant>(nouveauCombattant(rang + 1));
  const gouttes = useRef<Goutte[]>([]);
  const secousse = useRef(0);
  const finDeManche = useRef<string | null>(null);

  const envoyer = (event: string, payload: Record<string, unknown>) => {
    void voie.current?.send({ type: "broadcast", event, payload });
  };

  const eclabousser = (x: number, y: number, dir: number, force: number) => {
    for (let i = 0; i < 8 + force * 10; i++) {
      gouttes.current.push({ x, y: y - 34, vx: dir * (60 + Math.random() * 300) + (Math.random() - 0.5) * 160, vy: -80 - Math.random() * 260, vie: 0.35 + Math.random() * 0.4, r: 2 + Math.random() * 5, teinte: i % 4 === 0 ? "#c9402a" : "#1a120b" });
    }
    secousse.current = Math.min(10, 3 + force * 6);
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
        if (avant && p.degats > avant.degats) eclabousser(p.x, p.y, p.vx >= 0 ? 1 : -1, 0.4);
        autres.current.set(p.id, { ...nouveauCombattant(0), ...p, cx: avant?.cx ?? p.x, cy: avant?.cy ?? p.y, vu: Date.now() });
      });
      c.on("broadcast", { event: "coup" }, ({ payload }) => {
        const p = payload as { de?: unknown; cible?: unknown; type?: unknown; dir?: unknown } | null;
        if (p?.cible !== moiId || typeof p.de !== "string" || !ids.current.has(p.de) || (p.type !== "leger" && p.type !== "fort")) return;
        const dir = p.dir === -1 ? -1 : 1;
        const avant = moi.current;
        moi.current = subir(avant, p.type as TypeCoup, dir);
        if (moi.current !== avant) eclabousser(avant.x, avant.y, dir, p.type === "fort" ? 1 : 0.4);
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

    const boucle = (t: number) => {
      image = requestAnimationFrame(boucle);
      if (document.hidden) {
        avant = t;
        return;
      }
      const dt = Math.min(0.033, (t - avant) / 1000);
      avant = t;
      const maintenant = Date.now();

      const k = touches.current;
      const a = appuis.current;
      const e: Entrees = { gauche: k.has("gauche"), droite: k.has("droite"), bas: k.has("bas"), saut: a.has("saut"), leger: a.has("leger"), fort: a.has("fort") };
      a.clear();

      const m = elimine(moi.current) ? moi.current : avancer(moi.current, e, dt);
      if (m.vies < moi.current.vies) eclabousser(Math.max(30, Math.min(LARGEUR - 30, moi.current.x)), Math.min(HAUTEUR - 30, Math.max(60, moi.current.y)), moi.current.x < 512 ? 1 : -1, 1);
      moi.current = m;

      for (const [id, o] of autres.current) {
        if (maintenant - o.vu > ABSENT_MS) {
          autres.current.delete(id);
          continue;
        }
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.cx += (o.x - o.cx) * Math.min(1, dt * 16);
        o.cy += (o.y - o.cy) * Math.min(1, dt * 16);
      }
      const estSeul = autres.current.size === 0;
      if (estSeul) mannequin.current = avancer(mannequin.current.vies <= 0 ? nouveauCombattant(rang + 1) : mannequin.current, SANS_ENTREE, dt);

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
          if (mannequin.current !== cible) eclabousser(cible.x, cible.y, m.dir, type === "fort" ? 1 : 0.4);
        }
        for (const [id, o] of autres.current) {
          if (dejaTouches.has(id) || elimine(o) || !touche(m, { x: o.cx, y: o.cy })) continue;
          dejaTouches.add(id);
          envoyer("coup", { de: moiId, cible: id, type, dir: m.dir });
          eclabousser(o.cx, o.cy, m.dir, type === "fort" ? 1 : 0.4);
        }
      }

      if (t - dernierEnvoi > ENVOI_MS) {
        dernierEnvoi = t;
        envoyer("etat", { id: moiId, x: Math.round(m.x), y: Math.round(m.y), vx: Math.round(m.vx), vy: Math.round(m.vy), d: m.dir, g: m.degats, v: m.vies, c: m.coup?.type ?? "", t: m.coup?.t ?? 0 });
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
        }
      }

      if (t - dernierTableau > 150) {
        dernierTableau = t;
        setSeul(estSeul);
        setLignes(joueurs.map((j) => ({ id: j.id, vies: j.vies, degats: j.id === moiId ? m.degats : (autres.current.get(j.id)?.degats ?? 0) })));
      }

      // l'image
      const choc = secousse.current;
      secousse.current = Math.max(0, choc - dt * 40);
      c.setTransform(1, 0, 0, 1, (Math.random() - 0.5) * choc, (Math.random() - 0.5) * choc);
      peindreArene(c);
      const scene: { id: string; f: Pick<Combattant, "x" | "y" | "dir" | "coup" | "invincible" | "vx" | "degats">; nom: string }[] = [];
      if (!elimine(m)) scene.push({ id: moiId, f: m, nom: nomDe(noms.current.get(moiId)) });
      for (const [id, o] of autres.current) if (!elimine(o)) scene.push({ id, f: { ...o, x: o.cx, y: o.cy, invincible: 0 }, nom: nomDe(noms.current.get(id)) });
      if (estSeul) scene.push({ id: MANNEQUIN, f: mannequin.current, nom: SALLES.jeuMannequin });

      c.imageSmoothingEnabled = false;
      for (const j of scene) {
        const { x, y, dir, coup, invincible, vx } = j.f;
        c.globalAlpha = invincible > 0 && Math.floor(t / 90) % 2 === 0 ? 0.45 : 1;
        const pas = Math.abs(vx) > 30 ? (Math.floor(t / 110) % 2) + 1 : 0;
        const echarpe = j.id === MANNEQUIN ? "#8d8579" : echarpeDe(j.id, j.id === moiId);
        c.drawImage(poseDe(dir > 0 ? "droite" : "gauche", pas, echarpe), x - 8 * TAILLE, y - 15 * TAILLE, 16 * TAILLE, 16 * TAILLE);
        c.globalAlpha = 1;
        if (coup) {
          const info = COUPS[coup.type];
          if (coup.t >= info.debut && coup.t <= info.fin + 0.04) {
            c.strokeStyle = coup.type === "fort" ? "#d8432a" : "#f4ead2";
            c.lineWidth = coup.type === "fort" ? 11 : 7;
            c.lineCap = "round";
            c.beginPath();
            c.arc(x + dir * 16, y - 36, info.portee * 0.72, dir > 0 ? -1 : Math.PI - 0.6, dir > 0 ? 0.6 : Math.PI + 1);
            c.stroke();
          }
        }
      }
      gouttes.current = gouttes.current.filter((g) => g.vie > 0);
      for (const g of gouttes.current) {
        g.vie -= dt;
        g.vy += 1100 * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        c.fillStyle = g.teinte;
        c.fillRect(g.x, g.y, g.r, g.r);
      }
      c.font = "600 22px system-ui, sans-serif";
      c.textAlign = "center";
      c.lineJoin = "round";
      c.lineWidth = 5;
      for (const j of scene) {
        const y = j.f.y - 17 * TAILLE;
        const texte = `${j.nom.slice(0, 12)} ${Math.round(j.f.degats)} %`;
        c.strokeStyle = "rgba(26, 18, 11, 0.85)";
        c.strokeText(texte, j.f.x, y);
        c.fillStyle = "#fff";
        c.fillText(texte, j.f.x, y);
      }
    };
    image = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(image);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moiId]);

  const sensDe = (e: React.KeyboardEvent) => {
    const cle = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    return ({ ArrowLeft: "gauche", ArrowRight: "droite", ArrowDown: "bas", ArrowUp: "saut", q: "gauche", a: "gauche", d: "droite", s: "bas", z: "saut", w: "saut", " ": "saut", j: "leger", x: "leger", k: "fort", c: "fort" } as Record<string, string>)[cle];
  };
  const clavier = (e: React.KeyboardEvent, enfoncee: boolean) => {
    const sens = sensDe(e);
    if (!sens) return;
    e.preventDefault();
    if (enfoncee) {
      if (!e.repeat && (sens === "saut" || sens === "leger" || sens === "fort")) appuis.current.add(sens);
      touches.current.add(sens);
    } else touches.current.delete(sens);
  };
  const bouton = (nom: string, texte: string) => (
    <button
      type="button"
      aria-label={nom}
      onPointerDown={(e) => {
        e.preventDefault();
        if (nom === "saut" || nom === "leger" || nom === "fort") appuis.current.add(nom);
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
          <canvas ref={toile} width={LARGEUR} height={HAUTEUR} />
          {!actif && <span className={s.jeuAide}>{SALLES.jeuAide}</span>}
          {gagnant && <span className={s.jeuManche}>{SALLES.jeuManche(nomDe(parId.get(gagnant)))}</span>}
        </div>
        <div className={s.jeuTouches}>
          {bouton("gauche", "←")}
          {bouton("droite", "→")}
          {bouton("saut", "↑")}
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
        {seul && <p className={s.sous}>{SALLES.jeuSeul}</p>}
      </div>
    </section>
  );
}
