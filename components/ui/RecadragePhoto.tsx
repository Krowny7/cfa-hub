"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, ZoomIn, ZoomOut } from "lucide-react";
import {
  PhotoTropLourde,
  ZOOM_MAX,
  ZOOM_MIN,
  borner,
  chargerSource,
  deplacer,
  dessinerApercu,
  rendreCarre,
  zoomerVers,
  type Cadrage,
  type PhotoRecadree,
  type SourceImage,
} from "@/lib/profil/recadrage";

// Recadrer la photo de profil : une fenêtre (dialogue natif : Échap annule, le
// focus y reste et revient à sa place) où l'image se déplace au doigt ou à la
// souris, se zoome au curseur, à la molette ou en pinçant, sous un cercle qui
// montre ce qui sera gardé. « Valider » rend un carré 512 × 512 (lib/profil/
// recadrage) et le confie à `onValider` ; s'il échoue (throw), la fenêtre
// reste ouverte avec un message. `source` : un fichier choisi, ou l'adresse
// d'une photo déjà enregistrée (« Recadrer » dans les réglages) ; null :
// fermé.

const RATIO_CERCLE = 0.8; // diamètre du cercle / côté de la scène
const PAS_FLECHE = 0.03;

const TXT = {
  titre: "Recadrer ta photo",
  aide: "Glisse l'image pour la placer, pince ou utilise le curseur pour zoomer. Seul le cercle sera gardé.",
  scene: "Zone de recadrage. Flèches pour déplacer l'image, plus et moins pour zoomer.",
  zoom: "Zoom",
  annuler: "Annuler",
  valider: "Valider",
  envoi: "Envoi…",
  chargement: "Chargement de l'image…",
  choisir: "Choisir un fichier",
  erreurEnvoi: "La photo n'a pas pu être enregistrée. Réessaie.",
  illisible: "Image illisible : choisis un JPEG, un PNG ou un WebP.",
  lourde: "Image trop lourde (30 Mo au plus).",
  relire: "Impossible de relire ta photo ici. Choisis-la à nouveau depuis ton appareil.",
} as const;

type Etat = { phase: "chargement" } | { phase: "pret"; src: SourceImage } | { phase: "erreur"; message: string };

const CENTRE: Cadrage = { zoom: 1, dx: 0, dy: 0 };

function liberer(s: SourceImage) {
  if ("close" in s.image) s.image.close();
}

export function RecadragePhoto({
  source,
  onValider,
  onFermer,
}: {
  source: Blob | string | null;
  onValider: (photo: PhotoRecadree) => Promise<void>;
  onFermer: () => void;
}) {
  if (!source) return null;
  return <Fenetre source={source} onValider={onValider} onFermer={onFermer} />;
}

