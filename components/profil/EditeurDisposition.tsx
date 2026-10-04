"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Columns2, EyeOff, GalleryHorizontal, GripVertical, ImagePlay, ImagePlus, ListChecks, Plus, Radar, RectangleHorizontal, Trash2, TrendingUp, Trophy, Users } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  type Disposition,
} from "@/lib/profil/disposition";

// La disposition de la page, dans l'éditeur du profil : le plan de la page
// en deux colonnes (comme sur grand écran), un bloc par case. On range en
// glissant la poignée (souris) ou avec les flèches (partout, au clavier et
// au doigt) ; chaque bloc se met sur toute la ligne ou sur une demi-ligne ;
// on masque un bloc (il reste proposé dessous) ou on retire un média.
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
    if (/bucket not found/i.test(m)) throw new Refus("Les médias arrivent bientôt : la base n'est pas encore prête.");
    if (/row-level security|policy/i.test(m)) throw new Refus("Trop de fichiers en attente : enregistre ton profil (les médias retirés seront supprimés), puis réessaie.");
    if (/size|too large|exceed/i.test(m)) throw new Refus(`Fichier trop lourd : ${Mo(MEDIA_MAX_OCTETS)} au plus.`);
    throw new Error(m);
  }
  const url = supabase.storage.from(BUCKET_MEDIAS).getPublicUrl(path).data.publicUrl;
  return { k: "media", id, type: "image", url, ratio, legende: null, w: "demi" };
}

const cle = (b: Bloc) => (estMedia(b) ? b.id : b.k);
const ICONES = { vitrine: GalleryHorizontal, radar: Radar, amis: Users, reponses: ListChecks, trophees: Trophy, progression: TrendingUp };

