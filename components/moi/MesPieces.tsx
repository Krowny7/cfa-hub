"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { FilMoi } from "@/components/moi/Briques";
import { Banniere, CadreSceau } from "@/components/profil/Pieces";
import { BlocFolio, CarteFolio } from "@/components/profil/Folio";
import { TitrePorte } from "@/components/profil/TitrePorte";
import { EnteteJoueur, type EnteteData } from "@/components/profil/EnteteJoueur";
import { Feuille } from "@/components/ui/Feuille";
import { porterPiece } from "@/app/moi/profil/actions";
import { STYLE_DEFAUT, type StyleProfil } from "@/lib/profil/catalogue";
import { piecesAnimees, resumeEtagere, retirable, type Etagere, type PieceEtagere } from "@/lib/profil/etagere-vue";
import type { Rarete, TypePiece } from "@/lib/profil/pieces";

// Moi › Mes pièces (V3 §3.8) : l'étagère de tout ce qui se porte sur le
// profil, en quatre rayons (cadres, bannières, titres, folios). Les pièces
// possédées d'abord, qui bougent si elles bougent ; puis les silhouettes
// (grisées, immobiles), avec la façon de les obtenir et, si une quête du
// Codex les donne, « Y aller ». Un résumé (« 23 pièces sur 61 · 4 folios »)
// et un filtre « Ce que j'ai / Tout ».
// Toucher une pièce ouvre sa feuille : l'aperçu en grand (l'en-tête du
// profil, comme les autres le verront ; la planche pour un folio), puis
// « Porter » ou « Retirer » (porterPiece) ; une silhouette s'y montre en
// lecture, grisée, avec comment l'obtenir.
// Au plus deux éléments animés à l'écran sur téléphone : les deux premières
// pièces possédées qui bougent ; tout se fige quand la feuille est ouverte
// (son aperçu bouge à leur place). Le mouvement réduit fige tout (CSS).
// Les données arrivent toutes prêtes du serveur (components/moi/pieces-data.ts) :
// ce composant ne charge pas le catalogue des pièces (lib/profil/etagere-vue.ts seulement).

const T = {
  surtitre: "Ta collection",
  titre: "Mes pièces",
  phrase: "Tout ce qui se porte sur ton profil. Rien ne s'achète, rien ne se tire au sort : chaque pièce se gagne, et une pièce portée reste à toi.",
  filtre: { tout: "Tout", miennes: "Ce que j'ai" },
  vide: "Rien dans ce rayon pour l'instant.",
  portee: "Portée",
  porter: "Porter",
  retirer: "Retirer",
  allerA: "Y aller",
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
    const out = { cadre: null, banniere: null, titre: null, folio: null } as Record<TypePiece, string | null>;
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
      setPortees((x) => ({ ...x, [p.type]: nue ?? (p.type === "cadre" ? STYLE_DEFAUT.frame : p.type === "banniere" ? STYLE_DEFAUT.banner : null) }));
      if (p.type === "cadre") setStyle((st) => ({ ...st, frame: nue ?? STYLE_DEFAUT.frame }));
      if (p.type === "banniere") setStyle((st) => (nue ? { ...st, banner: nue, bannerUrl: null } : { ...st, banner: STYLE_DEFAUT.banner }));
      if (p.type === "titre") setTitre(nue ? p.nom : null);
      setOuverte((o) => (o ? { ...o, portee: !!nue } : o));
      setMsg({ ok: true, texte: nue ? T.porteeOk : T.retireeOk });
      router.refresh();
    });

  return (
    <div className="rl-wide flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-3">
        <FilMoi />
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="t-eyebrow m-0">{T.surtitre}</p>
            <h1 className="t-h1 m-0 mt-1">{T.titre}</h1>
            <p className="t-num m-0 mt-2 text-[15px] font-semibold">{resumeEtagere(etagere)}</p>
            <p className="t-small m-0 mt-1 max-w-[620px]">{T.phrase}</p>
          </div>
          <div role="tablist" aria-label="Filtrer les pièces" className="seg w-full sm:w-auto" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + ${tout ? 1 : 0} * (100% - 8px) / 2)`, width: "calc((100% - 8px) / 2)" }} />
            {[false, true].map((v) => (
              <button key={String(v)} type="button" role="tab" aria-selected={tout === v} onClick={() => setTout(v)} className="seg-item min-h-[44px] sm:px-6">
                {v ? T.filtre.tout : T.filtre.miennes}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rayons.map((r) => (
        <section key={r.type} aria-labelledby={`rayon-${r.type}`} className="flex flex-col gap-3">
          <h2 id={`rayon-${r.type}`} className="t-h3 m-0 flex items-baseline gap-2">
            {r.titre}
            <span className="t-micro t-num font-semibold">
              {r.possedees}/{r.total}
            </span>
          </h2>
          {r.pieces.length ? (
            <ul className={`m-0 grid list-none gap-3 p-0 ${r.type === "folio" ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"}`}>
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

      <Feuille
        ouvert={!!ouverte}
        onFermer={() => setOuverte(null)}
        titre={ouverte?.nom ?? T.titre}
        pied={ouverte ? <PiedFeuille p={ouverte} disponible={disponible} pending={pending} msg={msg} onPorter={porter} /> : null}
      >
        {ouverte && <ContenuFeuille p={ouverte} carte={{ ...carte, style: avecPiece(style, ouverte), titre: ouverte.type === "titre" ? ouverte.nom : titre }} imageDeBanniere={!!style.bannerUrl} />}
      </Feuille>
    </div>
  );
}

