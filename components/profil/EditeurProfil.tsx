"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, ImagePlus, Lock, Trash2 } from "lucide-react";
import { EnteteJoueur, MarqueLinkedin, type EnteteData } from "@/components/profil/EnteteJoueur";
import { ListeAmis, Vitrine } from "@/components/profil/Vitrine";
import { RadarComparable } from "@/components/profil/RadarComparable";
import type { AmiLite } from "@/lib/profil/donnees";
import type { CleBloc } from "@/lib/profil/disposition";
import { EditeurDisposition } from "@/components/profil/EditeurDisposition";
import { Banniere, CadreSceau } from "@/components/profil/Pieces";
import { enregistrerProfil } from "@/app/moi/profil/actions";
import { createClient } from "@/lib/supabase/browser";
import { ImageIllisible, preparerImage } from "@/lib/profil/image";
import { rankFor } from "@/lib/ranks";
import {
  BIO_MAX,
  CADRES,
  COULEUR_ENCRE,
  MOTIFS,
  NOM_MAX,
  TEINTES,
  VITRINE,
  VITRINE_MAX,
  cadreDebloque,
  cadreProgres,
  couleurCss,
  linkedinLisible,
  nettoyerNom,
  normaliserLinkedin,
  type NomProfil,
  type ProfilStats,
  type StyleProfil,
  type Visibilite,
  type VitrineKey,
} from "@/lib/profil/catalogue";

// L'éditeur du profil (/moi/profil) : l'aperçu en direct, puis les choix.
// La bannière : une image du joueur (envoyée telle quelle si elle est
// raisonnable, sinon réduite à 3 200 px sans perte visible ; puis cadrée
// verticalement) ou un motif. La couleur : libre. Les
// cadres du sceau se gagnent aux questions posées (le compte est affiché).
// À gauche, l'aperçu est la page elle-même, éditable sur place : l'en-tête,
// puis les vrais blocs (chiffres clés, radar, amis, réponses, trophées,
// progression, images et GIF), qu'on range, élargit, masque ou ajoute
// directement (EditeurDisposition). À droite, les réglages, qui restent à
// portée pendant qu'on fait défiler l'aperçu ; une barre « Enregistrer »
// apparaît dès qu'il y a une modification. Le serveur revalide tout à
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

