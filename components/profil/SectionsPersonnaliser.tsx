"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ImagePlus, Lock, Trash2 } from "lucide-react";
import { MarqueLinkedin } from "@/components/profil/EnteteJoueur";
import { Banniere, CadreSceau, classesProfil as sp } from "@/components/profil/Pieces";
import { SceauDe } from "@/components/profil/FicheSceau";
import { createClient } from "@/lib/supabase/browser";
import { ImageIllisible, preparerImage } from "@/lib/profil/image";
import type { EtatSceau } from "@/lib/profil/sceaux";
import {
  AMBIANCES,
  BIO_MAX,
  CADRES,
  HAUTEURS,
  COULEUR_ENCRE,
  MOTIFS,
  NOM_MAX,
  TEINTES,
  VITRINE,
  VITRINE_MAX,
  cadreDebloque,
  couleurCss,
  dateGagnee,
  motifDebloque,
  type Acquis,
  type Condition,
  type StyleProfil,
  type Visibilite,
  type VitrineKey,
} from "@/lib/profil/catalogue";
import { PERSO, SCEAUX_TXT, avanceePiece, conditionPiece, dateCourte, nomSceau } from "@/lib/voice-profil";

// Les réglages du profil, une section par chose, déplacés de l'ancien
// éditeur (/moi/profil) sans les réécrire : ils remplissent les feuilles de
// Personnaliser (components/profil/Personnaliser.tsx), où la vraie page
// change en direct dessous. La bannière : une image du joueur (envoyée telle
// quelle si elle est raisonnable, sinon réduite à 3 200 px sans perte
// visible ; puis cadrée verticalement) ou un motif. La couleur : libre.
// Les pièces qui bougent ou qui brillent se gagnent : « Gagnés » d'un côté,
// « À gagner » de l'autre, avec ce qu'il faut et l'avancée ; une pièce déjà
// portée reste gagnée (on ne reprend rien). Le serveur revalide tout à
// l'enregistrement.

const VISIBILITES: { key: Visibilite; label: string; aide: string }[] = [
  { key: "public", label: "Public", aide: "Tous les joueurs le voient." },
  { key: "friends", label: "Amis", aide: "Seuls tes amis le voient." },
  { key: "private", label: "Moi seul", aide: "Gardé pour toi." },
];
// une bannière couvre toute la largeur de l'écran, écrans denses compris
const LARGEUR_MAX = 3200;
const HAUTEUR_MAX = 2400;

function Section({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div>
        <h2 className="t-h3 m-0">{titre}</h2>
        {aide && <p className="t-micro m-0 mt-1">{aide}</p>}
      </div>
      {children}
    </section>
  );
}

