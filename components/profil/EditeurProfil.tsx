"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, Lock } from "lucide-react";
import { CarteJoueur, MarqueLinkedin, type CarteData } from "@/components/profil/CarteJoueur";
import { Vitrine } from "@/components/profil/Vitrine";
import { Banniere, CadreSceau, TitrePlume } from "@/components/profil/Pieces";
import { enregistrerProfil } from "@/app/moi/profil/actions";
import {
  BANNIERES,
  BIO_MAX,
  CADRES,
  COULEURS,
  TITRES,
  VITRINE,
  VITRINE_MAX,
  normaliserLinkedin,
  progresTexte,
  type Piece,
  type ProfilStats,
  type StyleProfil,
  type Visibilite,
  type VitrineKey,
} from "@/lib/profil/catalogue";

// L'éditeur du profil (/moi/profil) : l'aperçu de la carte de joueur en
// direct, puis les choix. Les pièces pas encore gagnées restent visibles,
// au crayon, avec ce qu'il faut faire (et le compte : « 632/1 000 ») ; le
// serveur revalide tout à l'enregistrement.

const VISIBILITES: { key: Visibilite; label: string; aide: string }[] = [
  { key: "public", label: "Public", aide: "Tous les joueurs le voient." },
  { key: "friends", label: "Amis", aide: "Seuls tes amis le voient." },
  { key: "private", label: "Moi seul", aide: "Gardé pour toi." },
];

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

/** Une case de choix : l'aperçu, le nom, et le cadenas avec la condition si la pièce n'est pas gagnée. */
function Case({ piece, stats, actif, onPick, children, large = false }: { piece: Piece; stats: ProfilStats; actif: boolean; onPick: () => void; children: React.ReactNode; large?: boolean }) {
  const ok = piece.debloque(stats);
  const prog = progresTexte(piece, stats);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={actif}
      disabled={!ok}
      onClick={onPick}
      title={ok ? piece.nom : `${piece.nom} · ${piece.condition}`}
      className={
        "group relative flex min-w-0 flex-col items-stretch gap-1.5 rounded-[14px] border p-1.5 text-left transition " +
        (large ? "" : "items-center ") +
        (actif ? "border-white shadow-[0_0_0_1px_var(--ink)]" : ok ? "border-line-2 hover:border-white" : "cursor-not-allowed border-dashed border-line-2 opacity-60")
      }
    >
      {children}
      <span className={"flex min-w-0 items-center gap-1 px-0.5 text-[12px] font-semibold " + (large ? "" : "justify-center")}>
        {!ok && <Lock size={11} aria-hidden className="shrink-0" />}
        <span className="truncate">{piece.nom}</span>
        {actif && <Check size={12} aria-hidden className="shrink-0" />}
      </span>
      {!ok && <span className={"px-0.5 text-[10.5px] leading-tight text-muted " + (large ? "" : "text-center")}>{prog ?? piece.condition}</span>}
    </button>
  );
}

