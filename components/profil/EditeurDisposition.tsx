"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Columns2, EyeOff, GripVertical, ImagePlay, ImagePlus, Plus, RectangleHorizontal, Trash2 } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MediaProfil } from "@/components/profil/Blocs";
import { ImageIllisible, preparerImage } from "@/lib/profil/image";
import {
  BLOCS,
  BUCKET_MEDIAS,
  IMAGE_MAX_PX,
  LEGENDE_MAX,
  MEDIAS_MAX,
  MEDIA_MAX_OCTETS,
  estGif,
  estMedia,
  infoBloc,
  nouvelId,
  peutDemi,
  type Bloc,
  type BlocFixe,
  type BlocMedia,
  type CleBloc,
  type Disposition,
} from "@/lib/profil/disposition";

// La page du joueur, éditable sur place (l'aperçu de l'éditeur du profil) :
// les vrais blocs, dans l'ordre et à la largeur choisis, chacun dans un
// cadre pointillé avec sa barre d'outils posée sur le bord : son nom et sa
// poignée (glisser-déposer à la souris), monter et descendre (partout, au
// doigt et au clavier), toute la ligne ou demi-largeur, masquer (ou
// retirer, pour une image). Le contenu des blocs est inerte (pas de lien
// suivi par erreur). Dessous : « Ajouter à ta page », les blocs masqués et
// l'envoi d'une image ou d'un GIF.
// Les médias : une image (telle quelle si elle est raisonnable, sinon
// réduite à 2 400 px sans perte visible) ou un GIF (tel quel, il garde son
// animation ; 8 Mo au plus), envoyés dans le dossier du joueur.

const Mo = (n: number) => `${Math.round(n / (1024 * 1024))} Mo`;

class Refus extends Error {}

/** Une image prête à l'envoi : telle quelle, ou réduite (2 400 px au plus). */
async function reduireImage(file: File) {
  try {
    return await preparerImage(file, { maxLargeur: IMAGE_MAX_PX, maxHauteur: IMAGE_MAX_PX });
  } catch (e) {
    if (e instanceof ImageIllisible) throw new Refus("Image illisible : choisis un JPEG, un PNG, un WebP ou un GIF.");
    throw e;
  }
}

/** Prépare et envoie un fichier ; renvoie le bloc média (en demi-largeur). */
async function envoyerMedia(supabase: SupabaseClient, file: File): Promise<BlocMedia> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Refus("Connecte-toi pour ajouter un média.");
  const id = nouvelId();
  let blob: Blob, ratio: number, ext: string, contentType: string;
  if (file.type === "image/gif") {
    // un GIF garde son animation : envoyé tel quel
    if (file.size > MEDIA_MAX_OCTETS) throw new Refus(`GIF trop lourd : ${Mo(MEDIA_MAX_OCTETS)} au plus.`);
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) throw new Refus("GIF illisible.");
    ratio = bmp.width / bmp.height;
    bmp.close();
    blob = file;
    ext = "gif";
    contentType = "image/gif";
  } else if (file.type.startsWith("image/") || /[.]hei[cf]$/i.test(file.name)) {
    if (file.size > 30 * 1024 * 1024) throw new Refus("Image trop lourde (30 Mo au plus avant réduction).");
    ({ blob, ratio, ext, contentType } = await reduireImage(file));
  } else {
    throw new Refus("Choisis une image ou un GIF.");
  }
  const path = `${auth.user.id}/${id}.${ext}`;
  const up = await supabase.storage.from(BUCKET_MEDIAS).upload(path, blob, { contentType, upsert: false });
  if (up.error) {
    const m = up.error.message || "";
    if (/bucket not found/i.test(m)) throw new Refus("Les images arrivent bientôt : la base n'est pas encore prête.");
    if (/row-level security|policy/i.test(m)) throw new Refus("Trop de fichiers en attente : enregistre ton profil (les images retirées seront supprimées), puis réessaie.");
    if (/size|too large|exceed/i.test(m)) throw new Refus(`Fichier trop lourd : ${Mo(MEDIA_MAX_OCTETS)} au plus.`);
    throw new Error(m);
  }
  const url = supabase.storage.from(BUCKET_MEDIAS).getPublicUrl(path).data.publicUrl;
  return { k: "media", id, type: "image", url, ratio, legende: null, w: "demi" };
}

const cle = (b: Bloc) => (estMedia(b) ? b.id : b.k);

