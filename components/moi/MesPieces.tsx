"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Banniere, CadreSceau } from "@/components/profil/Pieces";
import { BlocFolio, CarteFolio } from "@/components/profil/Folio";
import { TitrePorte } from "@/components/profil/TitrePorte";
import { EnteteJoueur, type EnteteData } from "@/components/profil/EnteteJoueur";
import { Feuille } from "@/components/ui/Feuille";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { Dossier, Filet } from "@/components/moi/Dossier";
import { porterPiece } from "@/app/moi/profil/actions";
import { STYLE_DEFAUT, type StyleProfil } from "@/lib/profil/catalogue";
import { piecesAnimees, retirable, type Etagere, type PieceEtagere } from "@/lib/profil/etagere-vue";
import type { Rarete, TypePiece } from "@/lib/profil/pieces";
import { DOSSIER, SOUS_MOI } from "@/lib/voice-moi";
import m from "./Moi.module.css";

// Moi › Mes pièces (V3 §3.8) : l'étagère de tout ce qui se porte sur le
// profil, en cinq rayons (cadres, bannières, titres, folios, ornements de
// bannière : leur dessin viendra, d'ici là un cadre simple). Les pièces
// possédées d'abord, qui bougent si elles bougent ; puis les silhouettes
// (grisées, immobiles), avec leur consigne en clair. Pas de lien sur
// l'étagère : une pièce se touche, sa fiche dit le reste. Un filtre « Ce que
// j'ai / Tout » ; le compte de chaque rayon dit ce qui est dessiné.
// Gabarit « Dossier » (direction du 2026-11-13) : la porte porte ce qu'il possède
// sur tout ce qui est dessiné (« 23/64 ») ; dessous, sous un filet, « La plus
// rare » : la pièce la plus rare qu'il possède, en grand (rien de gagné encore :
// la plus rare de l'étagère, en silhouette), la toucher ouvre sa fiche ; puis
// « L'étagère » (le filtre dans la marge, les rayons séparés par des filets).
// Toucher une pièce ouvre sa feuille : l'aperçu en grand (l'en-tête du
// profil, comme les autres le verront ; la planche pour un folio), puis
// « Porter » ou « Retirer » (porterPiece) ; une silhouette s'y montre en
// lecture, grisée, avec comment l'obtenir et, si une quête du Codex la
// donne, « Voir la quête ».
// Au plus deux éléments animés à l'écran sur téléphone : les deux premières
// pièces possédées qui bougent (la plus rare, en grand, reste figée sur
// téléphone) ; tout se fige quand la feuille est ouverte (son aperçu bouge à
// leur place). Le mouvement réduit fige tout (CSS).
// Les données arrivent toutes prêtes du serveur (components/moi/pieces-data.ts) :
// ce composant ne charge pas le catalogue des pièces (lib/profil/etagere-vue.ts seulement).

const T = {
  titre: "Mes pièces",
  filtre: { tout: "Tout", miennes: "Ce que j'ai" },
  vide: "Rien dans ce rayon pour l'instant.",
  portee: "Portée",
  porter: "Porter",
  retirer: "Retirer",
  voirQuete: "Voir la quête",
  commentObtenir: "Comment l'obtenir",
  pasEncore: "Pas encore à toi",
  baseAbsente: "La personnalisation arrive bientôt : la base n'est pas encore prête.",
  imageRemplacee: "Ton image de bannière laissera sa place à ce motif.",
  porteeOk: "C'est porté. Ton profil est à jour.",
  retireeOk: "C'est retiré.",
  rarete: { commune: "Commune", rare: "Rare", precieuse: "Précieuse", legendaire: "Légendaire" } satisfies Record<Rarete, string>,
};

/** Le liseré de la rareté (rien d'autre : pas d'ornement). */
const LISERE: Record<Rarete, string> = {
  commune: "var(--line-2)",
  rare: "#2b7bd8",
  precieuse: "#7a3e9d",
  legendaire: "#c8962b",
};

/** L'ordre des raretés, de la plus commune à la plus rare. */
const RANG: Record<Rarete, number> = { commune: 0, rare: 1, precieuse: 2, legendaire: 3 };