export function EditeurProfil({
  carte,
  stats,
  initial,
  linkedin: linkedinInitial,
  visibilite: visibiliteInitiale,
  nom: nomInitial,
  disponible,
  moyennes,
  amis,
  rendus: rendusServeur,
  banqueGifs = false,
}: {
  carte: EnteteData;
  stats: ProfilStats;
  initial: StyleProfil;
  linkedin: string | null;
  visibilite: Visibilite;
  nom: NomProfil;
  disponible: boolean;
  /** moyenne des joueurs par matière (le radar) */
  moyennes: Record<string, number | null>;
  amis: { amis: AmiLite[]; total: number } | null;
  /** les blocs rendus par le serveur (réponses, trophées, progression) */
  rendus: Partial<Record<CleBloc, React.ReactNode>>;
  /** la banque de GIF est branchée */
  banqueGifs?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fichier = useRef<HTMLInputElement | null>(null);
  const [style, setStyle] = useState<StyleProfil>(initial);
  const [linkedin, setLinkedin] = useState(linkedinLisible(linkedinInitial));
  const [visibilite, setVisibilite] = useState<Visibilite>(visibiliteInitiale);
  const [nom, setNom] = useState(nomInitial.nom ?? "");
  const [nomVisibilite, setNomVisibilite] = useState<"public" | "friends">(nomInitial.visibilite);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [envoiMedia, setEnvoiMedia] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);
  const [pending, start] = useTransition();
  // modifié depuis le dernier enregistrement ?
  const etat = JSON.stringify({ style, linkedin, visibilite, nom, nomVisibilite });
  const [reference, setReference] = useState(etat);
  const modifie = etat !== reference;

  const set = <K extends keyof StyleProfil>(k: K, v: StyleProfil[K]) => {
    setStyle((s) => ({ ...s, [k]: v }));
    setMsg(null);
  };
  const lienOk = !linkedin.trim() || !!normaliserLinkedin(linkedin);
  const apercu: EnteteData = useMemo(
    () => ({ ...carte, style, nomComplet: nettoyerNom(nom), linkedin: lienOk && linkedin.trim() ? normaliserLinkedin(linkedin) : null }),
    [carte, style, nom, linkedin, lienOk],
  );

  async function choisirImage(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    if (!file.type.startsWith("image/")) {
      setEnvoi("Choisis une image (JPEG, PNG, WebP…).");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setEnvoi("Image trop lourde (30 Mo au plus).");
      return;
    }
    setEnvoi("Envoi de l'image…");
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
      if (fichier.current) fichier.current.value = "";
    }
  }

  const basculerVitrine = (k: VitrineKey) => {
    const on = style.showcase.includes(k);
    if (on) set("showcase", style.showcase.filter((x) => x !== k));
    else if (style.showcase.length < VITRINE_MAX) set("showcase", [...style.showcase, k]);
  };

  const enregistrer = () =>
    start(async () => {
      setMsg(null);
      const r = await enregistrerProfil({ style, linkedin, visibilite, nom, nomVisibilite });
      if (!r.ok) {
        setMsg({ ok: false, texte: r.erreur });
        return;
      }
      setStyle(r.style);
      setReference(JSON.stringify({ style: r.style, linkedin, visibilite, nom, nomVisibilite }));
      setMsg({ ok: true, texte: r.refus.length ? `Enregistré, sauf ${r.refus.join(", ")}.` : "Enregistré. Ton profil est à jour." });
      router.refresh();
    });

  const rk = rankFor(carte.elo, carte.mastery, carte.place);
  const rang = { tierIndex: rk.tierIndex, division: rk.division, elo: carte.elo, mastery: carte.mastery };
  const hexCourant = style.accent === COULEUR_ENCRE ? "#111111" : style.accent;
  const bloque = pending || !lienOk || envoiMedia || !!(envoi && envoi.endsWith("…"));

  // les blocs de la page, avec les réglages en cours (couleur, chiffres clés)
  const rendus: Partial<Record<CleBloc, React.ReactNode>> = {
    vitrine: <Vitrine style={style} stats={stats} rang={rang} />,
    radar: <RadarComparable matieres={stats.matieres} moyennes={moyennes} accent={style.accent} nom={carte.name} moi />,
    amis: amis ? <ListeAmis amis={amis.amis} total={amis.total} moi /> : null,
    ...rendusServeur,
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
      {/* l'aperçu : ta page, éditable sur place */}
      <div className="flex min-w-0 flex-col gap-5 lg:col-span-7">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <p className="t-eyebrow m-0">Ta page</p>
            <p className="t-small m-0 mt-1">Range tes blocs ici même : glisse-les par leur nom (ou avec les flèches), mets-en deux côte à côte, masque ceux que tu ne veux pas.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/people/${carte.id}?vue=inconnu`} className="btn btn-secondary btn-sm">
              <Eye size={14} aria-hidden /> Voir comme les autres
            </Link>
            <Link href={`/people/${carte.id}`} className="btn btn-ghost btn-sm">
              Mon profil
            </Link>
          </div>
        </div>
        <EnteteJoueur d={apercu} apercu />
        <div className="pt-6">
          <EditeurDisposition disposition={style.disposition} onChange={(d) => set("disposition", d)} rendus={rendus} supabase={supabase} onEnvoi={setEnvoiMedia} banqueGifs={banqueGifs} />
        </div>
      </div>

      {/* les réglages : à portée pendant qu'on fait défiler l'aperçu */}
      <div className="card flex min-w-0 flex-col gap-6 p-5 sm:p-7 lg:sticky lg:top-[88px] lg:col-span-5 lg:max-h-[calc(100dvh-104px)] lg:overflow-y-auto lg:pb-0">
        {!disponible && (
          <p className="t-small m-0 rounded-[12px] border border-dashed border-line-2 p-3">
            La personnalisation s&apos;enregistrera dès que la base sera prête. Tu peux déjà composer ton profil.
          </p>
        )}

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
          {style.bannerUrl && (
            <label className="flex items-center gap-3 text-[13px] font-semibold">
              Cadrage
              <input type="range" min={0} max={100} value={style.bannerPos} onChange={(e) => set("bannerPos", Number(e.target.value))} className="min-w-0 flex-1" style={{ accentColor: "var(--ink)" }} aria-label="Cadrage vertical de l'image" />
            </label>
          )}
          <div role="radiogroup" aria-label="Motif" className={"grid grid-cols-3 gap-2 " + (style.bannerUrl ? "opacity-60" : "")}>
            {MOTIFS.map((m) => {
              const actif = !style.bannerUrl && style.banner === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  onClick={() => setStyle((s) => ({ ...s, banner: m.key, bannerUrl: null }))}
                  className={"flex min-w-0 flex-col gap-1.5 rounded-[14px] border p-1.5 text-left " + (actif ? "border-white shadow-[0_0_0_1px_var(--ink)]" : "border-line-2 hover:border-white")}
                >
                  <Banniere banner={m.key} accent={style.accent} className="h-[44px] w-full rounded-[9px]" />
                  <span className="flex items-center gap-1 px-0.5 text-[12px] font-semibold">
                    <span className="truncate">{m.nom}</span>
                    {actif && <Check size={12} aria-hidden className="shrink-0" />}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section titre="Couleur" aide="La couleur de ton profil : la barre de niveau, ta vitrine, ton radar, les motifs.">
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
                  className={"grid h-9 w-9 place-items-center rounded-full border " + (actif ? "border-white shadow-[0_0_0_1px_var(--ink)]" : "border-line-2")}
                >
                  <span className="block h-6 w-6 rounded-full" style={{ background: couleurCss(t.key) }} />
                  <span className="sr-only">{t.nom}</span>
                </button>
              );
            })}
            <label className="inline-flex items-center gap-2 rounded-full border border-line-2 py-1 pl-1 pr-3 text-[12.5px] font-semibold" title="Une autre couleur">
              <input type="color" value={hexCourant} onChange={(e) => set("accent", e.target.value.toLowerCase())} className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" aria-label="Choisir une autre couleur" />
              Autre
            </label>
          </div>
        </Section>

        <Section titre="Cadre du sceau" aide="Il se gagne aux questions posées, toutes sources confondues.">
          <div role="radiogroup" aria-label="Cadre du sceau" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {CADRES.map((c) => {
              const ok = cadreDebloque(c, stats);
              const actif = style.frame === c.key;
              const prog = cadreProgres(c, stats);
              return (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  disabled={!ok}
                  onClick={() => set("frame", c.key)}
                  title={ok ? c.nom : `${c.nom} · ${c.seuil} questions`}
                  className={
                    "flex min-w-0 flex-col items-center gap-1.5 rounded-[14px] border p-1.5 " +
                    (actif ? "border-white shadow-[0_0_0_1px_var(--ink)]" : ok ? "border-line-2 hover:border-white" : "cursor-not-allowed border-dashed border-line-2 opacity-60")
                  }
                >
                  <span className="mt-1 inline-flex">
                    <CadreSceau frame={c.key} name={carte.name} avatarUrl={carte.avatarUrl} size={34} />
                  </span>
                  <span className="flex min-w-0 items-center gap-1 text-[12px] font-semibold">
                    {!ok && <Lock size={11} aria-hidden className="shrink-0" />}
                    <span className="truncate">{c.nom}</span>
                  </span>
                  {prog && <span className="font-mono text-[10.5px] tabular-nums text-muted">{prog}</span>}
                </button>
              );
            })}
          </div>
        </Section>

        <Section titre="Prénom et nom" aide="En italique sous ton pseudo. Facultatif.">
          <div className="flex flex-col gap-3">
            <label htmlFor="rl-nom" className="sr-only">
              Prénom et nom
            </label>
            <input id="rl-nom" className="input" maxLength={NOM_MAX} autoComplete="name" placeholder="Théo Chaumont" value={nom} onChange={(e) => setNom(e.target.value)} />
            <Seg
              label="Qui voit ton prénom et ton nom"
              value={nomVisibilite}
              onChange={setNomVisibilite}
              items={[
                { key: "public", label: "Tout le monde" },
                { key: "friends", label: "Mes amis" },
              ]}
            />
          </div>
        </Section>

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
                  className={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] " + (on ? "border-white font-semibold" : plein ? "border-line-2 text-muted opacity-50" : "border-line-2 hover:border-white")}
                >
                  {on && <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-white font-mono text-[11px] text-black">{i + 1}</span>}
                  {v.nom}
                </button>
              );
            })}
          </div>
        </Section>

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

        <Section titre="LinkedIn" aide="Un bouton LinkedIn sur ton profil, pour qui tu veux.">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <MarqueLinkedin size={22} />
              <label htmlFor="rl-linkedin" className="sr-only">
                Adresse de ton profil LinkedIn
              </label>
              <input
                id="rl-linkedin"
                className="input min-w-0 flex-1"
                inputMode="url"
                autoComplete="url"
                placeholder="linkedin.com/in/ton-profil"
                value={linkedin}
                onChange={(e) => {
                  setLinkedin(e.target.value);
                  setMsg(null);
                }}
              />
            </div>
            {!lienOk && <p className="t-small m-0 font-semibold text-pen">Colle le lien de ton profil : linkedin.com/in/…</p>}
            <Seg label="Qui voit ton LinkedIn" value={visibilite} onChange={setVisibilite} items={VISIBILITES} />
            <p className="t-micro m-0">{VISIBILITES.find((v) => v.key === visibilite)?.aide}</p>
          </div>
        </Section>

        {/* collé en bas de la carte sur grand écran */}
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5 lg:sticky lg:bottom-0 lg:-mx-7 lg:mt-auto lg:bg-[var(--surface)] lg:px-7 lg:pb-6">
          <button type="button" className="btn btn-primary btn-lg rl-press" onClick={enregistrer} disabled={bloque}>
            {pending ? "…" : "Enregistrer"}
          </button>
          {msg ? (
            <span role="status" className={"text-[13px] font-medium " + (msg.ok ? "" : "text-pen")}>
              {msg.texte}
            </span>
          ) : (
            modifie && <span className="t-small">Modifications pas encore enregistrées.</span>
          )}
        </div>
      </div>

      {/* téléphone et tablette : une barre flottante dès qu'il y a une modification */}
      {modifie && (
        <div className="fixed inset-x-3 z-40 flex items-center justify-between gap-3 rounded-[18px] border border-line-2 bg-[var(--surface)] py-2 pl-4 pr-2 shadow-[var(--shadow-3)] md:inset-x-auto md:right-6 md:w-[380px] lg:hidden bottom-[calc(90px+env(safe-area-inset-bottom,0px))] md:bottom-6">
          <span className="text-[13px] font-semibold">Modifications non enregistrées</span>
          <button type="button" className="btn btn-primary btn-sm rl-press" onClick={enregistrer} disabled={bloque}>
            {pending ? "…" : "Enregistrer"}
          </button>
        </div>
      )}
    </div>
  );
}