/** Un petit bouton rond de la barre d'outils. */
function Outil({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 place-items-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[var(--well)] hover:text-white disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

export function EditeurDisposition({
  disposition,
  onChange,
  rendus,
  supabase,
  onEnvoi,
}: {
  disposition: Disposition;
  onChange: (d: Disposition) => void;
  /** le contenu réel de chaque bloc (null : rien à montrer pour l'instant) */
  rendus: Partial<Record<CleBloc, React.ReactNode>>;
  supabase: SupabaseClient;
  /** un envoi est en cours (l'enregistrement attend) */
  onEnvoi?: (enCours: boolean) => void;
}) {
  const fichier = useRef<HTMLInputElement | null>(null);
  const fichierGif = useRef<HTMLInputElement | null>(null);
  const [envoi, setEnvoi] = useState<{ enCours: boolean; texte: string } | null>(null);
  const [prise, setPrise] = useState<string | null>(null); // poignée tenue : le bloc devient déplaçable
  const [tire, setTire] = useState<number | null>(null);
  const [cible, setCible] = useState<number | null>(null);

  const medias = disposition.filter(estMedia).length;
  const plein = medias >= MEDIAS_MAX || !!envoi?.enCours;
  const masques = BLOCS.filter((b) => !disposition.some((x) => x.k === b.k));

  const deplacer = (de: number, vers: number) => {
    if (de === vers || vers < 0 || vers >= disposition.length) return;
    const d = [...disposition];
    const [b] = d.splice(de, 1);
    d.splice(vers, 0, b);
    onChange(d);
  };
  const changer = (i: number, b: Bloc) => onChange(disposition.map((x, j) => (j === i ? b : x)));
  const retirer = (i: number) => onChange(disposition.filter((_, j) => j !== i));
  const finGlisse = () => {
    setTire(null);
    setCible(null);
    setPrise(null);
  };

  async function ajouter(file: File | undefined) {
    if (!file) return;
    if (medias >= MEDIAS_MAX) {
      setEnvoi({ enCours: false, texte: `${MEDIAS_MAX} images au plus sur ta page.` });
      return;
    }
    setEnvoi({ enCours: true, texte: file.type === "image/gif" ? "Envoi du GIF…" : "Envoi de l'image…" });
    onEnvoi?.(true);
    try {
      const b = await envoyerMedia(supabase, file);
      onChange([...disposition, b]);
      setEnvoi(null);
    } catch (e) {
      setEnvoi({ enCours: false, texte: e instanceof Refus ? e.message : "Le fichier n'a pas pu être envoyé. Réessaie dans un instant." });
    } finally {
      onEnvoi?.(false);
      if (fichier.current) fichier.current.value = "";
      if (fichierGif.current) fichierGif.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="grid items-start gap-x-8 gap-y-16 pt-4 lg:grid-cols-2" role="list" aria-label="Les blocs de ta page, dans l'ordre">
        {disposition.map((b, i) => {
          const media = estMedia(b) ? b : null;
          const nom = media ? (estGif(media) ? "GIF" : "Image") : infoBloc((b as BlocFixe).k).nom;
          const contenu = media ? (
            <MediaProfil b={{ ...media, legende: null }} />
          ) : (
            (rendus[(b as BlocFixe).k] ?? (
              <div className="card-quiet grid min-h-[96px] place-items-center p-5 text-center">
                <span className="t-small">
                  <b className="font-semibold">{nom}</b> : rien à montrer pour l&apos;instant. Le bloc apparaîtra sur ta page dès qu&apos;il aura du contenu.
                </span>
              </div>
            ))
          );
          const vise = cible === i && tire !== null && tire !== i;
          return (
            <div
              key={cle(b)}
              role="listitem"
              aria-label={`${nom}, ${b.w === "plein" ? "toute la ligne" : "demi-largeur"}`}
              draggable={prise === cle(b)}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
                setTire(i);
              }}
              onDragOver={(e) => {
                if (tire === null) return;
                e.preventDefault();
                setCible(i);
              }}
              onDragLeave={() => setCible((c) => (c === i ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                if (tire !== null) deplacer(tire, i);
                finGlisse();
              }}
              onDragEnd={finGlisse}
              className={
                "@container relative min-w-0 rounded-[22px] outline-offset-[10px] transition-[outline-color,opacity] " +
                (b.w === "plein" ? "lg:col-span-2 " : "") +
                (tire === i ? "opacity-40 " : "") +
                (vise ? "outline outline-2 outline-[var(--ink)]" : "outline-dashed outline-1 outline-[var(--line-2)] hover:outline-[var(--ink-3)]")
              }
            >
              {/* la barre d'outils, posée sur le bord haut du cadre */}
              <div className="pointer-events-none absolute -top-[36px] left-1 right-1 z-[5] flex items-center justify-between gap-2">
                <span
                  className="pointer-events-auto inline-flex min-w-0 cursor-grab items-center gap-1 rounded-full border border-line-2 bg-[var(--surface)] py-1 pl-1.5 pr-3 text-[12px] font-semibold shadow-[var(--shadow-1)] active:cursor-grabbing"
                  onPointerDown={() => setPrise(cle(b))}
                  onPointerUp={() => setPrise(null)}
                  title="Glisser pour déplacer"
                >
                  <GripVertical size={14} aria-hidden className="shrink-0 text-muted" />
                  <span className="truncate">{nom}</span>
                </span>
                <span className="pointer-events-auto inline-flex shrink-0 items-center rounded-full border border-line-2 bg-[var(--surface)] p-0.5 shadow-[var(--shadow-1)]">
                  <Outil label={`Monter : ${nom}`} onClick={() => deplacer(i, i - 1)} disabled={i === 0}>
                    <ArrowUp size={14} aria-hidden />
                  </Outil>
                  <Outil label={`Descendre : ${nom}`} onClick={() => deplacer(i, i + 1)} disabled={i === disposition.length - 1}>
                    <ArrowDown size={14} aria-hidden />
                  </Outil>
                  {peutDemi(b) && (
                    <Outil label={b.w === "plein" ? `Demi-largeur : ${nom}` : `Toute la ligne : ${nom}`} onClick={() => changer(i, { ...b, w: b.w === "plein" ? "demi" : "plein" })}>
                      {b.w === "plein" ? <Columns2 size={14} aria-hidden /> : <RectangleHorizontal size={14} aria-hidden />}
                    </Outil>
                  )}
                  <Outil label={media ? `Retirer : ${nom}` : `Masquer : ${nom}`} onClick={() => retirer(i)}>
                    {media ? <Trash2 size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
                  </Outil>
                </span>
              </div>

              {/* le vrai bloc, inerte : on range, on ne clique pas dedans */}
              <div inert className="select-none">
                {contenu}
              </div>
              {media && (
                <>
                  <label className="sr-only" htmlFor={`leg-${media.id}`}>
                    Légende
                  </label>
                  <input
                    id={`leg-${media.id}`}
                    className="input mt-2.5 !h-9 !text-[13px]"
                    maxLength={LEGENDE_MAX}
                    placeholder="Une légende (facultatif)"
                    value={media.legende ?? ""}
                    onChange={(e) => changer(i, { ...media, legende: e.target.value || null })}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ajouter : les blocs masqués, une image, un GIF */}
      <div className="flex flex-col gap-3 rounded-[22px] border border-dashed border-line-2 p-4 sm:p-5">
        <p className="t-eyebrow m-0">Ajouter à ta page</p>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fichier} type="file" accept="image/*" className="sr-only" id="rl-media" onChange={(e) => ajouter(e.target.files?.[0])} />
          <input ref={fichierGif} type="file" accept="image/gif" className="sr-only" id="rl-gif" onChange={(e) => ajouter(e.target.files?.[0])} />
          <label htmlFor="rl-media" aria-disabled={plein} className={"btn btn-secondary btn-sm cursor-pointer " + (plein ? "pointer-events-none opacity-50" : "")}>
            <ImagePlus size={15} aria-hidden /> Une image
          </label>
          <label htmlFor="rl-gif" aria-disabled={plein} className={"btn btn-secondary btn-sm cursor-pointer " + (plein ? "pointer-events-none opacity-50" : "")}>
            <ImagePlay size={15} aria-hidden /> Un GIF
          </label>
          {masques.map((b) => (
            <button key={b.k} type="button" className="btn btn-ghost btn-sm border border-dashed border-line-2" onClick={() => onChange([...disposition, { k: b.k, w: "plein" }])}>
              <Plus size={14} aria-hidden /> {b.nom}
            </button>
          ))}
        </div>
        {envoi && (
          <p role="status" className={"m-0 text-[12.5px] font-medium " + (envoi.enCours ? "" : "text-pen")}>
            {envoi.texte}
          </p>
        )}
        <p className="t-micro m-0">
          {medias}/{MEDIAS_MAX} images. Les images trop grandes sont réduites à l&apos;envoi ; les GIF gardent leur animation et font {Mo(MEDIA_MAX_OCTETS)} au plus. Un bloc masqué revient ici.
        </p>
      </div>
    </div>
  );
}
