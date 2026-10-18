"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronRight, CircleCheck, Clapperboard, Feather, Hash, Hexagon, ImageIcon, LayoutPanelTop, LineChart, Radar as IconeRadar, ScrollText, Stamp, Trophy, Users } from "lucide-react";
import { Radar } from "@/components/ui/Radar";
import { Illustration } from "@/components/ui/Illustration";
import { Avatar } from "@/components/classement/Avatar";
import { Icone, type IconeNom } from "@/components/adn/icons";
import { SceauDivision } from "@/components/adn/Sceau";
import { PracticeProgressChart } from "@/components/PracticeProgressChart";
import { SUBJECTS } from "@/components/reviser/catalog";
import { CaseTrophee, ParSource } from "@/components/trophees/SalleDesTrophees";
import { CarteFolio } from "@/components/profil/Folio";
import { JourRelatif } from "@/components/profil/JourRelatif";
import { LienJoueur } from "@/components/profil/CarteJoueur";
import { VideoProfil } from "@/components/profil/VideoProfil";
import { classesProfil as s, styleAccent } from "@/components/profil/Pieces";
import { TOPIC_LABELS } from "@/lib/practiceTopics";
import { BilanComparaison, infobulle, provisoires } from "@/components/profil/RadarComparable";
import { PAS_MESUREE, infobulleMaitrise, libellePct } from "@/lib/maitrise";
import { VITRINE, couleurCss, type ProfilStats, type VitrineKey } from "@/lib/profil/catalogue";
import { defSceau } from "@/lib/profil/sceaux";
import { hrefOnglet } from "@/lib/profil/onglets";
import { TIERS } from "@/lib/ranks";
import { PALIERS_TROPHEE, compter } from "@/lib/trophees";
import { estCarte, estMedia, genreMedia, nomBloc, type BlocCarte, type BlocMedia, type Bloc, type Format, type GenreBloc, type ImageHaut } from "@/lib/profil/disposition";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import type { EvenementJournal } from "@/lib/profil/journal";
import { nombre, pct, signe } from "@/lib/voice";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { JOURNAL, PALIERS, condition, nomSceau } from "@/lib/voice-profil";
import { SAISONS, inscriptionSaison } from "@/lib/voice-saisons";
import b from "./BlocsProfil.module.css";

// Les blocs de la page de profil (onglet Profil, et la même page dans
// Personnaliser), chacun à l'un des 4 formats du site : tuile (4/12), héros
// (8/12), bande (12/12), colonne (4/12 sur deux lignes : le module y prend
// sa forme de tuile, plus haute). Un module ou une carte peut porter une
// image en haut, à fond perdu, qui absorbe la hauteur en trop (comme la
// Bibliothèque de Réviser). Tous suivent la même grammaire : une étiquette
// (pastille de 36 px, titre de 16 px gras, repère à droite), le résumé
// visible, le détail à la demande (<details>), l'action en bas (mt-auto)
// pour que les bas s'alignent dans la rangée. Surface : la tuile est une
// card-quiet, le héros et la bande une card. Les formes propres à un format
// ne jouent que dès 1 024 px (BlocsProfil.module.css) ; en dessous, chaque
// bloc prend sa forme compacte. Les données viennent toutes de DonneesBlocs
// (lues une seule fois par le serveur). `edition` : dans Personnaliser, un
// bloc sans données rend sa coque et son état vide au lieu de rien.

type Ctx = { d: DonneesBlocs; f: Format; edition: boolean };

const PAD: Record<Format, string> = { tuile: "p-5 md:p-6", colonne: "p-5 md:p-6", heros: "p-6 md:p-8", bande: "p-5 md:p-6" };
/** deux lignes au plus */
const DEUX_LIGNES: React.CSSProperties = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" };
const nomCourt = (k: string) => SUBJECTS.find((x) => x.key === k)?.short ?? k;

function Coque({ f, label, children, className = "" }: { f: Format; label: string; children: React.ReactNode; className?: string }) {
  return <section aria-label={label} className={(f === "tuile" ? "card-quiet " : "card ") + "flex min-w-0 flex-col gap-4 " + PAD[f] + " " + className}>{children}</section>;
}

function Etiquette({ icone, titre, droite, f, sur }: { icone: React.ReactNode; titre: string; droite?: React.ReactNode; f: Format; sur?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className={"grid h-9 w-9 shrink-0 place-items-center rounded-[11px] " + (f === "tuile" ? "bg-surface" : "bg-surface-2")}>
        {icone}
      </span>
      <div className="min-w-0 flex-1">
        {sur && <p className="t-micro m-0 truncate">{sur}</p>}
        <h3 className="m-0 truncate text-[16px] font-bold tracking-[-0.01em]">{titre}</h3>
      </div>
      {droite}
    </div>
  );
}

const Repere = ({ children }: { children: React.ReactNode }) => <span className="t-micro shrink-0 font-mono tabular-nums">{children}</span>;

const Lien = ({ children, href }: { children: React.ReactNode; href: string }) => (
  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
    <Link href={href} className="ink-link inline-flex items-center gap-1 text-[14px] font-semibold">
      {children} <ArrowRight size={14} aria-hidden />
    </Link>
  </div>
);

/** Le détail à la demande, avec son chevron (44 px à toucher). */
function Detail({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <details className="group/d">
      <summary className="t-small inline-flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 font-semibold hover:text-white [&::-webkit-details-marker]:hidden">
        <ChevronRight size={15} aria-hidden className="transition-transform group-open/d:rotate-90 motion-reduce:transition-none" /> {libelle}
      </summary>
      <div className="rl-in mt-2">{children}</div>
    </details>
  );
}