/** Un contrôle segmenté à indicateur glissant (radio). */
function Seg<T extends string>({ items, value, onChange, label }: { items: { key: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const n = items.length;
  const ix = Math.max(0, items.findIndex((i) => i.key === value));
  return (
    <div role="radiogroup" aria-label={label} className="seg" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + ${ix} * (100% - 8px) / ${n})`, width: `calc((100% - 8px) / ${n})` }} />
      {items.map((i) => (
        <button key={i.key} type="button" role="radio" aria-checked={value === i.key} className="seg-item" onClick={() => onChange(i.key)}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

/** Le style en cours et de quoi le changer. */
export type Brouillon = {
  style: StyleProfil;
  set: <K extends keyof StyleProfil>(k: K, v: StyleProfil[K]) => void;
  setStyle: React.Dispatch<React.SetStateAction<StyleProfil>>;
};

/** Ce qui ouvre les pièces gagnées, et ce que le joueur porte déjà (gardé même si la condition ne tient plus). */
type Gains = { acquis: Acquis; porte: Pick<StyleProfil, "frame" | "banner"> };

/** La légende d'une pièce : gagnée (sa date, si elle bouge), ou à gagner (la condition, l'avancée). */
function LegendePiece({ condition, gagnee, anime, gains }: { condition: Condition | null; gagnee: boolean; anime: boolean; gains: Gains }) {
  if (gagnee) {
    const d = anime ? dateGagnee(condition, gains.acquis) : null;
    return d ? <span className="t-micro text-center leading-tight">{PERSO.gagneLe(dateCourte(d.iso), d.avant)}</span> : null;
  }
  if (!condition) return null;
  const av = avanceePiece(condition, gains.acquis);
  return (
    <span className="t-micro flex flex-col items-center text-center leading-tight">
      <span>{conditionPiece(condition)}</span>
      {av && <span className="font-mono tabular-nums">{av}</span>}
    </span>
  );
}

/** La règle, en une ligne, en tête des feuilles où des pièces se gagnent. */
export function Regle() {
  return <p className="t-small m-0 mb-5 rounded-[12px] border border-dashed border-line-2 px-3 py-2">{PERSO.regle}</p>;
}

export function SectionBanniere({ b, gains, onEnvoi }: { b: Brouillon; gains: Gains; onEnvoi: (enCours: boolean) => void }) {
  const { style, set, setStyle } = b;
  const supabase = useMemo(() => createClient(), []);
  const fichier = useRef<HTMLInputElement | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);

  async function choisirImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setEnvoi("Choisis une image (JPEG, PNG, WebP…).");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setEnvoi("Image trop lourde (30 Mo au plus).");
      return;
    }
    setEnvoi("Envoi de l'image…");
    onEnvoi(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("connexion");
      const { blob, ext, contentType } = await preparerImage(file, { maxLargeur: LARGEUR_MAX, maxHauteur: HAUTEUR_MAX });
      const path = `${auth.user.id}/banniere-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType });
      if (up.error) throw up.error;
      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      setStyle((s) => ({ ...s, bannerUrl: url, bannerPos: 50 }));
      setEnvoi(null);
    } catch (e) {
      setEnvoi(e instanceof ImageIllisible ? "Image illisible : choisis un JPEG, un PNG ou un WebP." : "L'image n'a pas pu être envoyée. Réessaie, ou choisis-en une autre.");
    } finally {
      onEnvoi(false);
      if (fichier.current) fichier.current.value = "";
    }
  }

  const gagnee = (m: (typeof MOTIFS)[number]) => motifDebloque(m, gains.acquis) || m.key === gains.porte.banner;
  const vignette = (m: (typeof MOTIFS)[number]) => {
    const ok = gagnee(m);
    const actif = !style.bannerUrl && style.banner === m.key;
    return (
      <button
        key={m.key}
        type="button"
        role="radio"
        aria-checked={actif}
        disabled={!ok}
        onClick={() => setStyle((s) => ({ ...s, banner: m.key, bannerUrl: null }))}
        className={
          "flex min-w-0 flex-col gap-1.5 rounded-[14px] border p-1.5 text-left " +
          (actif ? "border-white shadow-[0_0_0_1px_var(--ink)]" : ok ? "border-line-2 hover:border-white" : "cursor-not-allowed border-dashed border-line-2")
        }
      >
        <Banniere banner={m.key} accent={style.accent} fige className={"h-[44px] w-full rounded-[9px] " + (ok ? "" : "opacity-50 grayscale")} />
        <span className="flex items-center gap-1 px-0.5 text-[12px] font-semibold">
          {!ok && <Lock size={11} aria-hidden className="shrink-0" />}
          <span className="truncate">{m.nom}</span>
          {actif && <Check size={12} aria-hidden className="shrink-0" />}
        </span>
        {m.condition && <LegendePiece condition={m.condition} gagnee={ok} anime gains={gains} />}
      </button>
    );
  };

  return (
    <Section titre="Bannière" aide="Ton image, sur toute la largeur de ton profil. Ou un motif.">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fichier} type="file" accept="image/*" className="sr-only" id="rl-banniere" onChange={(e) => choisirImage(e.target.files?.[0])} />
        <label htmlFor="rl-banniere" className="btn btn-secondary btn-sm cursor-pointer">
          <ImagePlus size={15} aria-hidden /> {style.bannerUrl ? "Changer d'image" : "Choisir une image"}
        </label>
        {style.bannerUrl && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("bannerUrl", null)}>
            <Trash2 size={14} aria-hidden /> Retirer l&apos;image
          </button>
        )}
        {envoi && (
          <span role="status" className="text-[12.5px] font-medium">
            {envoi}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-semibold">Hauteur</span>
        <div className="min-w-[220px] flex-1">
          <Seg label="Hauteur de la bannière" value={style.bannerH} onChange={(v) => set("bannerH", v)} items={HAUTEURS.map((h) => ({ key: h.key, label: h.nom }))} />
        </div>
      </div>
      {style.bannerUrl && (
        <label className="flex items-center gap-3 text-[13px] font-semibold">
          Cadrage
          <input type="range" min={0} max={100} value={style.bannerPos} onChange={(e) => set("bannerPos", Number(e.target.value))} className="min-w-0 flex-1" style={{ accentColor: "var(--ink)" }} aria-label="Cadrage vertical de l'image" />
        </label>
      )}
      <div role="radiogroup" aria-label="Motif" className={"flex flex-col gap-4 " + (style.bannerUrl ? "opacity-60" : "")}>
        <div className="grid grid-cols-3 gap-2">{MOTIFS.filter((m) => !m.condition).map(vignette)}</div>
        <div className="flex flex-col gap-2">
          <p className="t-eyebrow m-0">{`${PERSO.gagnes} · ${PERSO.aGagner}`}</p>
          <div className="grid grid-cols-2 gap-2">{MOTIFS.filter((m) => m.condition).map(vignette)}</div>
        </div>
      </div>
    </Section>
  );
}

