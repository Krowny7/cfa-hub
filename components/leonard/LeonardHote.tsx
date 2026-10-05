"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { EVENEMENT_LEONARD, type EvenementLeonard, type SignalLeonard } from "@/lib/leonard/signal";
import { CLE_TUTO, EVENEMENT_REGLAGES, lireReglages } from "@/lib/leonard/reglages";
import type { LeonardRig, Pose } from "@/lib/leonard/rig";
import { REPLIQUES, TUTO, type Replique } from "@/lib/leonard/repliques";
import s from "./Leonard.module.css";

// Léonard sur toutes les pages : il écoute les signaux des écrans
// (lib/leonard/signal) et décide s'il apparaît.
// - Jamais : en mode discret, si le joueur l'a coupé (page Moi), sur les
//   pages d'entrée (connexion, inscription), ni s'il est déjà à l'écran.
// - Le tutoriel, une fois, à la première visite de l'accueil.
// - Ensuite, des apparitions furtives : au plus une toutes les 4 minutes et
//   10 par jour (sauf tutoriel, progression, montée de rang, sans-faute),
//   avec un peu de hasard pour les réactions ordinaires.
// - Il surgit du bord, la bulle (une carte du site) s'écrit, il parle, puis
//   repart seul ; un clic le congédie. Sans son.
// - Animations coupées (réglage, ou mouvement réduit) : image fixe, sans
//   machine à écrire ni rebond.
// Le moteur (PixiJS) n'est chargé que lorsqu'une apparition est décidée,
// pendant le délai qui la précède ; trop lent, il entre en image fixe.

const PROBA: Partial<Record<EvenementLeonard, number>> = {
  "session-ratee": 0.55,
  "session-moyenne": 0.3,
  "session-reussie": 0.45,
  "erreurs-serie": 0.75,
  "serie-bonnes": 0.8,
  "duel-gagne": 0.8,
  "duel-perdu": 0.65,
  "duel-ecrase": 0.85,
  "duel-nul": 0.5,
  "defi-reussi": 0.55,
  "defi-rate": 0.55,
  tard: 0.6,
};
const PRIORITAIRES = new Set<EvenementLeonard>(["tuto", "progression", "rang-monte", "session-parfaite", "retour"]);
const ECART_MIN = 4 * 60_000;
const MAX_JOUR = 10;
const PAGES_MUETTES = ["/login", "/onboarding", "/auth", "/share"];
const CLE_DERNIER = "rl_leonard_dernier";
const CLE_JOUR = "rl_leonard_jour";
const CLE_VISITE = "rl_leonard_visite";
const CLE_FURTIF = "rl_leonard_furtif";
const CLE_RECENTS = "rl_leonard_recents";

const jourLocal = () => new Date().toLocaleDateString("fr-CA");
function lire<T>(cle: string, defaut: T): T {
  try {
    const v = localStorage.getItem(cle);
    return v ? (JSON.parse(v) as T) : defaut;
  } catch {
    return defaut;
  }
}
function ecrire(cle: string, v: unknown) {
  try {
    localStorage.setItem(cle, JSON.stringify(v));
  } catch {
    // stockage indisponible
  }
}

/** Une réplique de l'événement, en évitant les 40 dernières dites. */
function choisir(evt: Exclude<EvenementLeonard, "tuto">, vars?: Record<string, string | number>): Replique | null {
  const liste = REPLIQUES[evt];
  if (!liste?.length) return null;
  const recents = lire<string[]>(CLE_RECENTS, []);
  const neuves = liste.filter((r) => !recents.includes(r.texte));
  const r = (neuves.length ? neuves : liste)[Math.floor(Math.random() * (neuves.length || liste.length))];
  ecrire(CLE_RECENTS, [r.texte, ...recents].slice(0, 40));
  const texte = r.texte.replace(/[{](score|pct|n)[}]/g, (_, k: string) => String(vars?.[k] ?? ""));
  return { ...r, texte };
}