function Fenetre({ source, onValider, onFermer }: { source: Blob | string; onValider: (photo: PhotoRecadree) => Promise<void>; onFermer: () => void }) {
  const idTitre = useId();
  const idAide = useId();
  const dialog = useRef<HTMLDialogElement | null>(null);
  const scene = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const fermee = useRef(false);
  const pointeurs = useRef(new Map<number, { x: number; y: number }>());

  const [courante, setCourante] = useState<Blob | string>(source);
  const [etat, setEtat] = useState<Etat>({ phase: "chargement" });
  const [cadrage, setCadrage] = useState<Cadrage>(CENTRE);
  const [cote, setCote] = useState(0); // côté de la scène, en px
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);

  const diametre = cote * RATIO_CERCLE;
  const src = etat.phase === "pret" ? etat.src : null;

  // ouverture en dialogue modal ; à la fermeture, le focus retourne d'où il venait
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    fermee.current = false;
    if (!d.open) d.showModal();
    return () => {
      if (d.open) {
        fermee.current = true;
        d.close();
      }
    };
  }, []);

  // chargement de l'image (orientation EXIF, réduite à 2 048 px)
  useEffect(() => {
    let vivant = true;
    let obtenue: SourceImage | null = null;
    setEtat({ phase: "chargement" });
    chargerSource(courante)
      .then((s) => {
        if (!vivant) {
          liberer(s);
          return;
        }
        obtenue = s;
        setCadrage(CENTRE);
        setEtat({ phase: "pret", src: s });
      })
      .catch((e: unknown) => {
        if (!vivant) return;
        // une photo déjà enregistrée qu'on ne peut pas relire (CORS) : on propose de la choisir à nouveau
        const message = e instanceof PhotoTropLourde ? TXT.lourde : typeof courante === "string" ? TXT.relire : TXT.illisible;
        setEtat({ phase: "erreur", message });
      });
    return () => {
      vivant = false;
      if (obtenue) liberer(obtenue);
    };
  }, [courante]);

  // le côté de la scène (elle s'adapte à l'écran)
  useEffect(() => {
    const el = scene.current;
    if (!el) return;
    const mesurer = () => setCote(el.clientWidth);
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // dès que l'image est prête, la scène prend le focus (les flèches y déplacent l'image)
  useEffect(() => {
    if (src) scene.current?.focus({ preventScroll: true });
  }, [src]);

  // l'aperçu : la même géométrie que le rendu final
  useEffect(() => {
    const cv = canvas.current;
    if (!src || !cv || !cote) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.round(cote * dpr);
    if (cv.width !== px) {
      cv.width = px;
      cv.height = px;
    }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    try {
      dessinerApercu(ctx, src, cadrage, cote, diametre);
    } catch {
      // image libérée entre-temps : le chargement suivant redessine
    }
  }, [src, cadrage, cote, diametre]);

  // la molette zoome (écouteur non passif : sinon la page défile derrière)
  useEffect(() => {
    const el = scene.current;
    if (!el || !src || !diametre) return;
    const surMolette = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const fx = (e.clientX - r.left - r.width / 2) / diametre;
      const fy = (e.clientY - r.top - r.height / 2) / diametre;
      const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : e.deltaMode === 1 ? 0.05 : 0.0015));
      setCadrage((c) => zoomerVers(c, c.zoom * k, fx, fy, src.w, src.h));
    };
    el.addEventListener("wheel", surMolette, { passive: false });
    return () => el.removeEventListener("wheel", surMolette);
  }, [src, diametre]);

  function position(e: React.PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  }

  function surAppui(e: React.PointerEvent<HTMLDivElement>) {
    if (!src) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // le glissé continue hors de la scène
    } catch {
      // pointeur déjà relâché : sans importance
    }
    pointeurs.current.set(e.pointerId, position(e));
  }

  function surMouvement(e: React.PointerEvent<HTMLDivElement>) {
    const avant = pointeurs.current.get(e.pointerId);
    if (!avant || !src || !diametre) return;
    const apres = position(e);
    const autre = [...pointeurs.current.entries()].find(([id]) => id !== e.pointerId)?.[1];
    pointeurs.current.set(e.pointerId, apres);
    if (!autre) {
      // un doigt : on déplace
      setCadrage((c) => deplacer(c, (apres.x - avant.x) / diametre, (apres.y - avant.y) / diametre, src.w, src.h));
      return;
    }
    // deux doigts : on zoome autour de leur milieu, qui entraîne l'image
    const d0 = Math.hypot(avant.x - autre.x, avant.y - autre.y);
    const d1 = Math.hypot(apres.x - autre.x, apres.y - autre.y);
    const m0 = { x: (avant.x + autre.x) / 2 / diametre, y: (avant.y + autre.y) / 2 / diametre };
    const m1 = { x: (apres.x + autre.x) / 2 / diametre, y: (apres.y + autre.y) / 2 / diametre };
    setCadrage((c) => {
      const z = d0 > 4 ? zoomerVers(c, c.zoom * (d1 / d0), m0.x, m0.y, src.w, src.h) : c;
      return deplacer(z, m1.x - m0.x, m1.y - m0.y, src.w, src.h);
    });
  }

  function surRelache(e: React.PointerEvent<HTMLDivElement>) {
    pointeurs.current.delete(e.pointerId);
  }

  function surTouche(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!src) return;
    const pas = e.shiftKey ? PAS_FLECHE * 3 : PAS_FLECHE;
    const dep: Record<string, [number, number]> = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] };
    if (dep[e.key]) {
      e.preventDefault();
      const [x, y] = dep[e.key];
      setCadrage((c) => deplacer(c, x, y, src.w, src.h));
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setCadrage((c) => zoomerVers(c, c.zoom * 1.1, 0, 0, src.w, src.h));
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      setCadrage((c) => zoomerVers(c, c.zoom / 1.1, 0, 0, src.w, src.h));
    }
  }

  async function valider() {
    if (!src || envoi) return;
    setEnvoi(true);
    setErreurEnvoi(null);
    try {
      const photo = await rendreCarre(src, borner(cadrage, src.w, src.h));
      await onValider(photo);
      onFermer();
    } catch {
      setErreurEnvoi(TXT.erreurEnvoi);
      setEnvoi(false);
    }
  }

  const rayon = diametre / 2;
  return (
    <dialog
      ref={dialog}
      aria-labelledby={idTitre}
      aria-describedby={idAide}
      onCancel={(e) => {
        if (envoi) e.preventDefault(); // pas d'annulation pendant l'envoi
      }}
      onClose={(e) => {
        // fermée par Échap ; pas quand c'est nous qui la fermons (démontage) ou qu'elle a été rouverte (mode strict)
        if (!fermee.current && !e.currentTarget.open) onFermer();
      }}
      className="m-auto max-h-[calc(100dvh-24px)] w-[min(440px,calc(100vw-24px))] overflow-y-auto rounded-[22px] border border-line-2 bg-[var(--surface)] p-0 text-white shadow-[var(--shadow-3)] backdrop:bg-[rgba(12,12,14,.5)] backdrop:backdrop-blur-[2px]"
    >
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h2 id={idTitre} className="m-0 text-[17px] font-semibold">
            {TXT.titre}
          </h2>
          <p id={idAide} className="t-small m-0 mt-1">
            {TXT.aide}
          </p>
        </div>

        <div
          ref={scene}
          role="group"
          aria-label={TXT.scene}
          tabIndex={src ? 0 : -1}
          onPointerDown={surAppui}
          onPointerMove={surMouvement}
          onPointerUp={surRelache}
          onPointerCancel={surRelache}
          onKeyDown={surTouche}
          className={"relative mx-auto aspect-square w-full max-w-[360px] touch-none select-none overflow-hidden rounded-[16px] bg-[var(--surface-2)] " + (src ? "cursor-grab active:cursor-grabbing" : "")}
        >
          <canvas ref={canvas} aria-hidden className={"absolute inset-0 h-full w-full " + (src ? "" : "invisible")} />
          {src && cote > 0 && (
            <>
              {/* le reste de l'image, assombri hors du cercle */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: `radial-gradient(circle ${rayon + 1}px at 50% 50%, transparent ${rayon - 0.5}px, rgba(10,10,12,.62) ${rayon + 0.5}px)` }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ width: diametre, height: diametre, border: "2px solid rgba(255,255,255,.92)", boxShadow: "0 0 0 1px rgba(0,0,0,.3), inset 0 0 0 1px rgba(0,0,0,.18)" }}
              />
            </>
          )}
          {etat.phase === "chargement" && <p className="t-small absolute inset-0 m-0 grid place-content-center">{TXT.chargement}</p>}
          {etat.phase === "erreur" && (
            <div className="absolute inset-0 grid place-content-center justify-items-center gap-3 p-5 text-center">
              <p role="alert" className="t-small m-0">
                {etat.message}
              </p>
              <label className="btn btn-secondary btn-sm cursor-pointer">
                <ImagePlus size={15} aria-hidden /> {TXT.choisir}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setCourante(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-muted">
          <ZoomOut size={17} aria-hidden className="shrink-0" />
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.01}
            value={cadrage.zoom}
            disabled={!src || envoi}
            onChange={(e) => src && setCadrage((c) => zoomerVers(c, Number(e.target.value), 0, 0, src.w, src.h))}
            aria-label={TXT.zoom}
            aria-valuetext={`${Math.round(cadrage.zoom * 100)} %`}
            className="h-11 min-w-0 flex-1"
            style={{ accentColor: "var(--ink)" }}
          />
          <ZoomIn size={17} aria-hidden className="shrink-0" />
        </div>

        {erreurEnvoi && (
          <p role="alert" className="m-0 text-[13px] font-medium">
            {erreurEnvoi}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onFermer} disabled={envoi}>
            {TXT.annuler}
          </button>
          <button type="button" className="btn btn-primary" onClick={valider} disabled={!src || envoi}>
            {envoi ? TXT.envoi : TXT.valider}
          </button>
        </div>
      </div>
    </dialog>
  );
}