export function SectionAmbiance({ b }: { b: Brouillon }) {
  const { style, set } = b;
  return (
    <Section titre="Ambiance" aide="Le fond de ta page, derrière tes blocs.">
      <div role="radiogroup" aria-label="Ambiance de la page" className="grid grid-cols-3 gap-2">
        {AMBIANCES.map((a) => {
          const actif = style.ambiance === a.key;
          const image = a.key === "banniere" ? style.bannerUrl : null;
          return (
            <button
              key={a.key}
              type="button"
              role="radio"
              aria-checked={actif}
              title={a.aide}
              onClick={() => set("ambiance", a.key)}
              className={"flex min-w-0 flex-col gap-1.5 rounded-[14px] border p-1.5 text-left " + (actif ? "border-white shadow-[0_0_0_1px_var(--ink)]" : "border-line-2 hover:border-white")}
            >
              <span className="relative isolate block h-[44px] overflow-hidden rounded-[9px] bg-[var(--paper)]" style={{ ["--acc" as string]: couleurCss(style.accent) }}>
                {a.key === "teinte" || (a.key === "banniere" && !image) ? <span className={sp.ambianceTeinte} /> : null}
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" className={sp.ambianceImage} style={{ filter: "blur(10px) saturate(1.25)", inset: -20, width: "calc(100% + 40px)", height: "calc(100% + 40px)" }} />
                ) : null}
              </span>
              <span className="flex items-center gap-1 px-0.5 text-[12px] font-semibold">
                <span className="truncate">{a.nom}</span>
                {actif && <Check size={12} aria-hidden className="shrink-0" />}
              </span>
            </button>
          );
        })}
      </div>
      {style.ambiance === "banniere" && !style.bannerUrl && <p className="t-micro m-0">Sans image de bannière, c&apos;est le voile de ta couleur qui s&apos;affiche.</p>}
    </Section>
  );
}

export function SectionCouleur({ b }: { b: Brouillon }) {
  const { style, set } = b;
  const hexCourant = style.accent === COULEUR_ENCRE ? "#111111" : style.accent;
  return (
    <Section titre="Couleur" aide="La couleur de ton profil : la barre de niveau, tes chiffres clés, ton radar, les motifs, l'ambiance.">
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Couleur">
        {TEINTES.map((t) => {
          const actif = style.accent === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={actif}
              title={t.nom}
              onClick={() => set("accent", t.key)}
              className={"grid h-11 w-11 place-items-center rounded-full border " + (actif ? "border-white shadow-[0_0_0_1px_var(--ink)]" : "border-line-2")}
            >
              <span className="block h-7 w-7 rounded-full" style={{ background: couleurCss(t.key) }} />
              <span className="sr-only">{t.nom}</span>
            </button>
          );
        })}
        <label className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line-2 py-1 pl-1.5 pr-3 text-[12.5px] font-semibold" title="Une autre couleur">
          <input type="color" value={hexCourant} onChange={(e) => set("accent", e.target.value.toLowerCase())} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label="Choisir une autre couleur" />
          Autre
        </label>
      </div>
    </Section>
  );
}