/**
 * La plus rare des pièces possédées : à rareté égale, une pièce gagnée avant une pièce libre, puis
 * celle qui est portée, puis la première de l'étagère. Rien de gagné (seulement des pièces libres) :
 * la plus rare de l'étagère, en silhouette. Étagère vide : null.
 */
function laPlusRare(possedees: PieceEtagere[], toutes: PieceEtagere[]): PieceEtagere | null {
  const mieux = (a: PieceEtagere, b: PieceEtagere) =>
    RANG[a.rarete] !== RANG[b.rarete] ? RANG[a.rarete] > RANG[b.rarete] : a.libre !== b.libre ? !a.libre : a.portee && !b.portee;
  let best: PieceEtagere | null = null;
  for (const p of possedees) if (p.possedee && (!best || mieux(p, best))) best = p;
  if (best && !best.libre) return best;
  let cible: PieceEtagere | null = null;
  for (const p of toutes) if (!p.possedee && (!cible || RANG[p.rarete] > RANG[cible.rarete])) cible = p;
  return cible ?? best;
}

/** Téléphone et tablette (moins de 1024 px) ; avant l'hydratation : oui (le moins animé). */
function useTelephone(): boolean {
  const [tel, setTel] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const maj = () => setTel(mq.matches);
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);
  return tel;
}

/** Le style tel qu'il serait avec la pièce portée (l'aperçu de la feuille). */
function avecPiece(style: StyleProfil, p: PieceEtagere): StyleProfil {
  if (p.type === "cadre") return { ...style, frame: p.nue };
  if (p.type === "banniere") return { ...style, banner: p.nue, bannerUrl: null };
  if (p.type === "ornement") return { ...style, ornement: p.nue };
  return style;
}