export function EditeurDisposition({
  disposition,
  onChange,
  supabase,
  onEnvoi,
}: {
  disposition: Disposition;
  onChange: (d: Disposition) => void;
  supabase: SupabaseClient;
  /** un envoi est en cours (l'enregistrement attend) */
  onEnvoi?: (enCours: boolean) => void;
}) {
  const fichier = useRef<HTMLInputElement | null>(null);
  const fichierGif = useRef<HTMLInputElement | null>(null);
  const [envoi, setEnvoi] = useState<{ enCours: boolean; texte: string } | null>(null);
  const [prise, setPrise] = useState<string | null>(null); // poignée tenue : la case devient déplaçable
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

  async function ajouter(file: File | undefined) {
    if (!file) return;
    if (medias >= MEDIAS_MAX) {
      setEnvoi({ enCours: false, texte: `${MEDIAS_MAX} médias au plus sur ta page.` });
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
    <div className="flex flex-col gap-3">
      <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0" aria-label="Blocs de ta page, dans l'ordre">
        {disposition.map((b, i) => {
          const media = estMedia(b) ? b : null;
          const nom = media ? (estGif(media) ? "GIF" : "Image") : infoBloc((b as BlocFixe).k).nom;
          const demiOk = peutDemi(b);
          return (
            <li
              key={cle(b)}
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
                setTire(null);
                setCible(null);
                setPrise(null);
              }}
              onDragEnd={() => {
                setTire(null);
                setCible(null);
                setPrise(null);
              }}
              className={
                "flex min-w-0 flex-col gap-2 rounded-[14px] border bg-[var(--surface)] p-2 transition-[opacity,box-shadow] " +
                (b.w === "plein" ? "col-span-2 " : "") +
                (tire === i ? "opacity-40 " : "") +
                (cible === i && tire !== i ? "border-white shadow-[0_0_0_1px_var(--ink)]" : "border-line-2")
              }
            >
              <div className="flex min-w-0 items-center gap-1">
                <span
                  className="grid h-7 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-[8px] text-muted hover:text-white active:cursor-grabbing"
                  onPointerDown={() => setPrise(cle(b))}
                  onPointerUp={() => setPrise(null)}
                  title="Glisser pour déplacer"
                  aria-hidden
                >
                  <GripVertical size={15} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{nom}</span>
              </div>

              {!media &&
                (() => {
                  const Ic = ICONES[(b as BlocFixe).k];
                  return (
                    <div aria-hidden className="grid h-[52px] place-items-center rounded-[9px] bg-[var(--well)] text-muted">
                      <Ic size={20} strokeWidth={1.6} />
                    </div>
                  );
                })()}

              {media && (
                <>
                  <div className="overflow-hidden rounded-[9px] bg-[var(--well)]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- vignette du média envoyé */}
                    <img src={media.url} alt="" className="block h-[72px] w-full object-cover" />
                  </div>
                  <label className="sr-only" htmlFor={`leg-${media.id}`}>
                    Légende
                  </label>
                  <input
                    id={`leg-${media.id}`}
                    className="input !h-8 !rounded-[9px] !px-2 !text-[12.5px]"
                    maxLength={LEGENDE_MAX}
                    placeholder="Légende (facultatif)"
                    value={media.legende ?? ""}
                    onChange={(e) => changer(i, { ...media, legende: e.target.value || null })}
                  />
                </>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-1">
                <button type="button" className="btn btn-ghost btn-sm !h-7 !w-7 !p-0" disabled={i === 0} onClick={() => deplacer(i, i - 1)} aria-label={`Monter : ${nom}`} title="Monter">
                  <ArrowUp size={14} aria-hidden />
                </button>
                <button type="button" className="btn btn-ghost btn-sm !h-7 !w-7 !p-0" disabled={i === disposition.length - 1} onClick={() => deplacer(i, i + 1)} aria-label={`Descendre : ${nom}`} title="Descendre">
                  <ArrowDown size={14} aria-hidden />
                </button>
                {demiOk && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm !h-7 !w-7 !p-0"
                    onClick={() => changer(i, { ...b, w: b.w === "plein" ? "demi" : "plein" })}
                    aria-label={b.w === "plein" ? `Demi-largeur : ${nom}` : `Toute la ligne : ${nom}`}
                    title={b.w === "plein" ? "Demi-largeur" : "Toute la ligne"}
                  >
                    {b.w === "plein" ? <Columns2 size={14} aria-hidden /> : <RectangleHorizontal size={14} aria-hidden />}
                  </button>
                )}
                <span className="flex-1" />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm !h-7 !w-7 !p-0"
                  onClick={() => retirer(i)}
                  aria-label={media ? `Retirer : ${nom}` : `Masquer : ${nom}`}
                  title={media ? "Retirer" : "Masquer"}
                >
                  {media ? <Trash2 size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {masques.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="t-micro mr-1">Masqués :</span>
          {masques.map((b) => (
            <button key={b.k} type="button" className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-2 px-2.5 py-1 text-[12.5px] font-semibold hover:border-white" onClick={() => onChange([...disposition, { k: b.k, w: "plein" }])}>
              <Plus size={12} aria-hidden /> {b.nom}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input ref={fichier} type="file" accept="image/*" className="sr-only" id="rl-media" onChange={(e) => ajouter(e.target.files?.[0])} />
        <input ref={fichierGif} type="file" accept="image/gif" className="sr-only" id="rl-gif" onChange={(e) => ajouter(e.target.files?.[0])} />
        <label htmlFor="rl-media" aria-disabled={plein} className={"btn btn-secondary btn-sm cursor-pointer " + (plein ? "pointer-events-none opacity-50" : "")}>
          <ImagePlus size={15} aria-hidden /> Ajouter une image
        </label>
        <label htmlFor="rl-gif" aria-disabled={plein} className={"btn btn-secondary btn-sm cursor-pointer " + (plein ? "pointer-events-none opacity-50" : "")}>
          <ImagePlay size={15} aria-hidden /> Ajouter un GIF
        </label>
        {envoi && (
          <span role="status" className={"text-[12.5px] font-medium " + (envoi.enCours ? "" : "text-pen")}>
            {envoi.texte}
          </span>
        )}
      </div>
      <p className="t-micro m-0">
        {medias}/{MEDIAS_MAX} médias. Les images trop grandes sont réduites à l&apos;envoi ; les GIF gardent leur animation et font {Mo(MEDIA_MAX_OCTETS)} au plus.
      </p>
    </div>
  );
}