/** Dans Personnaliser : un bloc qui n'a encore rien à montrer garde sa coque et le dit. */
function Vide({ bloc, f, icone }: { bloc: Bloc; f: Format; icone: React.ReactNode }) {
  const nom = nomBloc(bloc);
  return (
    <Coque f={f} label={nom}>
      <Etiquette f={f} icone={icone} titre={nom} />
      <p className="t-small m-0">
        <b className="font-semibold">{nom}</b>
        {T.rienAMontrer}
      </p>
    </Coque>
  );
}

// ── Chiffres clés ─────────────────────────────────────────────────────────
/** Une pièce des chiffres clés : son nom, le chiffre, la ligne qui le dit (textes de la vitrine d'avant). */
export function pieceVitrine(k: VitrineKey, st: ProfilStats): { nom: string; grand: string; petit: string } {
  const nom = VITRINE.find((v) => v.key === k)?.nom ?? k;
  switch (k) {
    case "questions":
      return { nom, grand: nombre(st.questions), petit: "questions posées" };
    case "serie":
      return { nom, grand: `${nombre(st.serie)} j`, petit: `série en cours · record ${nombre(st.meilleureSerie)} j` };
    case "duels":
      return { nom, grand: nombre(st.duelsGagnes), petit: `${st.duelsGagnes > 1 ? "victoires" : "victoire"} sur ${nombre(st.duelsJoues)} ${st.duelsJoues > 1 ? "duels" : "duel"}` };
    case "matiere": {
      const best = [...st.matieres].filter((m) => m.pct !== null && m.answered >= 10).sort((a, c) => (c.pct ?? 0) - (a.pct ?? 0))[0];
      const m = best ? SUBJECTS.find((x) => x.key === best.key) : null;
      return {
        nom,
        grand: m ? m.short : "—",
        petit: best ? `${libellePct(best) ?? pct(best.pct ?? 0)} de maîtrise${best.statut === "provisoire" ? " · provisoire" : ""}` : PAS_MESUREE,
      };
    }
    case "defis":
      return { nom, grand: nombre(st.defisRendus), petit: st.defisRendus > 1 ? "défis du jour rendus" : "défi du jour rendu" };
    default:
      return { nom, grand: nombre(st.calculsJustes), petit: "calculs justes" };
  }
}

function Chiffres({ d, f }: Ctx) {
  const keys = d.showcase.length ? d.showcase : (["questions", "serie", "matiere"] as VitrineKey[]);
  const pieces = keys.map((k) => ({ k, ...pieceVitrine(k, d.stats) }));
  if (f !== "tuile")
    // héros et bande : une case par pièce (une à trois) séparées d'un filet, sans étiquette, le chiffre en premier
    return (
      <section aria-label={T.chiffres} className={"card min-w-0 px-1 py-1 " + b.chiffres + " " + b.chiffresCols} style={{ ...styleAccent(d.accent), ["--n" as string]: pieces.length }}>
        {pieces.map((p) => (
          <div key={p.k} className={"flex min-w-0 items-center justify-between gap-4 px-5 py-4 lg:flex-col lg:items-start lg:justify-center lg:px-6 " + b.piece}>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="t-eyebrow">{p.nom}</span>
              <span className="t-micro">{p.petit}</span>
            </div>
            <span className={`t-num shrink-0 text-[26px] leading-none lg:order-first ${f === "heros" ? "lg:text-[44px]" : "lg:text-[36px]"} ${s.accent}`}>{p.grand}</span>
          </div>
        ))}
      </section>
    );
  return (
    <Coque f={f} label={T.chiffres}>
      <Etiquette f={f} icone={<Hash size={17} aria-hidden />} titre={T.chiffres} />
      <div className={b.chiffres} style={styleAccent(d.accent)}>
        {pieces.map((p) => (
          <div key={p.k} className="flex items-center justify-between gap-4 py-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="t-eyebrow">{p.nom}</span>
              <span className="t-micro">{p.petit}</span>
            </div>
            <span className={`t-num shrink-0 text-[26px] leading-none ${s.accent}`}>{p.grand}</span>
          </div>
        ))}
      </div>
    </Coque>
  );
}

// ── Radar des matières ───────────────────────────────────────────────────
/** meProv, toiProv : l'infobulle d'une maîtrise provisoire (la sienne, la mienne), qui s'écrit « ≈ 52 » */
type LigneMatiere = { key: string; nom: string; complet: string; me: number | null; avg: number | null; toi: number | null; meProv: string | null; toiProv: string | null };

/** Une maîtrise, « ≈ » devant si elle est provisoire. */
const maitrise = (v: number, prov: string | null) => `${prov ? "≈" : ""}${v}`;