/** Une pièce sur l'étagère : sa vignette, son nom, et « Portée » ou comment l'obtenir. */
function CartePiece({ p, carte, style, anime, onOuvrir }: { p: PieceEtagere; carte: EnteteData; style: StyleProfil; anime: boolean; onOuvrir: () => void }) {
  const fige = !anime;
  const vignette =
    p.type === "cadre" ? (
      <span className="flex h-[76px] items-center justify-center">
        <CadreSceau frame={p.nue} name={carte.name} avatarUrl={carte.avatarUrl} size={52} fige={fige} />
      </span>
    ) : p.type === "banniere" ? (
      <Banniere banner={p.nue} accent={style.accent} fige={fige} className="h-[76px] w-full rounded-[10px]" />
    ) : p.type === "titre" ? (
      <span className="flex h-[76px] items-center justify-center rounded-[10px] border border-line px-2 text-center">
        <TitrePorte titre={p.nom} className="text-[13px] text-white" />
      </span>
    ) : p.folio ? (
      <CarteFolio f={p.folio} />
    ) : null;
  return (
    <button
      type="button"
      onClick={onOuvrir}
      className="card-quiet flex h-full min-h-[44px] w-full flex-col gap-2 border-t-[3px] p-2.5 text-left transition-colors hover:border-line-2"
      style={{ borderTopColor: LISERE[p.rarete] }}
      aria-label={`${p.nom}${p.portee ? `, ${T.portee.toLowerCase()}` : p.possedee ? "" : `, ${T.pasEncore.toLowerCase()} : ${p.obtention}`}`}
    >
      <span className={`block ${p.possedee ? "" : "opacity-35 grayscale"}`} aria-hidden>
        {vignette}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{p.nom}</span>
        {p.portee ? (
          <span className="t-micro font-semibold text-[var(--ink)]">{T.portee}</span>
        ) : !p.possedee ? (
          <span className="t-micro line-clamp-2">{p.obtention}</span>
        ) : null}
      </span>
    </button>
  );
}

/** La feuille d'une pièce : l'aperçu en grand, ce que c'est, comment l'obtenir. */
function ContenuFeuille({ p, carte, imageDeBanniere }: { p: PieceEtagere; carte: EnteteData; imageDeBanniere: boolean }) {
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
          {p.allerA && (
            <Link href={p.allerA} className="ink-link inline-flex min-h-[44px] w-fit items-center gap-1 text-[14px] font-semibold">
              {T.allerA} <ArrowRight size={14} aria-hidden />
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