export function MesPieces({ etagere, carte, disponible }: { etagere: Etagere; carte: EnteteData; disponible: boolean }) {
  const router = useRouter();
  const telephone = useTelephone();
  const [tout, setTout] = useState(true);
  const [ouverte, setOuverte] = useState<PieceEtagere | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);
  const [pending, startTransition] = useTransition();
  // ce qui est porté, mis à jour dès qu'un « Porter » réussit (le serveur relit ensuite)
  const [portees, setPortees] = useState<Record<TypePiece, string | null>>(() => {
    const out = { cadre: null, banniere: null, titre: null, folio: null, ornement: null } as Record<TypePiece, string | null>;
    for (const r of etagere.rayons) out[r.type] = r.pieces.find((p) => p.portee)?.nue ?? null;
    return out;
  });
  const [style, setStyle] = useState<StyleProfil>(carte.style);
  const [titre, setTitre] = useState<string | null>(carte.titre ?? null);

  const rayons = useMemo(
    () =>
      etagere.rayons.map((r) => ({
        ...r,
        pieces: r.pieces.map((p) => ({ ...p, portee: portees[r.type] === p.nue && !(r.type === "banniere" && style.bannerUrl) })).filter((p) => tout || p.possedee),
      })),
    [etagere, portees, style.bannerUrl, tout],
  );
  // les pièces qui ont le droit de bouger : toutes sur ordinateur, les deux premières sur téléphone ; aucune sous la feuille
  const animees = useMemo(() => piecesAnimees(rayons.flatMap((r) => r.pieces), { telephone, feuille: !!ouverte }), [rayons, telephone, ouverte]);

  const ouvrir = (p: PieceEtagere) => {
    setMsg(null);
    setOuverte(p);
  };

  const porter = (p: PieceEtagere, nue: string | null) =>
    startTransition(async () => {
      const r = await porterPiece(p.type, nue).catch(() => ({ ok: false as const, erreur: "Enregistrement impossible, réessaie dans un instant." }));
      if (!r.ok) {
        setMsg({ ok: false, texte: r.erreur });
        return;
      }
      setPortees((x) => ({ ...x, [p.type]: nue ?? (p.type === "cadre" ? STYLE_DEFAUT.frame : p.type === "banniere" ? STYLE_DEFAUT.banner : p.type === "ornement" ? STYLE_DEFAUT.ornement : null) }));
      if (p.type === "cadre") setStyle((st) => ({ ...st, frame: nue ?? STYLE_DEFAUT.frame }));
      if (p.type === "banniere") setStyle((st) => (nue ? { ...st, banner: nue, bannerUrl: null } : { ...st, banner: STYLE_DEFAUT.banner }));
      if (p.type === "ornement") setStyle((st) => ({ ...st, ornement: nue ?? STYLE_DEFAUT.ornement }));
      if (p.type === "titre") setTitre(nue ? p.nom : null);
      setOuverte((o) => (o ? { ...o, portee: !!nue } : o));
      setMsg({ ok: true, texte: nue ? T.porteeOk : T.retireeOk });
      router.refresh();
    });

  // la plus rare : sur les pièces possédées (toujours montrées, quel que soit le filtre, avec ce qui est porté à jour)
  const rare = useMemo(() => laPlusRare(rayons.flatMap((r) => r.pieces), etagere.rayons.flatMap((r) => r.pieces)), [rayons, etagere]);

  // le chiffre-héros : ce qu'il possède sur tout ce qui est dessiné (les comptes des rayons, sans filtre)
  const { possedees, total } = etagere;
  // la ligne d'état : ce qu'il porte (sauf les pièces de départ : « Sans cadre », le lavis par défaut)
  const portesNoms = rayons.flatMap((r) => r.pieces.filter((x) => x.portee && !x.libre).map((x) => x.nom)).slice(0, 3);

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={SOUS_MOI.retour}
          titre={T.titre}
          ligne={portesNoms.length ? DOSSIER.pieces.ligne(portesNoms) : undefined}
          illustration={{ nom: "moi-cabinet-curiosites", porte: "44% 84%" }}
          heros={total > 0 ? { valeur: `${possedees}/${total}`, legende: DOSSIER.pieces.heros } : null}
        />
      }
    >
      <div data-leonard="mes-pieces">
        <Dossier>
          {rare && (
            <Filet etiquette={DOSSIER.pieces.rare}>
              {/* sur téléphone, elle reste figée : les deux pièces animées de l'étagère suffisent */}
              <PieceEnGrand p={rare} carte={carte} style={style} anime={rare.anime && rare.possedee && !telephone && !ouverte} onOuvrir={() => ouvrir(rare)} />
            </Filet>
          )}
          <Filet
            etiquette={DOSSIER.pieces.etagere}
            droite={
              <div role="tablist" aria-label="Filtrer les pièces" className="seg w-full max-w-[260px]" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + ${tout ? 1 : 0} * (100% - 8px) / 2)`, width: "calc((100% - 8px) / 2)" }} />
                {[false, true].map((v) => (
                  <button key={String(v)} type="button" role="tab" aria-selected={tout === v} onClick={() => setTout(v)} className="seg-item min-h-[44px]">
                    {v ? T.filtre.tout : T.filtre.miennes}
                  </button>
                ))}
              </div>
            }
          >
            {/* la cible de Léonard quand il présente l'étagère (les nouveautés, V3 §11.4) */}
            <div className="flex min-w-0 flex-col" data-leonard="pieces">
              {rayons.map((r, i) => (
                <section key={r.type} aria-labelledby={`rayon-${r.type}`} className={"flex flex-col gap-3 " + (i > 0 ? "mt-6 border-t border-line pt-6" : "")}>
                  <h3 id={`rayon-${r.type}`} className="m-0 flex items-baseline gap-2 text-[17px] font-bold tracking-[-0.01em]">
                    {r.titre}
                    <span className="font-mono text-[12.5px] font-semibold tabular-nums text-[var(--ink-2)]">
                      {r.possedees}/{r.total}
                    </span>
                  </h3>
                  {r.pieces.length ? (
                    <ul className={`${m.rayon} m-0 grid list-none gap-x-5 gap-y-6 p-0 ${r.type === "folio" ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6" : r.type === "ornement" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"}`}>
                      {r.pieces.map((p) => (
                        <li key={p.cle} className="min-w-0">
                          <CartePiece p={p} carte={carte} style={style} anime={animees.has(p.cle)} onOuvrir={() => ouvrir(p)} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="t-small m-0">{T.vide}</p>
                  )}
                </section>
              ))}
            </div>
          </Filet>
        </Dossier>

        <Feuille
          ouvert={!!ouverte}
          onFermer={() => setOuverte(null)}
          titre={ouverte?.nom ?? T.titre}
          pied={ouverte ? <PiedFeuille p={ouverte} disponible={disponible} pending={pending} msg={msg} onPorter={porter} /> : null}
        >
          {ouverte && <ContenuFeuille p={ouverte} carte={{ ...carte, style: avecPiece(style, ouverte), titre: ouverte.type === "titre" ? ouverte.nom : titre }} imageDeBanniere={!!style.bannerUrl} />}
        </Feuille>
      </div>
    </SousPage>
  );
}

/**
 * La plus rare, en grand, sous son filet, posée sur le vrai objet : l'en-tête du profil qui la porte (comme
 * les autres le verront) ; un titre, en Dela sur une plaque ébène, son liseré de rareté en filet de 2 px
 * (l'or sobre pour une précieuse). En silhouette tant qu'elle n'est pas à lui. La toucher ouvre sa fiche.
 */
function PieceEnGrand({ p, carte, style, onOuvrir }: { p: PieceEtagere; carte: EnteteData; style: StyleProfil; anime: boolean; onOuvrir: () => void }) {
  const lisere = p.rarete === "precieuse" ? "#c8a45a" : LISERE[p.rarete];
  const objet =
    p.type === "titre" ? (
      <span className={m.plaqueTitre} style={{ boxShadow: `inset 0 0 0 2px ${lisere}` }}>
        <TitrePorte titre={p.nom} className={m.plaqueTitreTexte} />
      </span>
    ) : p.type === "folio" && p.folio ? (
      <span className={m.rareFolio}>
        <CarteFolio f={p.folio} />
      </span>
    ) : (
      <span className={m.rareEntete}>
        <EnteteJoueur d={{ ...carte, style: avecPiece(style, p) }} apercu />
      </span>
    );
  return (
    <button
      type="button"
      onClick={onOuvrir}
      className={m.rareObjet}
      aria-label={`${p.nom}, ${T.rarete[p.rarete].toLowerCase()}${p.portee ? `, ${T.portee.toLowerCase()}` : p.possedee ? "" : `, ${T.pasEncore.toLowerCase()} : ${p.obtention}`}`}
    >
      <span className={p.possedee ? "block" : "block " + m.silhouette} aria-hidden>
        {objet}
      </span>
      <span className={m.rareLegende} aria-hidden>
        <i className={m.pastille} style={{ background: LISERE[p.rarete] }} />
        <span className="font-semibold">{T.rarete[p.rarete]}</span>
        <span className={m.rareNomCourt}>{p.nom}</span>
        {p.programme && <span>· {p.programme}</span>}
        {p.portee && <span className="font-semibold text-[var(--ink)]">· {T.portee}</span>}
      </span>
    </button>
  );
}

/**
 * Une pièce posée sur le rayon : sa vignette sur la ligne de sol (ombre de contact), son nom, la pastille de
 * sa rareté. Pas encore à lui : en silhouette grisée, sans texte (comment l'obtenir : dans sa feuille).
 */
function CartePiece({ p, carte, style, anime, onOuvrir }: { p: PieceEtagere; carte: EnteteData; style: StyleProfil; anime: boolean; onOuvrir: () => void }) {
  const fige = !anime;
  const vignette =
    p.type === "cadre" ? (
      <span className="flex h-[76px] items-end justify-center">
        <CadreSceau frame={p.nue} name={carte.name} avatarUrl={carte.avatarUrl} size={60} fige={fige} />
      </span>
    ) : p.type === "banniere" ? (
      <Banniere banner={p.nue} accent={style.accent} fige={fige} className="h-[76px] w-full rounded-[8px]" />
    ) : p.type === "titre" ? (
      <span className={m.titreRayon}>
        <TitrePorte titre={p.nom} className="text-[13px]" />
      </span>
    ) : p.type === "ornement" ? (
      // en attendant son dessin : un petit cadre vertical, filet double
      <span className="flex h-[76px] items-end justify-center">
        <span className="block h-[70px] w-[46px] rounded-[3px] border border-[var(--ink)] p-[3px]">
          <span className="block h-full w-full rounded-[1px] border border-line-2" />
        </span>
      </span>
    ) : p.folio ? (
      <CarteFolio f={p.folio} />
    ) : null;
  return (
    <button
      type="button"
      onClick={onOuvrir}
      className={m.posee}
      aria-label={`${p.nom}, ${T.rarete[p.rarete].toLowerCase()}${p.portee ? `, ${T.portee.toLowerCase()}` : p.possedee ? "" : `, ${T.pasEncore.toLowerCase()} : ${p.obtention}`}`}
    >
      <span className={m.poseeObjet + (p.possedee ? "" : " " + m.silhouette)} aria-hidden>
        {vignette}
      </span>
      <span className={m.poseeNom} aria-hidden>
        <i className={m.pastille} style={{ background: LISERE[p.rarete] }} />
        <span className="line-clamp-1 min-w-0">{p.nom}</span>
      </span>
      {p.portee && (
        <span className={m.poseePortee} aria-hidden>
          {T.portee}
        </span>
      )}
    </button>
  );
}

export function ContenuFeuille({ p, carte, imageDeBanniere }: { p: PieceEtagere; carte: EnteteData; imageDeBanniere: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className={p.possedee ? "" : "pointer-events-none opacity-50 grayscale"}>
        {p.type === "folio" && p.folio ? <BlocFolio f={{ nom: p.nom, ...p.folio }} /> : <EnteteJoueur d={carte} apercu />}
      </div>
      <div className="flex flex-col gap-1">
        <p className="t-micro m-0 font-semibold uppercase tracking-[0.06em]" style={{ color: p.rarete === "commune" ? undefined : LISERE[p.rarete] }}>
          {T.rarete[p.rarete]}
        </p>
        <p className="t-small m-0">{p.description}</p>
      </div>
      {!p.possedee && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <p className="t-eyebrow m-0">{T.commentObtenir}</p>
          <p className="m-0 text-[14px] font-semibold">{p.obtention}</p>
          {p.voirQuete && (
            <Link href={p.voirQuete} className="ink-link inline-flex min-h-[44px] w-fit items-center gap-1 text-[14px] font-semibold">
              {T.voirQuete} <ArrowRight size={14} aria-hidden />
            </Link>
          )}
        </div>
      )}
      {p.possedee && !p.portee && p.type === "banniere" && imageDeBanniere && <p className="t-micro m-0">{T.imageRemplacee}</p>}
    </div>
  );
}

/** Le pied de la feuille : « Porter » ou « Retirer », et ce qu'il en est. */
function PiedFeuille({
  p,
  disponible,
  pending,
  msg,
  onPorter,
}: {
  p: PieceEtagere;
  disponible: boolean;
  pending: boolean;
  msg: { ok: boolean; texte: string } | null;
  onPorter: (p: PieceEtagere, nue: string | null) => void;
}) {
  if (!p.possedee) return <p className="t-small m-0">{T.pasEncore}</p>;
  if (!disponible) return <p className="t-small m-0">{T.baseAbsente}</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {p.portee ? (
        retirable(p) && (
          <button type="button" className="btn btn-secondary rl-press min-h-[44px]" disabled={pending} onClick={() => onPorter(p, null)}>
            {pending ? "…" : T.retirer}
          </button>
        )
      ) : (
        <button type="button" className="btn btn-primary rl-press min-h-[44px]" disabled={pending} onClick={() => onPorter(p, p.nue)}>
          {pending ? "…" : T.porter}
        </button>
      )}
      {msg ? (
        <span role="status" className={"text-[13px] font-medium " + (msg.ok ? "" : "text-pen")}>
          {msg.texte}
        </span>
      ) : p.portee ? (
        <span className="text-[13px] font-semibold">{T.portee}</span>
      ) : null}
    </div>
  );
}