/** Le cadre du sceau : un carrousel des cadres gagnés, un autre de ceux à gagner. */
export function SectionCadre({ b, gains, nom, avatarUrl }: { b: Brouillon; gains: Gains; nom: string; avatarUrl: string | null }) {
  const { style, set } = b;
  // le cadre porté, en vue dans son carrousel à l'ouverture
  const carrousel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // après l'ouverture de la feuille (avant, elle n'est pas affichée : rien à mesurer)
    const id = requestAnimationFrame(() => {
      const r = carrousel.current;
      const actif = r?.querySelector<HTMLElement>("[aria-checked=true]");
      if (r && actif) r.scrollLeft = actif.offsetLeft - r.offsetLeft - 20;
    });
    return () => cancelAnimationFrame(id);
  }, []);
  const gagne = (c: (typeof CADRES)[number]) => cadreDebloque(c, gains.acquis) || c.key === gains.porte.frame;
  const vignette = (c: (typeof CADRES)[number]) => {
    const ok = gagne(c);
    const actif = style.frame === c.key;
    return (
      <button
        key={c.key}
        type="button"
        role="radio"
        aria-checked={actif}
        disabled={!ok}
        onClick={() => set("frame", c.key)}
        className={
          "flex w-[104px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-[14px] border px-1.5 pb-2 pt-2.5 " +
          (actif ? "border-white shadow-[0_0_0_1px_var(--ink)]" : ok ? "border-line-2 hover:border-white" : "cursor-not-allowed border-dashed border-line-2")
        }
      >
        <span className={"inline-flex h-[72px] items-center " + (ok ? "" : "opacity-55 grayscale")}>
          <CadreSceau frame={c.key} name={nom} avatarUrl={avatarUrl} size={56} fige />
        </span>
        <span className="flex min-w-0 max-w-full items-center gap-1 text-[12px] font-semibold">
          {!ok && <Lock size={11} aria-hidden className="shrink-0" />}
          <span className="truncate">{c.nom}</span>
        </span>
        {c.anime && ok && <span className="rounded-full border border-line-2 px-1.5 text-[10.5px] font-semibold text-muted">{PERSO.bouge}</span>}
        <LegendePiece condition={c.condition} gagnee={ok} anime={!!c.anime} gains={gains} />
      </button>
    );
  };
  const aGagner = CADRES.filter((c) => !gagne(c));
  return (
    <Section titre="Cadre du sceau" aide="Le métal se gagne aux questions posées ; le liquide et l'aura, au pic de palier ; la dorure, aux sceaux dorés.">
      <div role="radiogroup" aria-label="Cadre du sceau" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="t-eyebrow m-0">{PERSO.gagnes}</p>
          <div ref={carrousel} className="-mx-5 flex snap-x items-start gap-2 overflow-x-auto px-5 pb-1">
            {CADRES.filter(gagne).map(vignette)}
          </div>
        </div>
        {aGagner.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="t-eyebrow m-0">{PERSO.aGagner}</p>
            <div className="-mx-5 flex snap-x items-start gap-2 overflow-x-auto px-5 pb-1">{aGagner.map(vignette)}</div>
          </div>
        )}
      </div>
    </Section>
  );
}