export function EditeurProfil({
  carte,
  stats,
  initial,
  linkedin: linkedinInitial,
  visibilite: visibiliteInitiale,
  disponible,
}: {
  carte: CarteData;
  stats: ProfilStats;
  initial: StyleProfil;
  linkedin: string | null;
  visibilite: Visibilite;
  disponible: boolean;
}) {
  const router = useRouter();
  const [style, setStyle] = useState<StyleProfil>(initial);
  const [linkedin, setLinkedin] = useState(linkedinInitial ?? "");
  const [visibilite, setVisibilite] = useState<Visibilite>(visibiliteInitiale);
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof StyleProfil>(k: K, v: StyleProfil[K]) => {
    setStyle((s) => ({ ...s, [k]: v }));
    setMsg(null);
  };
  const lienOk = !linkedin.trim() || !!normaliserLinkedin(linkedin);
  const apercu: CarteData = useMemo(
    () => ({ ...carte, style, linkedin: lienOk && linkedin.trim() ? normaliserLinkedin(linkedin) : null }),
    [carte, style, linkedin, lienOk],
  );

  const basculerVitrine = (k: VitrineKey) => {
    const on = style.showcase.includes(k);
    if (on) set("showcase", style.showcase.filter((x) => x !== k));
    else if (style.showcase.length < VITRINE_MAX) set("showcase", [...style.showcase, k]);
  };

  const enregistrer = () =>
    start(async () => {
      setMsg(null);
      const r = await enregistrerProfil({ style, linkedin, visibilite });
      if (!r.ok) {
        setMsg({ ok: false, texte: r.erreur });
        return;
      }
      setStyle(r.style);
      setMsg({ ok: true, texte: r.refus.length ? `Enregistré, sauf ${r.refus.join(", ")} (pas encore gagné).` : "Enregistré. Ta carte est à jour." });
      router.refresh();
    });

  const rang = { tierIndex: carte.tierIndex, division: carte.division, elo: carte.elo, mastery: carte.mastery };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
      {/* l'aperçu, tel que les autres le verront */}
      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[88px] lg:col-span-7">
        <p className="t-eyebrow m-0">Aperçu</p>
        <CarteJoueur d={apercu} />
        <Vitrine style={style} stats={stats} rang={rang} />
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/people/${carte.id}?vue=inconnu`} className="btn btn-secondary btn-sm">
            <Eye size={14} aria-hidden /> Voir comme les autres
          </Link>
          <Link href={`/people/${carte.id}`} className="btn btn-ghost btn-sm">
            Mon profil
          </Link>
        </div>
      </div>

      {/* les choix */}
      <div className="card flex min-w-0 flex-col gap-6 p-5 sm:p-7 lg:col-span-5">
        {!disponible && (
          <p className="t-small m-0 rounded-[12px] border border-dashed border-line-2 p-3">
            La personnalisation s&apos;enregistrera dès que la base sera prête. Tu peux déjà composer ta carte.
          </p>
        )}

        <Section titre="Bannière" aide="Les plus rares se gagnent : questions posées, série, rang atteint.">
          <div role="radiogroup" aria-label="Bannière" className="grid grid-cols-3 gap-2">
            {BANNIERES.map((b) => (
              <Case key={b.key} piece={b} stats={stats} actif={style.banner === b.key} onPick={() => set("banner", b.key)} large>
                <Banniere banner={b.key} accent={style.accent} className="h-[46px] w-full rounded-[9px]" />
              </Case>
            ))}
          </div>
        </Section>

        <Section titre="Couleur" aide="Elle teinte la bannière, ton titre et ta vitrine. Les métaux suivent ton meilleur rang.">
          <div role="radiogroup" aria-label="Couleur" className="grid grid-cols-5 gap-2">
            {COULEURS.map((c) => (
              <Case key={c.key} piece={c} stats={stats} actif={style.accent === c.key} onPick={() => set("accent", c.key)}>
                <span className="mx-auto mt-1 block h-7 w-7 rounded-full border border-line-2" style={{ background: c.valeur }} aria-hidden />
              </Case>
            ))}
          </div>
        </Section>

        <Section titre="Cadre du sceau" aide="Un cadre de métal par rang atteint.">
          <div role="radiogroup" aria-label="Cadre du sceau" className="grid grid-cols-5 gap-2">
            {CADRES.map((c) => (
              <Case key={c.key} piece={c} stats={stats} actif={style.frame === c.key} onPick={() => set("frame", c.key)}>
                <span className="mx-auto mt-1 inline-flex">
                  <CadreSceau frame={c.key} name={carte.name} avatarUrl={carte.avatarUrl} size={34} />
                </span>
              </Case>
            ))}
          </div>
        </Section>

        <Section titre="Titre" aide="Sous ton pseudo, à la plume. Chaque exploit en débloque un.">
          <div role="radiogroup" aria-label="Titre" className="flex flex-wrap gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={style.title === null}
              onClick={() => set("title", null)}
              className={"rounded-full border px-3 py-1.5 text-[13px] " + (style.title === null ? "border-white font-semibold" : "border-line-2 text-muted hover:border-white")}
            >
              Sans titre
            </button>
            {TITRES.map((t) => {
              const ok = t.debloque(stats);
              const prog = progresTexte(t, stats);
              const actif = style.title === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  disabled={!ok}
                  onClick={() => set("title", t.key)}
                  title={ok ? t.nom : `${t.nom} · ${t.condition}`}
                  className={
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] " +
                    (actif ? "border-white" : ok ? "border-line-2 hover:border-white" : "cursor-not-allowed border-dashed border-line-2 text-muted")
                  }
                >
                  {!ok && <Lock size={11} aria-hidden />}
                  {ok ? <TitrePlume accent={style.accent} className="text-[17px]">{t.nom}</TitrePlume> : t.nom}
                  {!ok && prog && <span className="font-mono text-[10.5px] tabular-nums">{prog}</span>}
                </button>
              );
            })}
          </div>
        </Section>

        <Section titre="Vitrine" aide={`Jusqu'à ${VITRINE_MAX} pièces, dans l'ordre où tu les choisis.`}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Vitrine">
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

        <Section titre="LinkedIn" aide="Un bouton LinkedIn sur ta carte, pour qui tu veux.">
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
            <div role="radiogroup" aria-label="Qui voit ton LinkedIn" className="seg" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + ${VISIBILITES.findIndex((v) => v.key === visibilite)} * (100% - 8px) / 3)`, width: "calc((100% - 8px) / 3)" }} />
              {VISIBILITES.map((v) => (
                <button key={v.key} type="button" role="radio" aria-checked={visibilite === v.key} className="seg-item" onClick={() => setVisibilite(v.key)}>
                  {v.label}
                </button>
              ))}
            </div>
            <p className="t-micro m-0">{VISIBILITES.find((v) => v.key === visibilite)?.aide}</p>
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <button type="button" className="btn btn-primary btn-lg rl-press" onClick={enregistrer} disabled={pending || !lienOk}>
            {pending ? "…" : "Enregistrer"}
          </button>
          {msg && (
            <span role="status" className={"text-[13px] font-medium " + (msg.ok ? "" : "text-pen")}>
              {msg.texte}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
