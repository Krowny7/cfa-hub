"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, LayoutTemplate, RotateCcw } from "lucide-react";
import { Feuille } from "@/components/ui/Feuille";
import { PlanPage } from "@/components/profil/EditeurPage";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { VITRINE, type VitrineKey } from "@/lib/profil/catalogue";
import { blocsDe, imagesHaut, infoBloc, nomBloc, type CleBloc, type Disposition } from "@/lib/profil/disposition";
import { MODELES_PAGE, appliquerModele, estDefautParContenu, estPageDepart, modeleActuel, pageDepart, type CleModele, type ModelePage, type PageModele } from "@/lib/profil/modeles-page";
import { EDITEUR_PAGE as T } from "@/lib/voice-editeur";
import s from "./EditeurPage.module.css";

// Personnaliser · Ta page · « Partir d'un modèle » : trois pages toutes
// faites (lib/profil/modeles-page.ts), chacune montrée telle que CE joueur
// l'aura (adaptée à ce que sa page a à montrer, ses médias gardés). Sur
// ordinateur, une rangée de 3 cartes (le nom, la phrase, le plan, les
// chiffres clés, ce qui a été adapté, « Appliquer »), dans un repli ouvert
// d'office si la page n'a jamais été composée. Au téléphone, une ligne de
// 44 px ouvre la Feuille du site, les cartes empilées (l'ordre des blocs au
// lieu du plan : tout est sur une colonne). Remplacer la page demande
// toujours confirmation, dans la carte (jamais de fenêtre), même juste après
// un autre modèle ; seule la page de départ intacte s'en passe. Après un modèle,
// « Revenir à ta page » rétablit la page d'avant le premier modèle appliqué,
// jusqu'à l'enregistrement (ou « Annuler »). Rien n'est écrit ici :
// Personnaliser enregistre.

type Choix = CleModele | "depart";
type Page = { disposition: Disposition; showcase: VitrineKey[] };

const nomChiffre = (k: VitrineKey) => VITRINE.find((v) => v.key === k)?.nom ?? k;
const nomVoulu = (k: CleBloc | "media") => (k === "media" ? T.tonImage : infoBloc(k).nom);
const memeChiffres = (a: VitrineKey[], b: VitrineKey[]) => a.join("|") === b.join("|");
/** le premier élément visible (la même carte existe sur ordinateur et dans la feuille du téléphone) */
const visible = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel)).find((x) => x.getClientRects().length > 0);