const calmeVoulu = () => {
  try {
    return !lireReglages().anime || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
};
const muet = () => {
  try {
    return !lireReglages().actif || document.documentElement.dataset.discreet === "1";
  } catch {
    return true;
  }
};

/** Préparer le moteur dès qu'une apparition est décidée (elle attend souvent quelques secondes). */
const prechauffer = () =>
  void import("@/lib/leonard/rig")
    .then((m) => m.prechauffer("/leonard/", !calmeVoulu()))
    .catch(() => {});
/** Au-delà, il entre en image fixe plutôt que de se faire attendre (réseau lent). */
const ATTENTE_MAX = 2500;

type Scene = { repliques: Replique[]; tuto: boolean };

export function LeonardHote() {
  const pathname = usePathname() ?? "";
  const [scene, setScene] = useState<Scene | null>(null);
  const [i, setI] = useState(0);
  const [sortie, setSortie] = useState(false);
  const [calme, setCalme] = useState(true);
  const [ecrit, setEcrit] = useState(0);
  const [taille, setTaille] = useState<{ largeur: number; hauteur: number } | null>(null);
  const [fixe, setFixe] = useState(false); // repli image si le moteur échoue
  const boite = useRef<HTMLDivElement | null>(null);
  const rig = useRef<LeonardRig | null>(null);
  const visible = useRef(false);
  const minuteur = useRef<number | null>(null);

  const hauteurVoulue = () => (window.innerWidth < 768 ? 150 : 210);

  // ── décider d'apparaître ────────────────────────────────────────────
  const montrer = useCallback(
    (sig: SignalLeonard) => {
      if (visible.current || muet()) return;
      if (PAGES_MUETTES.some((p) => window.location.pathname.startsWith(p))) return;
      const prio = PRIORITAIRES.has(sig.evt);
      const jour = lire<{ j: string; n: number }>(CLE_JOUR, { j: "", n: 0 });
      const n = jour.j === jourLocal() ? jour.n : 0;
      if (!prio) {
        if (Date.now() - lire<number>(CLE_DERNIER, 0) < ECART_MIN || n >= MAX_JOUR) return;
        if (Math.random() > (PROBA[sig.evt] ?? 1)) return;
      }
      let repliques: Replique[];
      if (sig.evt === "tuto") repliques = TUTO;
      else {
        const r = choisir(sig.evt, sig.vars);
        if (!r) return;
        repliques = [r];
      }
      visible.current = true;
      ecrire(CLE_DERNIER, Date.now());
      ecrire(CLE_JOUR, { j: jourLocal(), n: n + 1 });
      const lancer = () => {
        if (muet()) {
          visible.current = false;
          return;
        }
        setCalme(calmeVoulu());
        setI(0);
        setSortie(false);
        setScene({ repliques, tuto: sig.evt === "tuto" });
      };
      prechauffer();
      if (sig.delai) window.setTimeout(lancer, sig.delai);
      else lancer();
    },
    [],
  );

  // les signaux des écrans
  useEffect(() => {
    const ecoute = (e: Event) => montrer((e as CustomEvent<SignalLeonard>).detail);
    window.addEventListener(EVENEMENT_LEONARD, ecoute);
    return () => window.removeEventListener(EVENEMENT_LEONARD, ecoute);
  }, [montrer]);

  // l'accueil : le tutoriel (une fois), le retour après une absence, ou un passage furtif par jour
  useEffect(() => {
    if (pathname !== "/dashboard" || muet()) return;
    let tutoFait = true;
    try {
      tutoFait = localStorage.getItem(CLE_TUTO) === "1";
    } catch {
      // stockage indisponible : pas de tutoriel
    }
    const derniere = lire<number>(CLE_VISITE, 0);
    ecrire(CLE_VISITE, Date.now());
    let t: number;
    if (!tutoFait) {
      prechauffer();
      t = window.setTimeout(() => montrer({ evt: "tuto" }), 1400);
    }
    else if (derniere && Date.now() - derniere > 3 * 86_400_000) t = window.setTimeout(() => montrer({ evt: "retour" }), 2200);
    else if (lire<string>(CLE_FURTIF, "") !== jourLocal() && Math.random() < 0.35) {
      ecrire(CLE_FURTIF, jourLocal());
      t = window.setTimeout(() => montrer({ evt: "furtif" }), 5000 + Math.random() * 4000);
    } else {
      // précharger le moteur pendant que la page se repose
      t = window.setTimeout(() => void import("@/lib/leonard/rig").catch(() => {}), 4000);
    }
    return () => window.clearTimeout(t);
  }, [pathname, montrer]);

  // un réglage coupé pendant qu'il parle : il s'en va
  useEffect(() => {
    const maj = () => {
      if (muet() && visible.current) fermer();
    };
    window.addEventListener(EVENEMENT_REGLAGES, maj);
    return () => window.removeEventListener(EVENEMENT_REGLAGES, maj);
  });

  // ── le personnage : créé à l'apparition, détruit après la sortie ─────
  useEffect(() => {
    if (!scene || !boite.current) return;
    let annule = false;
    let repli = false;
    const conteneur = boite.current;
    const garde = window.setTimeout(() => {
      repli = true;
      setFixe(true);
    }, ATTENTE_MAX);
    (async () => {
      try {
        const { creerLeonard } = await import("@/lib/leonard/rig");
        if (annule || repli) return;
        const r = await creerLeonard(conteneur, { base: "/leonard/", hauteur: hauteurVoulue(), anime: !calmeVoulu() });
        // arrivé trop tard : il reste en image fixe pour cette fois (la suivante sera prête)
        if (annule || repli) {
          r.detruire();
          return;
        }
        window.clearTimeout(garde);
        rig.current = r;
        setTaille(r.encombrement());
      } catch {
        window.clearTimeout(garde);
        if (!annule) setFixe(true);
      }
    })();
    return () => {
      annule = true;
      window.clearTimeout(garde);
      rig.current?.detruire();
      rig.current = null;
      setTaille(null);
      setFixe(false);
    };
  }, [scene]);

  const replique = scene?.repliques[i] ?? null;
  // tout attend que le personnage soit prêt (ou son image de repli) : il entre avec sa bulle
  const pret = taille !== null || fixe;

  // ── chaque bulle : l'écriture, puis le départ automatique ───────────
  useEffect(() => {
    if (!scene || !replique || !pret) return;
    const n = replique.texte.length;
    const dureeEcriture = calme ? 0 : Math.min(2600, n * 32);
    setEcrit(calme ? n : 0);
    let raf = 0;
    if (!calme) {
      const t0 = performance.now();
      const pas = (t: number) => {
        const k = Math.min(n, Math.round(((t - t0) / dureeEcriture) * n));
        setEcrit(k);
        if (k < n) raf = requestAnimationFrame(pas);
      };
      raf = requestAnimationFrame(pas);
    }
    // une apparition furtive repart seule ; le tutoriel attend le joueur
    if (!scene.tuto) minuteur.current = window.setTimeout(() => fermer(), Math.max(4200, n * 65 + 2400));
    return () => {
      cancelAnimationFrame(raf);
      if (minuteur.current) window.clearTimeout(minuteur.current);
    };
  }, [scene, replique, calme, pret]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── et le personnage : pose, petite réaction, bouche ────────────────
  useEffect(() => {
    const r = rig.current;
    if (!r || !replique) return;
    r.pose(replique.pose === "base" ? null : replique.pose);
    if (replique.pose === "fier") r.reagir("bravo");
    else if (replique.pose === "etonne") r.reagir("surprise");
    else if (replique.pose === "moqueur") r.reagir("rire");
    r.parler(replique.texte, Math.max(900, Math.min(2600, replique.texte.length * 32)));
  }, [replique, taille]);

  const fermer = useCallback(() => {
    if (!visible.current) return;
    setSortie(true);
    window.setTimeout(
      () => {
        setScene(null);
        setSortie(false);
        visible.current = false;
      },
      calmeVoulu() ? 220 : 380,
    );
  }, []);

  const suivant = () => {
    if (!scene) return;
    if (i + 1 < scene.repliques.length) setI(i + 1);
    else finirTuto();
  };
  const finirTuto = () => {
    try {
      localStorage.setItem(CLE_TUTO, "1");
    } catch {
      // stockage indisponible
    }
    fermer();
  };

  if (!scene || !replique) return null;
  const h = taille?.hauteur ?? hauteurVoulue();
  const w = taille?.largeur ?? Math.round((h * 598) / 660); // proportions de base.webp
  const anim = pret ? `${calme ? s.calme : ""} ${sortie ? s.sort : s.entre}` : "";
  const dernier = i + 1 >= scene.repliques.length;

  return (
    <div className={s.scene} aria-live="polite" style={pret ? undefined : { opacity: 0 }}>
      {pret && (
      <div className={`${s.bulle} ${calme ? s.calme : ""} ${sortie ? s.sort : ""}`} role="status">
        <div className={s.tete}>
          <span className={s.point} aria-hidden />
          <span className={s.nom}>Léonard</span>
          <button type="button" className={s.fermer} onClick={scene.tuto ? finirTuto : fermer} aria-label="Fermer">
            <X size={14} aria-hidden />
          </button>
        </div>
        <p className={s.texte}>
          {replique.texte.slice(0, ecrit)}
          <span aria-hidden style={{ opacity: 0 }}>
            {replique.texte.slice(ecrit)}
          </span>
        </p>
        {scene.tuto && (
          <div className={s.actions}>
            {!dernier && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={finirTuto}>
                Passer
              </button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={suivant}>
              {dernier ? "C'est parti" : `Suivant · ${i + 1}/${scene.repliques.length}`}
            </button>
          </div>
        )}
      </div>
      )}
      <div
        ref={boite}
        className={`${s.perso} ${anim}`}
        style={{ width: w, height: h }}
        onClick={scene.tuto ? undefined : fermer}
        role="img"
        aria-label="Léonard de Vinci, la mascotte"
      >
        {fixe && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/leonard/base.webp" alt="" />
        )}
      </div>
    </div>
  );
}
