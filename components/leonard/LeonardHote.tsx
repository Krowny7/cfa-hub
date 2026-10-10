"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { EVENEMENT_LEONARD, type EvenementLeonard, type SignalLeonard } from "@/lib/leonard/signal";
import { CLE_NOUVEAUTES, CLE_TUTO, EVENEMENT_REGLAGES, lireReglages } from "@/lib/leonard/reglages";
import type { LeonardRig } from "@/lib/leonard/rig";
import { NOUVEAUTES, REPLIQUES, TUTO, type EtapeTuto, type Replique, type Visite } from "@/lib/leonard/repliques";
import { CLE_NOUVEAUTES_COMPTE, CLE_VISITE_COMPTE, VERSION_NOUVEAUTES, VERSION_PRESENTATION, nouveautesVues, visiteVue } from "@/lib/presentation";
import s from "./Leonard.module.css";

// Léonard sur toutes les pages : il écoute les signaux des écrans
// (lib/leonard/signal) et décide s'il apparaît.
// - Jamais : en mode discret, si le joueur l'a coupé (page Moi), sur les
//   pages d'entrée (connexion, inscription), ni s'il est déjà à l'écran.
// - La visite guidée, une fois par compte (lib/presentation ; retenue aussi
//   sur l'appareil), à la première visite de l'accueil après l'intro et le
//   premier trait : il emmène le joueur de page en page, l'écran s'assombrit et
//   un projecteur éclaire ce dont il parle (attribut data-leonard). Si
//   l'élément est sous lui, il sort et revient de l'autre côté.
// - Les nouveautés d'une version (NOUVEAUTES, lib/presentation) : la même
//   mécanique, une fois par compte, pour qui a déjà fait la visite d'accueil.
// - Ensuite, des apparitions furtives : au plus une toutes les 4 minutes et
//   10 par jour (sauf visite, progression, montée de rang, sceau gagné, sans-faute),
//   avec un peu de hasard pour les réactions ordinaires.
// - Il surgit du bord bas de l'écran, la bulle (une carte du site) s'écrit,
//   il parle, puis repart seul ; un clic le congédie. Sans son.
// - Animations coupées (réglage, ou mouvement réduit) : image fixe, sans
//   machine à écrire ni glissement.
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
  "atelier-progres": 0.9,
  "atelier-rayees": 0.75,
  "atelier-dur": 0.6,
  "atelier-fini": 0.5,
  tard: 0.6,
};
const PRIORITAIRES = new Set<EvenementLeonard>(["tuto", "nouveautes", "progression", "rang-monte", "sceau-gagne", "session-parfaite", "retour"]);
const ECART_MIN = 4 * 60_000;
const MAX_JOUR = 10;
const PAGES_MUETTES = ["/login", "/onboarding", "/auth", "/share"];
const pageMuette = (chemin: string) => PAGES_MUETTES.some((p) => chemin.startsWith(p));
const CLE_DERNIER = "rl_leonard_dernier";
const CLE_JOUR = "rl_leonard_jour";
const CLE_VISITE = "rl_leonard_visite";
const CLE_FURTIF = "rl_leonard_furtif";
const CLE_RECENTS = "rl_leonard_recents";
const CLE_INTRO = "rl-splash-seen"; // posée par components/Splash quand l'intro s'efface
// Banc d'essai local (sessionStorage) : la visite passe par les aperçus /preview-da.
const CLE_ESSAI = "rl_leonard_essai";
const CLE_ESSAI_ID = "rl_leonard_essai_id"; // le profil montré sur le banc d'essai

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
function choisir(evt: Exclude<EvenementLeonard, Visite>, vars?: Record<string, string | number>): Replique | null {
  const liste = REPLIQUES[evt];
  if (!liste?.length) return null;
  const recents = lire<string[]>(CLE_RECENTS, []);
  const neuves = liste.filter((r) => !recents.includes(r.texte));
  const r = (neuves.length ? neuves : liste)[Math.floor(Math.random() * (neuves.length || liste.length))];
  ecrire(CLE_RECENTS, [r.texte, ...recents].slice(0, 40));
  const texte = r.texte.replace(/[{](score|pct|n|notion)[}]/g, (_, k: string) => String(vars?.[k] ?? ""));
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
const telephone = () => window.innerWidth < 768;
const hauteurVoulue = (visite: boolean) => (telephone() ? (visite ? 170 : 150) : visite ? 300 : 210);

/** Préparer le moteur dès qu'une apparition est décidée (elle attend souvent quelques secondes). */
const prechauffer = () =>
  void import("@/lib/leonard/rig")
    .then((m) => m.prechauffer("/leonard/", !calmeVoulu()))
    .catch(() => {});
/** Au-delà, il entre en image fixe plutôt que de se faire attendre (réseau lent). */
const ATTENTE_MAX = 2500;

/**
 * L'adresse réelle d'une étape : « /profil » est le profil du joueur
 * (`moi`, son id ; sans id, l'étape n'a pas d'adresse). Sur le banc d'essai,
 * les aperçus locaux.
 */
function adresse(page: string, moi: string | null): string | null {
  let essai = false;
  try {
    essai = sessionStorage.getItem(CLE_ESSAI) === "1";
  } catch {
    // stockage bloqué : le vrai site
  }
  const [chemin, requete] = page.split("?");
  if (chemin === "/profil") {
    if (!moi) return null;
    if (essai) return `/preview-da/profil-reel?id=${moi}` + (requete ? "&" + requete : "");
    return `/people/${moi}` + (requete ? "?" + requete : "");
  }
  if (!essai) return page;
  return (chemin === "/dashboard" ? "/preview-da/accueil" : "/preview-da" + chemin) + (requete ? "?" + requete : "");
}
/** Le premier élément affiché qui porte ce repère. */
function premierVisible(cible: string) {
  for (const el of document.querySelectorAll(`[data-leonard="${cible}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}
/** Ce que ce compte a déjà vu (sur un autre appareil peut-être), et son id. */
async function etatDuCompte(): Promise<{ visite: boolean; nouveautes: boolean; id: string | null }> {
  try {
    const { createClient } = await import("@/lib/supabase/browser");
    const { data } = await createClient().auth.getUser();
    const meta = data.user?.user_metadata;
    return { visite: visiteVue(meta), nouveautes: nouveautesVues(meta), id: data.user?.id ?? null };
  } catch {
    return { visite: false, nouveautes: false, id: null };
  }
}
/** L'id du joueur connecté (les étapes sur son profil), ou celui du banc d'essai. */
async function monId() {
  try {
    const essai = sessionStorage.getItem(CLE_ESSAI) === "1" ? sessionStorage.getItem(CLE_ESSAI_ID) : null;
    if (essai) return essai;
  } catch {
    // stockage bloqué
  }
  return (await etatDuCompte()).id;
}
/**
 * Retenir une visite faite (ou passée) sur le compte, sans effet hors
 * connexion. Celle d'accueil vaut aussi pour les nouveautés de cette version.
 */
function retenirVisite(v: Visite) {
  const data =
    v === "tuto" ? { [CLE_VISITE_COMPTE]: VERSION_PRESENTATION, [CLE_NOUVEAUTES_COMPTE]: VERSION_NOUVEAUTES } : { [CLE_NOUVEAUTES_COMPTE]: VERSION_NOUVEAUTES };
  void import("@/lib/supabase/browser")
    .then(({ createClient }) => createClient().auth.updateUser({ data }))
    .catch(() => {});
}
/** Les nouveautés de cette version déjà vues sur cet appareil ? */
const nouveautesVuesIci = () => lire<number>(CLE_NOUVEAUTES, 0) >= VERSION_NOUVEAUTES;

/** Après l'intro (une fois par session de navigation), puis `delai`. */
function apresIntro(f: () => void, delai: number) {
  let t = 0;
  const debut = Date.now();
  const voir = () => {
    let vue = true;
    try {
      vue = sessionStorage.getItem(CLE_INTRO) === "1";
    } catch {
      // stockage bloqué : l'intro ne bloque rien
    }
    if (vue || Date.now() - debut > 30_000) t = window.setTimeout(f, delai);
    else t = window.setTimeout(voir, 300);
  };
  voir();
  return () => window.clearTimeout(t);
}

/** `tuto` : une visite guidée (celle d'accueil ou les nouveautés : `visite`), qui attend le joueur à chaque étape. */
type Scene = { repliques: Replique[]; tuto: boolean; visite: Visite | null };
type Cote = "droite" | "gauche";
type Rect = { x: number; y: number; w: number; h: number };

export function LeonardHote() {
  const pathname = usePathname() ?? "";
  const routeur = useRouter();
  const [scene, setScene] = useState<Scene | null>(null);
  const [i, setI] = useState(0);
  const [sortie, setSortie] = useState(false);
  const [calme, setCalme] = useState(true);
  const [ecrit, setEcrit] = useState(0);
  const [taille, setTaille] = useState<{ largeur: number; hauteur: number } | null>(null);
  const [fixe, setFixe] = useState(false); // repli image si le moteur échoue
  const [arrive, setArrive] = useState(true); // visite : la page est là, l'élément éclairé
  const [cote, setCote] = useState<Cote>("droite");
  const boite = useRef<HTMLDivElement | null>(null);
  const voile = useRef<HTMLDivElement | null>(null);
  const anneau = useRef<HTMLDivElement | null>(null);
  const suivantRef = useRef<HTMLButtonElement | null>(null);
  const rig = useRef<LeonardRig | null>(null);
  const visible = useRef(false);
  const minuteur = useRef<number | null>(null);
  const cible = useRef<Element | null>(null);
  const coteRef = useRef<Cote>("droite");
  const visiteRef = useRef<Visite | null>(null);

  // ── décider d'apparaître ────────────────────────────────────────────
  const montrer = useCallback((sig: SignalLeonard) => {
    if (visible.current || muet()) return;
    if (pageMuette(window.location.pathname)) return;
    const prio = PRIORITAIRES.has(sig.evt);
    const jour = lire<{ j: string; n: number }>(CLE_JOUR, { j: "", n: 0 });
    const n = jour.j === jourLocal() ? jour.n : 0;
    if (!prio) {
      if (Date.now() - lire<number>(CLE_DERNIER, 0) < ECART_MIN || n >= MAX_JOUR) return;
      if (Math.random() > (PROBA[sig.evt] ?? 1)) return;
    }
    const visite: Visite | null = sig.evt === "tuto" || sig.evt === "nouveautes" ? sig.evt : null;
    let repliques: Replique[];
    if (sig.evt === "tuto") repliques = TUTO;
    else if (sig.evt === "nouveautes") repliques = NOUVEAUTES;
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
      visiteRef.current = visite;
      setArrive(!visite);
      setScene({ repliques, tuto: !!visite, visite });
    };
    prechauffer();
    if (sig.delai) window.setTimeout(lancer, sig.delai);
    else lancer();
  }, []);

  // les signaux des écrans
  useEffect(() => {
    const ecoute = (e: Event) => montrer((e as CustomEvent<SignalLeonard>).detail);
    window.addEventListener(EVENEMENT_LEONARD, ecoute);
    return () => window.removeEventListener(EVENEMENT_LEONARD, ecoute);
  }, [montrer]);

  // l'accueil : la visite (une fois), sinon les nouveautés (une fois par
  // version), le retour après une absence, ou un passage furtif par jour
  useEffect(() => {
    if (pathname !== "/dashboard" || muet() || visible.current) return;
    let tutoFait = true;
    let nouvFaites = true;
    try {
      tutoFait = localStorage.getItem(CLE_TUTO) === "1";
      nouvFaites = nouveautesVuesIci();
    } catch {
      // stockage indisponible : pas de visite
    }
    const derniere = lire<number>(CLE_VISITE, 0);
    ecrire(CLE_VISITE, Date.now());
    if (!tutoFait || !nouvFaites) {
      let annule = false;
      let arret = () => {};
      prechauffer();
      void etatDuCompte().then((compte) => {
        if (annule) return;
        if (!tutoFait) {
          if (!compte.visite) {
            arret = apresIntro(() => montrer({ evt: "tuto" }), 1600);
            return;
          }
          try {
            localStorage.setItem(CLE_TUTO, "1");
          } catch {
            // stockage indisponible
          }
        }
        if (compte.nouveautes) {
          ecrire(CLE_NOUVEAUTES, VERSION_NOUVEAUTES);
          return;
        }
        arret = apresIntro(() => montrer({ evt: "nouveautes" }), 1600);
      });
      return () => {
        annule = true;
        arret();
      };
    }
    let t: number;
    if (derniere && Date.now() - derniere > 3 * 86_400_000) t = window.setTimeout(() => montrer({ evt: "retour" }), 2200);
    else if (lire<string>(CLE_FURTIF, "") !== jourLocal() && Math.random() < 0.35) {
      ecrire(CLE_FURTIF, jourLocal());
      t = window.setTimeout(() => montrer({ evt: "furtif" }), 5000 + Math.random() * 4000);
    } else {
      // précharger le moteur pendant que la page se repose
      t = window.setTimeout(() => void import("@/lib/leonard/rig").catch(() => {}), 4000);
    }
    return () => window.clearTimeout(t);
  }, [pathname, montrer]);

  const fermer = useCallback(() => {
    if (!visible.current) return;
    setSortie(true);
    window.setTimeout(
      () => {
        setScene(null);
        setSortie(false);
        setArrive(true);
        coteRef.current = "droite";
        setCote("droite");
        cible.current = null;
        visible.current = false;
      },
      calmeVoulu() ? 220 : 380,
    );
  }, []);

  // la fin (ou « Passer ») d'une visite : retenue sur l'appareil et le compte ;
  // celle d'accueil vaut aussi pour les nouveautés de cette version
  const finirTuto = useCallback(() => {
    const v = visiteRef.current ?? "tuto";
    try {
      if (v === "tuto") localStorage.setItem(CLE_TUTO, "1");
    } catch {
      // stockage indisponible
    }
    ecrire(CLE_NOUVEAUTES, VERSION_NOUVEAUTES);
    retenirVisite(v);
    fermer();
  }, [fermer]);

  // emmené sur une page où il se tait (redirigé vers le premier trait d'une
  // nouvelle version, session expirée…) : il s'efface, sans marquer la
  // visite comme faite (elle reprendra après le premier trait, ou « Revoir »)
  useEffect(() => {
    if (visible.current && pageMuette(pathname)) fermer();
  }, [pathname, fermer]);

  // un réglage coupé pendant qu'il parle : il s'en va
  useEffect(() => {
    const maj = () => {
      if (muet() && visible.current) fermer();
    };
    window.addEventListener(EVENEMENT_REGLAGES, maj);
    return () => window.removeEventListener(EVENEMENT_REGLAGES, maj);
  }, [fermer]);

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
        const r = await creerLeonard(conteneur, { base: "/leonard/", hauteur: hauteurVoulue(scene.tuto), anime: !calmeVoulu() });
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
  const enPlace = pret && (!scene?.tuto || arrive);

  // ── la visite : aller à la page, attendre l'élément, l'amener, l'éclairer ──
  useEffect(() => {
    if (!scene?.tuto || !pret) return;
    const etape = scene.repliques[i] as EtapeTuto;
    let fini = false;
    const minuteurs: number[] = [];
    const attendre = (ms: number) => new Promise<void>((ok) => minuteurs.push(window.setTimeout(ok, ms)));
    setArrive(false);
    cible.current = null;
    // une étape sans rien à montrer (facultative, ou sans adresse) : la suivante
    const sauter = () => {
      if (i + 1 < scene.repliques.length) setI(i + 1);
      else finirTuto();
    };
    (async () => {
      const voulu = adresse(etape.page, etape.page.startsWith("/profil") ? await monId() : null);
      if (fini) return;
      if (!voulu) return sauter();
      const [chemin, requete] = voulu.split("?");
      // même page, autre onglet (?onglet=…) : arrivé quand l'adresse porte ses paramètres
      const parametresOk = () => {
        const ici = new URLSearchParams(window.location.search);
        return [...new URLSearchParams(requete ?? "")].every(([k, v]) => ici.get(k) === v);
      };
      if (window.location.pathname + window.location.search !== voulu) routeur.push(voulu);
      // la page (15 s au plus), puis l'élément (5 s de plus, sinon l'étape se joue sans projecteur)
      let el: Element | null = null;
      let arrivee = -1;
      for (let k = 0; k < 200 && !fini; k++) {
        const ici = window.location.pathname;
        if (pageMuette(ici)) break;
        if (ici === chemin && parametresOk()) {
          if (arrivee < 0) arrivee = k;
          // l'élément, sinon son repli (déjà là : l'élément voulu ne viendra pas)
          el = etape.cible ? (premierVisible(etape.cible) ?? (etape.repli ? premierVisible(etape.repli) : null)) : null;
          if (!etape.cible || el || k - arrivee > (etape.facultatif ? 25 : 50)) break;
        } else if (k >= 150) break;
        await attendre(100);
      }
      if (fini) return;
      // redirigé ailleurs, ou page qui n'arrive pas : il ne parle pas d'une
      // autre page que la sienne ; il s'efface (la visite n'est pas marquée faite)
      if (window.location.pathname !== chemin) {
        fermer();
        return;
      }
      if (etape.facultatif && !el) return sauter();
      const doux = !calmeVoulu();
      if (el) {
        // l'élément en haut de l'écran, sous la barre : Léonard et sa bulle occupent le bas
        const r = el.getBoundingClientRect();
        const haut = telephone() ? 76 : 96;
        const libre = window.innerHeight - (telephone() ? 420 : 370);
        if (r.top < haut || r.bottom > libre) {
          window.scrollTo({ top: Math.max(0, window.scrollY + r.top - haut), behavior: doux ? "smooth" : "auto" });
          await attendre(doux ? 560 : 60);
          if (fini) return;
        }
      } else if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: doux ? "smooth" : "auto" });
      cible.current = el;
      const voulue = coteLibre(el, taille?.largeur);
      if (voulue !== coteRef.current) {
        await changerCote(voulue, boite.current, doux, (c) => {
          coteRef.current = c;
          setCote(c);
        });
        if (fini) return;
      }
      setArrive(true);
    })();
    return () => {
      fini = true;
      minuteurs.forEach((t) => window.clearTimeout(t));
    };
  }, [scene, i, pret]); // eslint-disable-line react-hooks/exhaustive-deps

  // le projecteur suit l'élément (défilement, redimensionnement) et glisse d'une étape à l'autre :
  // le voile est découpé (clip-path) plutôt qu'une ombre géante, bien plus lourde à redessiner
  useEffect(() => {
    if (!scene?.tuto) return;
    let raf = 0;
    let cur: Rect | null = null;
    let dernier: Element | null = null;
    let depuis = 0;
    let ecritAvant = "";
    const pas = (t: number) => {
      const v = voile.current;
      const a = anneau.current;
      if (v && a) {
        const el = cible.current && cible.current.isConnected ? cible.current : null;
        let but: Rect;
        if (el) {
          const r = el.getBoundingClientRect();
          but = { x: r.left - 8, y: r.top - 8, w: r.width + 16, h: r.height + 16 };
        } else if (cur) but = { x: cur.x + cur.w / 2, y: cur.y + cur.h / 2, w: 0, h: 0 }; // il se referme sur place
        else but = { x: window.innerWidth / 2, y: window.innerHeight / 2, w: 0, h: 0 };
        if (el !== dernier) {
          dernier = el;
          depuis = t;
        }
        if (!cur || calmeVoulu() || t - depuis > 700) cur = but;
        else {
          const k = 0.16;
          cur = { x: cur.x + (but.x - cur.x) * k, y: cur.y + (but.y - cur.y) * k, w: cur.w + (but.w - cur.w) * k, h: cur.h + (but.h - cur.h) * k };
        }
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const cle = `${cur.x.toFixed(1)},${cur.y.toFixed(1)},${cur.w.toFixed(1)},${cur.h.toFixed(1)},${vw},${vh}`;
        if (cle !== ecritAvant) {
          ecritAvant = cle;
          v.style.clipPath = `path(evenodd, "M0 0H${vw}V${vh}H0Z${rectArrondi(cur, 18)}")`;
          a.style.transform = `translate(${cur.x - 4}px, ${cur.y - 4}px)`;
          a.style.width = `${cur.w + 8}px`;
          a.style.height = `${cur.h + 8}px`;
        }
        a.dataset.vide = el ? "0" : "1";
      }
      raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [scene]);

  // ── chaque bulle : l'écriture, puis le départ automatique ───────────
  useEffect(() => {
    if (!scene || !replique || !enPlace) return;
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
    // une apparition furtive repart seule ; la visite attend le joueur
    if (!scene.tuto) minuteur.current = window.setTimeout(() => fermer(), Math.max(4200, n * 65 + 2400));
    else suivantRef.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(raf);
      if (minuteur.current) window.clearTimeout(minuteur.current);
    };
  }, [scene, replique, calme, enPlace]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── et le personnage : pose, petite réaction, bouche ────────────────
  useEffect(() => {
    const r = rig.current;
    if (!r || !replique || !enPlace) return;
    r.pose(replique.pose === "base" ? null : replique.pose);
    if (replique.pose === "fier") r.reagir("bravo");
    else if (replique.pose === "etonne") r.reagir("surprise");
    else if (replique.pose === "moqueur") r.reagir("rire");
    r.parler(replique.texte, Math.max(900, Math.min(2600, replique.texte.length * 32)));
  }, [replique, taille, enPlace]);

  // la visite au clavier : Échap pour passer
  useEffect(() => {
    if (!scene?.tuto) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") finirTuto();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [scene, finirTuto]);

  const suivant = () => {
    if (!scene) return;
    if (i + 1 < scene.repliques.length) setI(i + 1);
    else finirTuto();
  };

  if (!scene || !replique) return null;
  const h = taille?.hauteur ?? hauteurVoulue(scene.tuto);
  const w = taille?.largeur ?? Math.round((h * 598) / 660); // proportions de base.webp
  const anim = pret ? `${calme ? s.calme : ""} ${sortie ? s.sort : s.entre}` : "";
  const dernier = i + 1 >= scene.repliques.length;
  const classes = [s.scene, scene.tuto ? s.tuto : "", cote === "gauche" ? s.gauche : ""].join(" ");

  return (
    <>
      {scene.tuto && (
        <>
          {/* le voile : tout s'assombrit sauf l'élément montré, cerclé d'un trait rouge ; la page ne se clique plus */}
          <div ref={voile} className={`${s.voile} ${sortie ? s.sort : ""}`} aria-hidden />
          <div ref={anneau} className={`${s.anneau} ${sortie ? s.sort : ""}`} data-vide="1" aria-hidden />
          <div className={s.capte} aria-hidden />
          {/* de quoi défiler : même un élément en bas de page monte au-dessus de Léonard */}
          <div className={s.espace} aria-hidden />
        </>
      )}
      <div
        className={classes}
        aria-live="polite"
        role={scene.tuto ? "dialog" : undefined}
        aria-modal={scene.tuto ? true : undefined}
        aria-label={scene.visite === "nouveautes" ? "Les nouveautés, avec Léonard" : scene.tuto ? "Visite guidée avec Léonard" : undefined}
        style={{ ["--leo-h" as string]: `${h}px`, ["--leo-w" as string]: `${w}px`, ...(pret ? null : { opacity: 0 }) }}
      >
        {enPlace && (
          <div key={i} className={`${s.bulle} ${calme ? s.calme : ""} ${sortie ? s.sort : ""}`} role="status">
            <div className={s.tete}>
              <span className={s.point} aria-hidden />
              <span className={s.nom}>Léonard</span>
              {scene.tuto && (
                <span className={s.etape}>
                  {i + 1}/{scene.repliques.length}
                </span>
              )}
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
                <button ref={suivantRef} type="button" className="btn btn-primary btn-sm" onClick={suivant}>
                  {dernier ? "C'est parti" : i === 0 ? "On y va" : "Suivant"}
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
    </>
  );
}

/** Le trou du voile : un rectangle arrondi (chemin SVG). */
function rectArrondi({ x, y, w, h }: Rect, rayon: number) {
  const r = Math.max(0, Math.min(rayon, w / 2, h / 2));
  const f = (n: number) => n.toFixed(1);
  return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${r} ${r} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}A${r} ${r} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${r} ${r} 0 0 1 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${r} ${r} 0 0 1 ${f(x + r)} ${f(y)}Z`;
}

/**
 * Le côté où Léonard ne cache pas l'élément montré (ordinateur seulement :
 * sur téléphone il reste à droite, au-dessus de la barre d'onglets, et la
 * page défile pour que l'élément soit en haut).
 */
function coteLibre(el: Element | null, largeur?: number): Cote {
  if (!el || telephone()) return "droite";
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const h = hauteurVoulue(true);
  const zw = (largeur ?? (h * 598) / 660) + 420; // Léonard et sa bulle
  const zh = Math.max(h, h * 0.56 + 190) + 12;
  const recouvre = (x0: number, x1: number) =>
    Math.max(0, Math.min(r.right, x1) - Math.max(r.left, x0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, vh - zh));
  const aDroite = recouvre(vw - zw, vw);
  if (aDroite === 0) return "droite";
  return recouvre(0, zw) < aDroite ? "gauche" : "droite";
}

/** Il sort par son bord et revient par l'autre (ou change de côté d'un coup, sans animation). */
async function changerCote(vers: Cote, el: HTMLElement | null, doux: boolean, poser: (c: Cote) => void) {
  if (!el || !doux) {
    poser(vers);
    return;
  }
  const dehors = (c: Cote) => (c === "droite" ? "translateX(125%) rotate(5deg)" : "translateX(-125%) rotate(-5deg)");
  const depart: Cote = vers === "droite" ? "gauche" : "droite";
  try {
    // invisible à la fin : le changement de côté (et l'animation CSS qu'il relance) ne se voit pas
    await el.animate([{ transform: "none" }, { transform: dehors(depart), opacity: 0, offset: 1 }], { duration: 320, easing: "cubic-bezier(.5,0,.9,.4)", fill: "forwards" }).finished;
  } catch {
    // animation interrompue : on change de côté quand même
  }
  poser(vers);
  await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
  el.getAnimations().forEach((a) => a.cancel());
  try {
    await el.animate([{ transform: dehors(vers) }, { transform: "none" }], { duration: 620, easing: "cubic-bezier(.18,1.25,.4,1)" }).finished;
  } catch {
    // interrompue : il est déjà en place
  }
}