function Barres({ lignes, n, deuxCol = false, comparer, maCouleur, qui }: { lignes: LigneMatiere[]; n: number; deuxCol?: boolean; comparer: boolean; maCouleur: string; qui: string }) {
  return (
    <ol className={"m-0 flex list-none flex-col gap-2 p-0 " + (deuxCol ? b.barres2 : "")} aria-label={T.ordreMatieres}>
      {lignes.slice(0, n).map((l) => {
        // le détail de la ligne en clair, chaque chiffre dit ce qu'il est (comme l'ancien radar)
        const bulle = infobulle(l, comparer, qui);
        return (
        <li key={l.key} aria-label={bulle.join(". ")} title={bulle.join("\n")} className="grid items-center gap-3 py-0.5" style={{ gridTemplateColumns: "88px minmax(0,1fr) 44px" }}>
          <span className={"truncate text-[13px] " + (l.me === null ? "text-muted" : "font-semibold")}>{l.nom}</span>
          <span className="flex flex-col gap-1">
            <span className="relative block h-2 rounded-full bg-[color-mix(in_oklab,var(--ink)_7%,transparent)]">
              {l.me !== null && <span className={`absolute inset-y-0 left-0 rounded-full ${s.filet}`} style={{ width: `${Math.max(2, l.me)}%` }} />}
              {/* la moyenne des joueurs : un trait sur la barre (effacée le temps de la comparaison) */}
              {!comparer && l.avg !== null && <span aria-hidden className="absolute -top-1 bottom-[-4px] w-[2px] rounded-full bg-[var(--ink-2)] opacity-70" style={{ left: `calc(${l.avg}% - 1px)` }} />}
            </span>
            {comparer && (
              <span className="relative block h-1 rounded-full bg-[color-mix(in_oklab,var(--ink)_5%,transparent)]">
                {l.toi !== null && <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${l.toi}%`, background: maCouleur }} />}
              </span>
            )}
          </span>
          <span className="text-right font-mono text-[12px] font-semibold tabular-nums">{l.me === null ? "—" : maitrise(l.me, l.meProv)}</span>
        </li>
        );
      })}
    </ol>
  );
}

function RadarBloc({ d, f }: Ctx) {
  const [comparer, setComparer] = useState(false);
  const couleur = couleurCss(d.accent);
  // ma couleur, sauf si c'est la même que la sienne : un contraste alors (comme RadarComparable)
  let maCouleur = d.radar.monAccent ? couleurCss(d.radar.monAccent) : "var(--pen)";
  if (maCouleur === couleur) maCouleur = couleur === "var(--ink)" ? "var(--pen)" : "var(--ink)";
  const miennes = d.radar.miennes;
  const peutComparer = !d.moi && !!miennes && miennes.some((m) => m.pct !== null);
  const actif = comparer && peutComparer;

  const sien = new Map(d.stats.matieres.map((m) => [m.key, m]));
  const mien = new Map((miennes ?? []).map((m) => [m.key, m.pct]));
  const qui = d.moi ? T.toi : d.nom;
  const axes = SUBJECTS.map((x) => {
    const m = sien.get(x.key);
    const me = m?.pct ?? null;
    return { label: x.code, nom: x.name, qui, me, avg: d.radar.moyennes[x.key] ?? null, provisoire: m && me !== null && m.statut ? infobulleMaitrise({ statut: m.statut, n: m.answered ?? 0 }) : null };
  });
  const sienProv = provisoires(d.stats.matieres);
  const mienProv = provisoires(miennes ?? []);
  const lignes: LigneMatiere[] = SUBJECTS.map((x) => ({
    key: x.key,
    nom: x.short,
    complet: x.name,
    me: sien.get(x.key)?.pct ?? null,
    avg: d.radar.moyennes[x.key] ?? null,
    toi: mien.get(x.key) ?? null,
    meProv: sienProv.get(x.key) ?? null,
    toiProv: mienProv.get(x.key) ?? null,
  })).sort((a, c) => (c.me ?? -1) - (a.me ?? -1));
  const grand = f !== "tuile";
  const radar = (
    // en héros et en bande, la liste de droite compare déjà à la moyenne : les libellés gardent « ETH 71 +5 », sans « moy »
    <div className={"mx-auto w-full " + (grand ? b.sansMoy : "")} style={{ maxWidth: grand ? 500 : 330 }}>
      <Radar
        axes={axes}
        size={grand ? 300 : 340}
        couleur={couleur}
        comparaison={actif ? { valeurs: SUBJECTS.map((x) => mien.get(x.key) ?? null), couleur: maCouleur, label: T.toi } : null}
        title={T.radarDe(d.nom, d.moi)}
      />
    </div>
  );
  const mesurees = lignes.filter((l) => l.me !== null);
  const sure = mesurees[0];
  const fragile = mesurees[mesurees.length - 1];
  const matieres = d.moi ? T.tesMatieres : T.sesMatieres;
  const sur = actif ? T.enComparaison(d.nom) : T.faceMoyenne;
  // sur le profil d'un autre ; grisé, avec sa raison, tant qu'aucune de mes matières n'est mesurée
  const bouton = !d.moi && (
    <button
      type="button"
      className={"btn btn-sm shrink-0 " + (actif ? "btn-primary" : "btn-secondary")}
      aria-pressed={actif}
      disabled={!peutComparer}
      title={peutComparer ? undefined : T.comparerImpossible}
      onClick={() => setComparer((v) => !v)}
    >
      {actif ? T.arreter : T.comparer}
    </button>
  );
  // le bilan de la comparaison : sous les barres (héros, bande), dans le repli des 10 matières (tuile)
  const bilan = actif && <BilanComparaison lignes={lignes} nom={d.nom} className="t-small m-0" />;
  const dix = (
    <Detail libelle={T.dixMatieres}>
      <Barres lignes={lignes} n={10} comparer={actif} maCouleur={maCouleur} qui={qui} />
      {!grand && bilan}
    </Detail>
  );
  if (!grand)
    return (
      <Coque f={f} label={matieres}>
        <div style={styleAccent(d.accent)} className="contents">
          {/* le surtitre entier ; « Me comparer » passe dessous (il coupait le surtitre au téléphone) */}
          <Etiquette f={f} icone={<IconeRadar size={17} aria-hidden />} titre={matieres} sur={sur} />
          {bouton && <div className="-mt-1">{bouton}</div>}
          {radar}
          {sure && fragile && sure !== fragile && (
            <p className="t-small m-0">
              {T.plusSure} : <b className="font-semibold text-white">{sure.nom}</b> {maitrise(sure.me!, sure.meProv)} % · {T.aReprendreMin} : <b className="font-semibold text-white">{fragile.nom}</b> {maitrise(fragile.me!, fragile.meProv)} %
            </p>
          )}
          <div className="mt-auto">{dix}</div>
        </div>
      </Coque>
    );
  // héros et bande : un surtitre et un titre-réponse en grand ; à droite les 4 plus sûres, les 10 à la demande
  return (
    <Coque f={f} label={matieres}>
      <div style={styleAccent(d.accent)} className="contents">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-col gap-1.5" style={{ flex: "1 1 220px" }}>
            <p className="t-eyebrow m-0">
              {matieres} · {sur}
            </p>
            <h3 className="t-h1 m-0">{sure ? T.enTete(sure.nom) : matieres}</h3>
            {fragile && fragile !== sure && (
              <p className="t-small m-0">
                {T.aReprendre} : <b className="font-semibold text-white">{fragile.nom}</b> {maitrise(fragile.me!, fragile.meProv)} %
              </p>
            )}
          </div>
          {bouton}
        </div>
        <div className={b.deux + " " + (f === "bande" ? b.deuxLarge : b.deuxRadar)} style={{ flex: "1 1 auto" }}>
          {radar}
          <div className="flex min-w-0 flex-col gap-3">
            <p className="t-eyebrow m-0">{d.moi ? T.tesPlusSures : T.sesPlusSures}</p>
            <Barres lignes={lignes} n={4} deuxCol={f === "bande"} comparer={actif} maCouleur={maCouleur} qui={qui} />
            {bilan}
            {dix}
          </div>
        </div>
      </div>
    </Coque>
  );
}

// ── Amis ─────────────────────────────────────────────────────────────────
function Amis({ d, f }: Ctx) {
  const amis = d.amis!;
  const n = { tuile: 6, colonne: 6, heros: 9, bande: 12 }[f];
  const liste = amis.amis.slice(0, n);
  return (
    <Coque f={f} label={T.amis}>
      <Etiquette f={f} icone={<Users size={17} aria-hidden />} titre={T.amis} droite={amis.total > 0 ? <Repere>{nombre(amis.total)}</Repere> : undefined} />
      {liste.length === 0 ? (
        <p className="t-small m-0">{d.moi ? T.sansAmiMoi : T.sansAmi}</p>
      ) : (
        <ul className={"m-0 list-none p-0 " + b.amis + " " + (f === "heros" ? b.amisHeros : f === "bande" ? b.amisBande : "")}>
          {liste.map((a, i) => (
            // téléphone : 6 au plus
            <li key={a.id} className={"min-w-0 " + (i >= 6 ? "max-lg:hidden" : "")}>
              <LienJoueur id={a.id} nom={a.name} className={(f === "tuile" ? "bg-surface " : "card-quiet ") + "rl-lift flex min-w-0 items-center gap-2.5 rounded-[14px] p-2.5"}>
                <Avatar src={a.avatarUrl} name={a.name} size={32} userId={a.id === d.viewerId ? null : a.id} />
                <span className="truncate text-[13.5px] font-semibold">{a.name}</span>
              </LienJoueur>
            </li>
          ))}
        </ul>
      )}
      {/* peu d'amis : la place de la Seigneurie absorbe le reste de la hauteur (pas de trou) */}
      {liste.length < n && (
        <div className="relative flex-1 overflow-hidden rounded-[14px] border border-line max-lg:hidden" style={{ minHeight: 96 }} aria-hidden>
          <div className="absolute inset-0">
            <Illustration nom="joueurs-seigneurie" position="50% 55%" decorative />
          </div>
        </div>
      )}
      {d.moi && <Lien href="/people?view=amis">{T.gererAmis}</Lien>}
    </Coque>
  );
}

// ── Questions répondues ─────────────────────────────────────────────────
function Reponses({ d, f }: Ctx) {
  const r = d.reponses!;
  const max = Math.max(1, ...r.sources.map((x) => x.n));
  const sources = r.sources.slice(0, f === "tuile" ? 3 : 5);
  // sur son propre profil : le détail par matière (Moi › Statistiques)
  const lien = d.moi && r.total > 0;
  return (
    <Coque f={f} label={T.reponses}>
      <Etiquette f={f} icone={<CircleCheck size={17} aria-hidden />} titre={T.reponses} droite={r.total > 0 ? <Repere>{T.justes(r.precision)}</Repere> : undefined} />
      {r.total === 0 ? (
        <p className="t-small m-0">{T.sansReponse}</p>
      ) : (
        <div className={f === "tuile" ? "flex flex-col gap-4" : b.deux} style={styleAccent(d.accent)}>
          <div className="flex flex-col gap-1">
            <span className={`t-num text-[44px] leading-none ${s.accent}`}>{nombre(r.total)}</span>
            <span className="t-small">{T.totalTexte(r.precision)}</span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label={T.parSource}>
            {sources.map((x) => (
              <li key={x.source} className="grid items-center gap-3" style={{ gridTemplateColumns: "112px minmax(0,1fr) 96px" }}>
                <span className="truncate text-[13px] font-semibold">{x.nom}</span>
                <span className="relative block h-2 rounded-full bg-[color-mix(in_oklab,var(--ink)_7%,transparent)]">
                  <span className={`absolute inset-y-0 left-0 rounded-full ${s.filet}`} style={{ width: `${(x.n / max) * 100}%` }} />
                </span>
                {/* le volume, puis la précision de la source (comme AnswerSummary) */}
                <span className="text-right font-mono text-[12px] tabular-nums">
                  {nombre(x.n)}
                  <span className="text-muted"> · {x.pct} %</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.incomplet && <p className={"t-micro m-0" + (lien ? "" : " mt-auto")}>{T.incomplet}</p>}
      {lien && <Lien href="/moi?onglet=stats">{T.detailMatieres}</Lien>}
    </Coque>
  );
}

// ── Trophées ─────────────────────────────────────────────────────────────
function Trophees({ d, f }: Ctx) {
  const t = d.trophees!;
  const { total, parPalier } = compter(t.lignes);
  // du plus haut au plus bas : Diamant, Or, Argent, Bronze
  const paliers = [...PALIERS_TROPHEE].reverse();
  return (
    <Coque f={f} label={T.trophees}>
      <Etiquette f={f} icone={<Trophy size={17} aria-hidden />} titre={T.trophees} droite={total > 0 ? <Repere>{nombre(total)}</Repere> : undefined} />
      {total === 0 ? (
        // les textes de la Salle des trophées
        <p className="t-small m-0">
          {d.moi
            ? t.complet
              ? "Aucun trophée pour l'instant : 5/5 aux 5 du jour, ou une séance d'entraînement ciblé réussie à 70 %, et le premier est à toi."
              : "Aucun trophée pour l'instant : réussis une séance d'entraînement ciblé à 70 % pour gagner le premier."
            : "Aucun trophée pour l'instant."}
        </p>
      ) : (
        <ul className={"m-0 list-none p-0 " + b.quatre + " " + (f !== "tuile" ? b.quatreLigne : "")}>
          {paliers.map(({ palier, nom }) => (
            <li key={palier} className={"card-soft flex min-w-0 items-center gap-3 px-3.5 py-3 " + (parPalier[palier] === 0 ? "opacity-50" : "")}>
              <CaseTrophee palier={palier} gagne={parPalier[palier] > 0} className="h-9 w-9" />
              <span className="flex min-w-0 flex-col">
                <span className="t-num text-[24px] leading-none">{nombre(parPalier[palier])}</span>
                <span className="t-micro truncate">{nom}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto">
        <ParSource lignes={t.lignes} complet={t.complet} className="" />
      </div>
    </Coque>
  );
}

// ── Folio ────────────────────────────────────────────────────────────────
function FolioBloc({ d, f, edition }: Ctx) {
  const fo = d.folio;
  if (!fo)
    return edition ? (
      <Coque f={f} label={T.folio}>
        <Etiquette f={f} icone={<Feather size={17} aria-hidden />} titre={T.folio} />
        <p className="m-0 flex flex-col gap-1">
          <span className="text-[15px] font-semibold">{T.sansFolio}</span>
          <span className="t-small">{T.sansFolioTexte}</span>
        </p>
      </Coque>
    ) : null;
  const [premiere, seconde] = fo.anecdote;
  return (
    <Coque f={f} label={T.folio}>
      <Etiquette f={f} icone={<Feather size={17} aria-hidden />} titre={T.folio} sur={T.planche} />
      <figure className={"m-0 grid items-start gap-4 " + (f === "tuile" ? "" : b.deux)} style={f === "tuile" ? { gridTemplateColumns: "104px minmax(0,1fr)" } : undefined}>
        <span className={"block " + b.folioNuit}>
          <CarteFolio f={fo} className={f === "tuile" ? "" : "mx-auto max-w-[220px]"} />
        </span>
        <figcaption className="flex min-w-0 flex-col gap-1.5">
          <span className="m-0 text-[18px] font-bold leading-snug tracking-[-0.01em]">{fo.nom}</span>
          {fo.nom !== fo.oeuvre && <span className="t-small m-0 italic">{fo.oeuvre}</span>}
          {(f === "tuile" ? [premiere] : [premiere, seconde]).filter(Boolean).map((l) => (
            <span key={l} className="t-small m-0 block">
              {l}
            </span>
          ))}
        </figcaption>
      </figure>
      {f === "tuile" && seconde && <p className="t-small m-0 mt-auto">{seconde}</p>}
    </Coque>
  );
}

// ── Journal (un extrait de l'onglet) ─────────────────────────────────────
function Courbe({ v, accent, h }: { v: number[]; accent: string; h: number }) {
  const min = Math.min(...v) - 10;
  const max = Math.max(...v) + 10;
  const pts = v.map((y, i) => `${((i / (v.length - 1)) * 100).toFixed(2)},${(((max - y) / (max - min)) * h).toFixed(2)}`);
  return (
    <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" className="block w-full" style={{ height: h }} aria-hidden>
      <polyline points={`0,${h} ${pts.join(" ")} 100,${h}`} fill={`color-mix(in oklab, ${accent} 14%, transparent)`} stroke="none" />
      <polyline points={pts.join(" ")} fill="none" stroke={accent} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

const ICONE_EVT: Record<Exclude<EvenementJournal["type"], "sceau">, IconeNom> = { victoire: "duel", palier: "classement", serie: "serie" };

/** Le titre, le détail et l'écart d'une entrée (textes de l'onglet Journal). */
function ditEvenement(e: EvenementJournal, viewerId: string | null): { titre: string; detail: string | null; delta: number | null } {
  if (e.type === "victoire")
    return {
      titre: !e.adversaire ? JOURNAL.victoireSans : e.adversaire.id === viewerId ? JOURNAL.victoireContreToi : `${JOURNAL.victoireContre} ${e.adversaire.nom}`,
      detail: e.score ? JOURNAL.score(e.score[0], e.score[1]) : null,
      delta: e.delta,
    };
  if (e.type === "palier") return { titre: JOURNAL.palier(TIERS[e.palier]?.name ?? ""), detail: JOURNAL.palierTexte, delta: null };
  if (e.type === "sceau") {
    const def = defSceau(e.sceau);
    return { titre: JOURNAL.sceau(def ? `${nomSceau(def)} · ${PALIERS[e.palier]}` : e.sceau), detail: def ? condition(def, def.seuils[e.palier - 1]) : null, delta: null };
  }
  return { titre: JOURNAL.serieNotable(e.jours), detail: JOURNAL.serieTexte(e.jours), delta: null };
}

function JournalBloc({ d, f, edition }: Ctx) {
  const j = d.journal!;
  const accent = couleurCss(d.accent);
  const v = [j.depart, ...j.points];
  const ecart = v[v.length - 1] - j.depart;
  const evenements = j.evenements.slice(0, f === "tuile" ? 3 : 4);
  const calme = j.points.length === 0;
  return (
    <Coque f={f} label={T.journal}>
      <Etiquette f={f} icone={<ScrollText size={17} aria-hidden />} titre={T.journal} droite={calme ? undefined : <Repere>{T.repereJournal(signe(ecart))}</Repere>} />
      {calme && evenements.length === 0 ? (
        <p className="t-small m-0">{JOURNAL.calme}</p>
      ) : (
        <div className={f === "tuile" ? "flex flex-col gap-3" : b.deux}>
          {calme ? <p className="t-small m-0">{JOURNAL.calme}</p> : <Courbe v={v} accent={accent} h={f === "tuile" ? 48 : 96} />}
          {evenements.length > 0 && (
            <ul className="m-0 list-none p-0">
              {evenements.map((e) => {
                const x = ditEvenement(e, d.viewerId);
                return (
                  <li key={e.cle} className="flex items-start gap-3 border-b border-line py-2.5 last:border-b-0">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-2" aria-hidden>
                      {e.type === "sceau" ? <Stamp size={15} /> : <Icone nom={ICONE_EVT[e.type]} size={16} />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-[14px] font-semibold">{x.titre}</span>
                        {x.delta !== null && (
                          <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: x.delta >= 0 ? "var(--gain)" : "var(--perte)" }}>
                            {signe(x.delta)}
                          </span>
                        )}
                      </span>
                      <span className="t-small" style={DEUX_LIGNES}>
                        <JourRelatif jour={e.jour} />
                        {x.detail ? ` · ${x.detail}` : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {edition && <p className="t-micro m-0">{T.visiblePar(d.visibiliteJournal)}</p>}
      <Lien href={hrefOnglet(d.id, "journal")}>{T.toutJournal}</Lien>
    </Coque>
  );
}

// ── Saisons ──────────────────────────────────────────────────────────────
function SaisonsBloc({ d, f }: Ctx) {
  const { courante: c, palmares } = d.saisons!;
  // la tuile garde les 3 dernières gravées ; la bande les met en ligne
  const gravees = palmares.slice(0, f === "tuile" ? 3 : 8);
  return (
    <Coque f={f} label={T.saisons}>
      <Etiquette f={f} icone={<Hexagon size={17} aria-hidden />} titre={T.saisons} droite={palmares.length > 0 ? <Repere>{T.gravees(palmares.length)}</Repere> : undefined} />
      {c && (
        <p className="m-0 flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">{SAISONS.saison(c.numero, c.nom)}</span>
          <span className="t-small">{c.moi ? SAISONS.picEnCours(c.moi.pic, c.moi.eloPic) : SAISONS.sansMatch}</span>
        </p>
      )}
      {gravees.length > 0 && (
        <ul className={"m-0 flex list-none flex-wrap gap-4 p-0 " + (f === "bande" ? "lg:gap-8" : "")}>
          {gravees.map((r, i) => {
            const ins = inscriptionSaison(r.pic, r.numero);
            return (
              <li key={r.cle} className="flex min-w-0 items-center gap-3">
                <span className="block w-[64px] shrink-0">
                  <SceauDivision palier={ins.palier} division={ins.division} sous={ins.sous} ton="pen" taille="remplir" angle={i ? 3 : -4} pose={false} son={false} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13.5px] font-semibold">
                    {SAISONS.court(r.numero)} · {r.nom}
                  </span>
                  <span className="t-micro">
                    {SAISONS.picCourt(r.pic)} · {T.place(r.place, r.joueurs)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Lien href={hrefOnglet(d.id, "sceaux")}>{d.moi ? T.tesSaisons : T.sesSaisons}</Lien>
    </Coque>
  );
}

// ── Médias : l'image absorbe la hauteur ; le GIF reste net dans un passe-partout ; la vidéo remplit ──
const RATIO: Record<Format, string> = { tuile: "4 / 3", colonne: "3 / 4", heros: "2 / 1", bande: "3 / 1" };
const ratios = (tel: string, large: string) => ({ ["--r" as string]: tel, ["--rl" as string]: large }) as React.CSSProperties;

function Legende({ texte, icone }: { texte: string | null; icone: React.ReactNode }) {
  if (!texte) return null;
  return (
    <figcaption className="flex items-center gap-2.5 px-5 py-3.5">
      <span aria-hidden className="shrink-0 text-muted">
        {icone}
      </span>
      <span className="t-small min-w-0 flex-1" style={DEUX_LIGNES}>
        {texte}
      </span>
    </figcaption>
  );
}

/**
 * La couverture d'une vidéo (s) : celle choisie, sinon le milieu au demi
 * près (comme le curseur de l'éditeur), sinon 1 s (vidéos d'avant, sans durée).
 */
export const couvertureDe = (m: { couverture?: number; duree?: number }) => m.couverture ?? (m.duree ? Math.round(m.duree) / 2 : 1);

function MediaBloc({ m, f }: { m: BlocMedia; f: Format }) {
  const g = genreMedia(m);
  if (g === "gif")
    return (
      <figure className="card m-0 flex min-w-0 flex-col overflow-hidden">
        {/* passe-partout : le GIF net, à sa taille réelle (jamais agrandi) ; en fond, le même GIF flouté sous un voile qui suit le thème */}
        <div className="relative grid flex-1 place-items-center overflow-hidden p-6" style={{ minHeight: 220 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.url} alt="" aria-hidden className={b.gifFond} />
          <span aria-hidden className={b.gifVoile} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.url}
            alt={m.legende ?? T.gif}
            width={m.px}
            height={m.px ? Math.round(m.px / m.ratio) : undefined}
            className={"relative block h-auto max-w-full rounded-[10px] border border-line shadow-[var(--shadow-2)] " + b.nuitDoux}
            style={m.px ? { width: m.px } : undefined}
          />
        </div>
        <Legende texte={m.legende} icone={<ImageIcon size={15} />} />
      </figure>
    );
  if (g === "video") {
    const cote = f === "heros" || f === "bande";
    // l'image de couverture : celle qu'on voit avant la lecture (l'adresse enregistrée n'a jamais de « #t= »)
    const src = `${m.url}#t=${couvertureDe(m)}`;
    return (
      <figure className={"card m-0 flex min-w-0 overflow-hidden " + (cote ? "flex-col lg:flex-row" : "flex-col")}>
        <div className={b.absorbe + " bg-black " + b.nuitDoux + " " + (cote ? b.videoCote : "")} style={ratios("4 / 5", "4 / 5")}>
          <VideoProfil url={src} ratio={m.ratio} label={m.legende ?? T.video} />
        </div>
        {cote ? (
          <figcaption className="flex flex-1 flex-col gap-2 p-6">
            <p className="t-eyebrow m-0">{T.videoBoucle}</p>
            {m.legende && <p className="m-0 text-[18px] font-bold leading-snug">{m.legende}</p>}
          </figcaption>
        ) : (
          <Legende texte={m.legende} icone={<Clapperboard size={15} />} />
        )}
      </figure>
    );
  }
  return (
    <figure className="card m-0 flex min-w-0 flex-col overflow-hidden">
      <div className={b.absorbe} style={ratios("4 / 3", RATIO[f])}>
        {/* eslint-disable-next-line @next/next/no-img-element -- image du joueur, préparée à l'envoi */}
        <img src={m.url} alt={m.legende ?? T.image} loading="lazy" decoding="async" className={b.nuitDoux} style={{ objectPosition: `50% ${m.y ?? 50}%` }} />
      </div>
      <Legende texte={m.legende} icone={<ImageIcon size={15} />} />
    </figure>
  );
}

// ── L'image en haut d'un module ou d'une carte ─────────────────────────────
/** son rapport : au téléphone 16:9 ; sur ordinateur, selon le format (la colonne, comme la Bibliothèque : 4:3) */
const RATIO_HAUT: Record<Format, string> = { tuile: "16 / 9", colonne: "4 / 3", heros: "21 / 9", bande: "4 / 1" };

/**
 * Le média en haut : l'image à fond perdu (son cadrage) ; le GIF net à sa
 * taille réelle, dans un passe-partout (le même GIF flouté dessous, comme un
 * bloc GIF) ; la vidéo à fond perdu, en boucle et sans le son tant qu'elle
 * est à l'écran (VideoProfil, sa couverture avant la lecture).
 */
function ImageEnHaut({ img, f }: { img: ImageHaut; f: Format }) {
  const g = genreMedia(img);
  // le cadrage vertical (image et vidéo) : la vidéo le lit dans --y (VideoProfil ne prend pas de style)
  return (
    <div className={b.imageHaut} style={{ ...ratios("16 / 9", RATIO_HAUT[f]), ["--y" as string]: `${img.y ?? 50}%` }}>
      {g === "video" ? (
        <VideoProfil url={`${img.url}#t=${couvertureDe(img)}`} ratio={img.ratio} label={T.video} />
      ) : g === "gif" ? (
        <div className={b.gifHaut}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="" aria-hidden decoding="async" className={b.gifFond} />
          <span aria-hidden className={b.gifVoile} />
          {/* net, entier : à sa taille réelle au plus, réduit (proportions gardées) s'il ne tient pas dans la place ;
              pas de chargement différé : sans taille avant d'être chargé, il ne serait jamais demandé */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt=""
            decoding="async"
            className={"relative block h-auto rounded-[10px] border border-line " + b.nuitDoux}
            // la largeur qui tient dans la place (unités de conteneur : .gifHaut), sans dépasser la taille réelle
            style={{ width: `min(100cqw, ${img.px ? `${img.px}px, ` : ""}calc(100cqh * ${img.ratio}))` }}
          />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- image du joueur, préparée à l'envoi
        <img src={img.url} alt="" loading="lazy" decoding="async" className={b.nuitDoux} style={{ objectPosition: `50% ${img.y ?? 50}%` }} />
      )}
    </div>
  );
}

/** Un module sous son image : une seule carte, l'image à fond perdu en haut, le module dessous (sa propre coque s'efface). */
function AvecImage({ img, f, children }: { img: ImageHaut; f: Format; children: React.ReactNode }) {
  return (
    <div className="card flex min-w-0 flex-col overflow-hidden">
      <ImageEnHaut img={img} f={f} />
      <div className={"flex min-w-0 flex-col " + b.sousImage}>{children}</div>
    </div>
  );
}

// ── La carte : l'image en haut, un titre et quelques lignes du joueur ──────
function CarteBloc({ c, f, edition }: { c: BlocCarte; f: Format; edition: boolean }) {
  const vide = !c.titre && !c.texte && !c.img;
  if (vide && !edition) return null;
  return (
    <section aria-label={c.titre || T.carte} className={(f === "tuile" && !c.img ? "card-quiet " : "card ") + "flex min-w-0 flex-col overflow-hidden"}>
      {c.img && <ImageEnHaut img={c.img} f={f} />}
      <div className={"flex min-w-0 flex-col gap-2 " + PAD[f]}>
        {c.titre && <h3 className={"font-brand m-0 " + b.titreCarte}>{c.titre}</h3>}
        {c.texte && <p className={"t-small m-0 " + b.texteCarte}>{c.texte}</p>}
        {vide && <p className="t-small m-0">{T.carteVide}</p>}
      </div>
    </section>
  );
}

/** L'icône de chaque genre de bloc (barre de l'éditeur, feuille « Choisir un module »), 15 px. */
export const ICONE_BLOC: Record<GenreBloc, React.ReactNode> = {
  vitrine: <Hash size={15} aria-hidden />,
  radar: <IconeRadar size={15} aria-hidden />,
  amis: <Users size={15} aria-hidden />,
  reponses: <CircleCheck size={15} aria-hidden />,
  trophees: <Trophy size={15} aria-hidden />,
  progression: <LineChart size={15} aria-hidden />,
  folio: <Feather size={15} aria-hidden />,
  journal: <ScrollText size={15} aria-hidden />,
  saisons: <Hexagon size={15} aria-hidden />,
  image: <ImageIcon size={15} aria-hidden />,
  gif: <ImageIcon size={15} aria-hidden />,
  video: <Clapperboard size={15} aria-hidden />,
  carte: <LayoutPanelTop size={15} aria-hidden />,
};

/** L'icône de l'étiquette d'un bloc vide (17 px). */
const ICONE_VIDE: Partial<Record<GenreBloc, React.ReactNode>> = {
  amis: <Users size={17} aria-hidden />,
  reponses: <CircleCheck size={17} aria-hidden />,
  trophees: <Trophy size={17} aria-hidden />,
  progression: <LineChart size={17} aria-hidden />,
  journal: <ScrollText size={17} aria-hidden />,
  saisons: <Hexagon size={17} aria-hidden />,
};

/**
 * Un bloc de la page, au format donné. `edition` : dans Personnaliser (état
 * vide ou invitation au lieu de rien). En colonne, un module prend sa forme
 * de tuile ; avec une image en haut, il passe sous elle.
 */
export function BlocProfil({ bloc, f, d, edition = false }: { bloc: Bloc; f: Format; d: DonneesBlocs; edition?: boolean }): React.ReactNode {
  const rendu = rendreBloc(bloc, f, d, edition);
  // les couleurs inversées : les jetons de l'autre thème, posés sur le bloc (.rl-inverse, app/globals.css)
  if (!bloc.inv || !rendu) return rendu;
  return <div className={"rl-inverse " + b.inverse}>{rendu}</div>;
}

/** le bloc lui-même (null : rien à montrer) ; appelé comme une fonction, pour savoir s'il rend quelque chose */
function rendreBloc(bloc: Bloc, f: Format, d: DonneesBlocs, edition: boolean): React.ReactNode {
  if (estMedia(bloc)) return <MediaBloc m={bloc} f={f} />;
  if (estCarte(bloc)) return CarteBloc({ c: bloc, f, edition });
  const contenu = contenuModule(bloc, f === "colonne" ? "tuile" : f, d, edition);
  if (!contenu || !bloc.img || bloc.k === "progression") return contenu;
  return (
    <AvecImage img={bloc.img} f={f}>
      {contenu}
    </AvecImage>
  );
}

/** le contenu d'un module (null : rien à montrer) ; appelé comme une fonction, pour savoir s'il rend quelque chose */
function contenuModule(bloc: Exclude<Bloc, BlocMedia | BlocCarte>, f: Format, d: DonneesBlocs, edition: boolean): React.ReactNode {
  const ctx: Ctx = { d, f, edition };
  const vide = edition ? <Vide bloc={bloc} f={f} icone={ICONE_VIDE[bloc.k]} /> : null;
  switch (bloc.k) {
    case "vitrine":
      return <Chiffres {...ctx} />;
    case "radar":
      return <RadarBloc {...ctx} />;
    case "amis":
      return d.amis ? <Amis {...ctx} /> : vide;
    case "reponses":
      return d.reponses ? <Reponses {...ctx} /> : vide;
    case "trophees":
      return d.trophees ? <Trophees {...ctx} /> : vide;
    case "progression":
      // repris tel quel : sa propre carte, sa courbe, son filtre par matière (une courbe : 2 séances au moins)
      return d.progression && d.progression.length >= 2 ? (
        <div className={"flex min-w-0 flex-col " + b.remplit}>
          <PracticeProgressChart pastSessions={d.progression} topicLabels={TOPIC_LABELS} />
        </div>
      ) : (
        vide
      );
    case "folio":
      return <FolioBloc {...ctx} />;
    case "journal":
      return d.journal ? <JournalBloc {...ctx} /> : vide;
    case "saisons":
      return d.saisons && (d.saisons.courante || d.saisons.palmares.length > 0) ? <SaisonsBloc {...ctx} /> : vide;
    default:
      return null;
  }
}