export function ModelesPage({
  disposition,
  showcase,
  donnees,
  enregistree,
  occupe = false,
  onAppliquer,
}: {
  /** la page en cours (le brouillon) */
  disposition: Disposition;
  showcase: VitrineKey[];
  /** ce que les blocs ont à montrer (lu par le serveur, même pour les blocs masqués) */
  donnees: DonneesBlocs;
  /** la page enregistrée : « Revenir à ta page » vaut jusqu'à ce qu'elle change, ou qu'on y revienne (« Annuler ») */
  enregistree: Page;
  /** un envoi ou un enregistrement en cours : « Appliquer » attend */
  occupe?: boolean;
  onAppliquer: (d: Disposition, showcase: VitrineKey[]) => void;
}) {
  const pages = useMemo(() => Object.fromEntries(MODELES_PAGE.map((m) => [m.cle, appliquerModele(m, disposition, donnees)])) as Record<CleModele, PageModele>, [disposition, donnees]);
  const depart = useMemo(() => pageDepart(disposition, donnees), [disposition, donnees]);
  const actuel = useMemo(() => modeleActuel(disposition, donnees, showcase), [disposition, donnees, showcase]);
  const surDepart = useMemo(() => estPageDepart(disposition, donnees, showcase), [disposition, donnees, showcase]);

  const [ouvert, setOuvert] = useState(() => estDefautParContenu(enregistree.disposition));
  const [feuille, setFeuille] = useState(false);
  const [confirme, setConfirme] = useState<Choix | null>(null);
  // la page d'avant le premier modèle appliqué depuis le dernier enregistrement (base : la disposition enregistrée d'alors)
  const [cliche, setCliche] = useState<(Page & { base: Disposition }) | null>(null);
  const [applique, setApplique] = useState<Choix | null>(null);
  const statut = useRef<HTMLDivElement | null>(null);
  /** après « Appliquer » : le focus sur la ligne d'état (et, depuis la feuille, la page jusqu'à « Ta page ») */
  const aMontrer = useRef<"ici" | "page" | null>(null);

  // le cliché ne vaut plus après l'enregistrement, ni une fois revenu à la page enregistrée (« Annuler »)
  const surEnregistree = disposition === enregistree.disposition && memeChiffres(showcase, enregistree.showcase);
  const clicheActif = cliche && cliche.base === enregistree.disposition && !surEnregistree ? cliche : null;
  // toute page se remplace après confirmation, même un modèle tout juste appliqué ; seule la page de départ intacte
  // s'en passe (sans média en haut ni couleurs inversées : un modèle qui ne pose pas leur module les perdrait)
  const confirmer = !surDepart || imagesHaut(disposition).length > 0 || disposition.some((e) => "inv" in e && e.inv);

  // la confirmation ouverte : le focus sur « Remplacer » ; un toucher ailleurs l'annule
  useEffect(() => {
    if (!confirme) return;
    visible(`[data-remplacer="${confirme}"]`)?.focus();
    const dehors = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-confirmation]")) setConfirme(null);
    };
    document.addEventListener("pointerdown", dehors);
    return () => document.removeEventListener("pointerdown", dehors);
  }, [confirme]);

  // après « Appliquer » (la feuille déjà refermée : ses effets passent avant celui-ci)
  useEffect(() => {
    const quoi = aMontrer.current;
    if (!quoi || feuille) return;
    aMontrer.current = null;
    if (quoi === "page") {
      const doux = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("rl-perso-page")?.scrollIntoView({ block: "start", behavior: doux ? "smooth" : "auto" });
    }
    statut.current?.focus({ preventScroll: true });
  });

  const appliquer = (c: Choix, depuisFeuille: boolean) => {
    const p = c === "depart" ? depart : pages[c];
    if (!clicheActif) setCliche({ disposition, showcase, base: enregistree.disposition });
    setApplique(c);
    setConfirme(null);
    aMontrer.current = depuisFeuille ? "page" : "ici";
    if (depuisFeuille) setFeuille(false);
    onAppliquer(p.disposition, p.showcase);
  };
  const demander = (c: Choix, depuisFeuille: boolean) => (confirmer ? setConfirme(c) : appliquer(c, depuisFeuille));
  /** « Garder ma page », Échap : la confirmation se ferme, le focus revient à son bouton */
  const garder = (c: Choix) => {
    setConfirme(null);
    requestAnimationFrame(() => visible(`[data-modele="${c}"]`)?.focus());
  };
  const revenir = () => {
    if (!clicheActif) return;
    onAppliquer(clicheActif.disposition, clicheActif.showcase);
    setCliche(null);
    setApplique(null);
    // la ligne d'état s'en va avec son bouton : le focus revient à l'entrée des modèles
    requestAnimationFrame(() => visible("[data-modeles-entree]")?.focus());
  };

  const confirmation = (c: Choix, telephone: boolean) => (
    <div
      data-confirmation
      className="flex flex-col gap-2"
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        // Échap ferme la confirmation, pas la feuille
        e.preventDefault();
        e.stopPropagation();
        garder(c);
      }}
    >
      <p className="m-0 text-[13px] font-semibold">{clicheActif ? T.remplacerApresModele : T.remplacerQuestion}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-remplacer={c} className={"btn btn-primary btn-sm" + (telephone ? " min-h-[44px]" : "")} onClick={() => appliquer(c, telephone)} disabled={occupe}>
          {T.remplacer}
        </button>
        <button type="button" className={"btn btn-ghost btn-sm" + (telephone ? " min-h-[44px]" : "")} onClick={() => garder(c)}>
          {T.garderPage}
        </button>
      </div>
    </div>
  );

  const carte = (m: ModelePage, telephone: boolean) => {
    const p = pages[m.cle];
    const t = T.MODELES[m.cle];
    const premier = p.remplaces[0];
    const id = `rl-modele-${m.cle}${telephone ? "-tel" : ""}`;
    return (
      <li key={m.cle} aria-labelledby={id} className="card-quiet flex min-w-0 list-none flex-col gap-3 p-5">
        <div>
          <p id={id} className="m-0 text-[16px] font-bold">
            {t.nom}
          </p>
          <p className="t-small m-0 mt-1">{t.phrase}</p>
        </div>
        {telephone ? <p className="t-small m-0">{T.dansLOrdre(blocsDe(p.disposition).map(nomBloc))}</p> : <PlanPage disposition={p.disposition} medias label={T.planModele(t.nom)} />}
        <div className="flex flex-col gap-1">
          <p className="t-micro m-0">{T.chiffresModele(p.showcase.map(nomChiffre))}</p>
          {premier && <p className="t-micro m-0">{T.adapte(nomVoulu(premier.mis), nomVoulu(premier.voulu), p.remplaces.length > 1)}</p>}
        </div>
        <div className="mt-auto pt-1">
          {confirme === m.cle ? (
            confirmation(m.cle, telephone)
          ) : actuel === m.cle ? (
            <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-line-2 px-3 text-[13px] font-semibold">
              <Check size={14} aria-hidden /> {T.pageActuelle}
            </span>
          ) : (
            <button
              type="button"
              data-modele={m.cle}
              className={"btn btn-secondary btn-sm" + (telephone ? " min-h-[44px] w-full" : "")}
              aria-label={T.appliquerModele(t.nom)}
              onClick={() => demander(m.cle, telephone)}
              disabled={occupe}
            >
              {T.appliquer}
            </button>
          )}
        </div>
      </li>
    );
  };

  const pied = (telephone: boolean) => (
    <div className="flex flex-col gap-1">
      <p className="t-micro m-0">{T.modelesPied}</p>
      {!surDepart &&
        (confirme === "depart" ? (
          <div className="pt-1">{confirmation("depart", telephone)}</div>
        ) : (
          <button
            type="button"
            data-modele="depart"
            className="inline-flex min-h-[44px] w-fit items-center gap-1.5 text-[13px] font-semibold underline underline-offset-2 hover:text-white disabled:opacity-50"
            onClick={() => demander("depart", telephone)}
            disabled={occupe}
          >
            {T.pageDepart}
          </button>
        ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {clicheActif && applique && (
        <div ref={statut} tabIndex={-1} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[14px] border border-line-2 bg-[var(--surface)] px-4 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]">
          <span role="status" className="text-[13px] font-medium">
            {applique === "depart" ? T.departApplique : T.applique(T.MODELES[applique].nom)}
          </span>
          <button type="button" className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold underline underline-offset-2 hover:text-white lg:min-h-[34px]" onClick={revenir}>
            <RotateCcw size={14} aria-hidden /> {T.revenir}
          </button>
        </div>
      )}

      {/* ordinateur : la rangée de 3 cartes, dans un repli */}
      <details className={"group " + s.grandSeul} open={ouvert} onToggle={(e) => setOuvert(e.currentTarget.open)}>
        <summary data-modeles-entree className="flex min-h-[44px] w-fit cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
          <LayoutTemplate size={15} aria-hidden />
          <span className="t-eyebrow">{ouvert ? T.modeles : T.modelesCompte}</span>
          <ChevronDown size={15} aria-hidden className="text-muted transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-4 pt-1">
          <p className="t-small m-0">{T.modelesAide}</p>
          <ul aria-label={T.modeles} className="m-0 grid grid-cols-3 gap-[18px] p-0">
            {MODELES_PAGE.map((m) => carte(m, false))}
          </ul>
          {pied(false)}
        </div>
      </details>

      {/* téléphone : une ligne, puis la feuille */}
      <button
        type="button"
        data-modeles-entree
        aria-haspopup="dialog"
        className={"flex min-h-[44px] w-full items-center gap-2 rounded-[14px] border border-line-2 bg-[var(--surface)] px-4 text-left text-[14px] font-semibold " + s.petitSeul}
        onClick={() => setFeuille(true)}
      >
        <LayoutTemplate size={16} aria-hidden /> {T.modelesCompte}
        <ChevronRight size={16} aria-hidden className="ml-auto text-muted" />
      </button>
      <Feuille
        ouvert={feuille}
        onFermer={() => {
          setFeuille(false);
          setConfirme(null);
        }}
        titre={T.modeles}
        apercu
      >
        <div className="flex flex-col gap-4 pt-2">
          <p className="t-small m-0">{T.modelesAide}</p>
          <ul aria-label={T.modeles} className="m-0 flex flex-col gap-3 p-0">
            {MODELES_PAGE.map((m) => carte(m, true))}
          </ul>
          {pied(true)}
        </div>
      </Feuille>
    </div>
  );
}