/** Les 3 sceaux posés dans l'en-tête : on touche pour poser ou retirer (3 au plus ; le choix demande la base). */
export function SectionPoses({ gagnes, pins, setPins, base }: { gagnes: EtatSceau[]; pins: string[]; setPins: (p: string[]) => void; base: boolean }) {
  if (!gagnes.length) return <p className="t-small m-0">{SCEAUX_TXT.videMoi}</p>;
  return (
    <Section titre={PERSO.zones.poses} aide={base ? SCEAUX_TXT.poserAide : PERSO.posesSansBase}>
      {base && <p className="m-0 font-mono text-[13px] font-semibold tabular-nums">{PERSO.posesNb(pins.length)}</p>}
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={PERSO.zones.poses}>
        {gagnes.map((e) => {
          const i = pins.indexOf(e.def.cle);
          const on = i >= 0;
          const plein = !on && pins.length >= 3;
          return (
            <button
              key={e.def.cle}
              type="button"
              aria-pressed={on}
              disabled={!base || plein}
              onClick={() => setPins(on ? pins.filter((c) => c !== e.def.cle) : [...pins, e.def.cle])}
              className={
                "relative flex min-w-0 flex-col items-center gap-1 rounded-[14px] border p-2 " +
                (on ? "border-white shadow-[0_0_0_1px_var(--ink)]" : plein || !base ? "border-line-2 opacity-60" : "border-line-2 hover:border-white")
              }
            >
              {on && <span className="absolute right-1.5 top-1.5 z-[1] grid h-[18px] w-[18px] place-items-center rounded-full bg-white font-mono text-[11px] text-black">{i + 1}</span>}
              <span className="block w-[64px]">
                <SceauDe e={e} taille="remplir" />
              </span>
              <span className="w-full truncate text-center text-[12px] font-semibold">{nomSceau(e.def)}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

export function SectionNom({ nom, setNom, visibilite, setVisibilite }: { nom: string; setNom: (v: string) => void; visibilite: "public" | "friends"; setVisibilite: (v: "public" | "friends") => void }) {
  return (
    <Section titre="Prénom et nom" aide="En italique sous ton pseudo. Facultatif.">
      <div className="flex flex-col gap-3">
        <label htmlFor="rl-nom" className="sr-only">
          Prénom et nom
        </label>
        <input id="rl-nom" className="input" maxLength={NOM_MAX} autoComplete="name" placeholder="Théo Chaumont" value={nom} onChange={(e) => setNom(e.target.value)} />
        <Seg
          label="Qui voit ton prénom et ton nom"
          value={visibilite}
          onChange={setVisibilite}
          items={[
            { key: "public", label: "Tout le monde" },
            { key: "friends", label: "Mes amis" },
          ]}
        />
      </div>
    </Section>
  );
}

export function SectionVitrine({ b }: { b: Brouillon }) {
  const { style, set } = b;
  const basculerVitrine = (k: VitrineKey) => {
    const on = style.showcase.includes(k);
    if (on) set("showcase", style.showcase.filter((x) => x !== k));
    else if (style.showcase.length < VITRINE_MAX) set("showcase", [...style.showcase, k]);
  };
  return (
    <Section titre="Chiffres clés" aide={`Les cartes sous ton en-tête : jusqu'à ${VITRINE_MAX}, dans l'ordre où tu les choisis.`}>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Chiffres clés">
        {VITRINE.map((v) => {
          const i = style.showcase.indexOf(v.key);
          const on = i >= 0;
          const plein = !on && style.showcase.length >= VITRINE_MAX;
          return (
            <button
              key={v.key}
              type="button"
              aria-pressed={on}
              disabled={plein}
              onClick={() => basculerVitrine(v.key)}
              className={"inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] " + (on ? "border-white font-semibold" : plein ? "border-line-2 text-muted opacity-50" : "border-line-2 hover:border-white")}
            >
              {on && <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-white font-mono text-[11px] text-black">{i + 1}</span>}
              {v.nom}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

export function SectionBio({ b }: { b: Brouillon }) {
  const { style, set } = b;
  return (
    <Section titre="Bio">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rl-bio" className="sr-only">
          Bio
        </label>
        <textarea
          id="rl-bio"
          className="input min-h-[84px] resize-y"
          maxLength={BIO_MAX}
          placeholder="CFA Level I en mai · FSA est ma matière · cherche un rival en Fixed Income."
          value={style.bio ?? ""}
          onChange={(e) => set("bio", e.target.value)}
        />
        <span className="t-micro self-end font-mono tabular-nums">
          {(style.bio ?? "").length}/{BIO_MAX}
        </span>
      </div>
    </Section>
  );
}

export function SectionLinkedin({
  linkedin,
  setLinkedin,
  lienOk,
  visibilite,
  setVisibilite,
}: {
  linkedin: string;
  setLinkedin: (v: string) => void;
  lienOk: boolean;
  visibilite: Visibilite;
  setVisibilite: (v: Visibilite) => void;
}) {
  return (
    <Section titre="LinkedIn" aide="Un bouton LinkedIn sur ton profil, pour qui tu veux.">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <MarqueLinkedin size={22} />
          <label htmlFor="rl-linkedin" className="sr-only">
            Adresse de ton profil LinkedIn
          </label>
          <input id="rl-linkedin" className="input min-w-0 flex-1" inputMode="url" autoComplete="url" placeholder="linkedin.com/in/ton-profil" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
        </div>
        {!lienOk && <p className="t-small m-0 font-semibold text-pen">Colle le lien de ton profil : linkedin.com/in/…</p>}
        <Seg label="Qui voit ton LinkedIn" value={visibilite} onChange={setVisibilite} items={VISIBILITES} />
        <p className="t-micro m-0">{VISIBILITES.find((v) => v.key === visibilite)?.aide}</p>
      </div>
    </Section>
  );
}
