"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { EnteteJoueur, type EnteteData } from "@/components/profil/EnteteJoueur";
import { ListeAmis, Vitrine } from "@/components/profil/Vitrine";
import { RadarComparable } from "@/components/profil/RadarComparable";
import { EditeurDisposition } from "@/components/profil/EditeurDisposition";
import { AmbianceProfil } from "@/components/profil/Pieces";
import { SceauxPoses } from "@/components/profil/SceauxPoses";
import { Feuille } from "@/components/ui/Feuille";
import {
  Regle,
  SectionAmbiance,
  SectionBanniere,
  SectionBio,
  SectionCadre,
  SectionCouleur,
  SectionLinkedin,
  SectionNom,
  SectionPoses,
  SectionVitrine,
  type Brouillon,
} from "@/components/profil/SectionsPersonnaliser";
import { enregistrerProfil } from "@/app/moi/profil/actions";
import { poserSceaux } from "@/lib/profil/actions-sceaux";
import { createClient } from "@/lib/supabase/browser";
import { rankFor } from "@/lib/ranks";
import { posesDe } from "@/lib/profil/sceaux";
import type { AmiLite } from "@/lib/profil/donnees";
import type { CleBloc } from "@/lib/profil/disposition";
import { couleurCss, linkedinLisible, nettoyerNom, normaliserLinkedin, type Acquis, type NomProfil, type ProfilStats, type StyleProfil, type Visibilite } from "@/lib/profil/catalogue";
import { ENTETE, PERSO, provenances } from "@/lib/voice-profil";
import { JOUEURS } from "@/lib/voice-z2a";

// Personnaliser son profil sur la page elle-même (/people/<moi>?personnaliser=1) :
// un crayon sur chaque zone (bannière, sceau, sceaux posés, encre, nom et
// bio, page) ; le toucher ouvre la Feuille de la zone (en bas sur
// téléphone, 70 % de la hauteur ; tiroir de 420 px à droite sur
// ordinateur), et la vraie page change en direct dessous. Les sections sont
// celles de l'ancien éditeur (SectionsPersonnaliser.tsx). La page se range
// sur place (EditeurDisposition : appui long ou flèches, au doigt comme à
// la souris). Une barre collée en bas enregistre ou annule ; le serveur
// revalide tout (cadres et bannières gagnés, ou déjà portés).

type Zone = keyof typeof PERSO.zones;
type Enregistre = { style: StyleProfil; linkedin: string; visibilite: Visibilite; nom: string; nomVisibilite: "public" | "friends"; pins: string[] };

/** Le crayon d'une zone : un rond de 44 px, ou une pastille avec son nom. */
function Crayon({ label, onClick, texte, children }: { label: string; onClick: () => void; texte?: string; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={texte ? undefined : label}
      title={label}
      className={
        "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-line-2 bg-[var(--surface)] text-[13px] font-semibold text-white shadow-[var(--shadow-2)] transition-colors hover:border-white " +
        (texte ? "px-3.5" : "w-11")
      }
    >
      {children ?? <Pencil size={16} aria-hidden />}
      {texte}
    </button>
  );
}

export function Personnaliser({
  carte,
  stats,
  acquis,
  initial,
  pins: pinsInitiaux,
  base,
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
  /** ce qui ouvre les pièces gagnées (questions, pic, sceaux, dates) */
  acquis: Acquis;
  initial: StyleProfil;
  /** les sceaux posés (choisis, sinon d'office) */
  pins: string[];
  /** la base des sceaux est prête : le choix des sceaux posés s'enregistre */
  base: boolean;
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
  const depart: Enregistre = useMemo(
    () => ({ style: initial, linkedin: linkedinLisible(linkedinInitial), visibilite: visibiliteInitiale, nom: nomInitial.nom ?? "", nomVisibilite: nomInitial.visibilite, pins: pinsInitiaux }),
    [initial, linkedinInitial, visibiliteInitiale, nomInitial, pinsInitiaux],
  );
  const [enregistre, setEnregistre] = useState<Enregistre>(depart);
  const [style, setStyle] = useState<StyleProfil>(depart.style);
  const [linkedin, setLinkedin] = useState(depart.linkedin);
  const [visibilite, setVisibilite] = useState<Visibilite>(depart.visibilite);
  const [nom, setNom] = useState(depart.nom);
  const [nomVisibilite, setNomVisibilite] = useState(depart.nomVisibilite);
  const [pins, setPins] = useState<string[]>(depart.pins);
  const [zone, setZone] = useState<Zone | null>(null);
  const [envoiImage, setEnvoiImage] = useState(false);
  const [envoiMedia, setEnvoiMedia] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);
  const [pending, start] = useTransition();

  const courant: Enregistre = { style, linkedin, visibilite, nom, nomVisibilite, pins };
  const modifie = JSON.stringify(courant) !== JSON.stringify(enregistre);
  const lienOk = !linkedin.trim() || !!normaliserLinkedin(linkedin);
  const bloque = pending || !lienOk || envoiImage || envoiMedia;

  // quitter la page avec des modifications : le navigateur demande
  useEffect(() => {
    if (!modifie) return;
    const garde = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", garde);
    return () => window.removeEventListener("beforeunload", garde);
  }, [modifie]);

  const set = <K extends keyof StyleProfil>(k: K, v: StyleProfil[K]) => {
    setStyle((s) => ({ ...s, [k]: v }));
    setMsg(null);
  };
  /** un réglage hors du style : la modification efface le dernier message */
  const puis =
    <T,>(f: (v: T) => void) =>
    (v: T) => {
      f(v);
      setMsg(null);
    };
  const b: Brouillon = { style, set, setStyle };
  const gains = { acquis, porte: { frame: enregistre.style.frame, banner: enregistre.style.banner } };

  // l'en-tête en direct : le style en cours, le nom, le LinkedIn, la provenance des pièces qui bougent
  const apercu: EnteteData = {
    ...carte,
    style,
    nomComplet: nettoyerNom(nom),
    linkedin: lienOk && linkedin.trim() ? normaliserLinkedin(linkedin) : null,
    provenance: provenances(style, acquis),
  };
  const poses = posesDe(acquis.sceaux, pins);
  const gagnes = acquis.sceaux.filter((e) => e.palier > 0);

  /** Ouvre la Feuille d'une zone, la zone en haut de l'écran (sur téléphone, la feuille couvre le bas). */
  const ouvrir = (z: Zone) => {
    setZone(z);
    const doux = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (z === "page") document.getElementById("rl-perso-page")?.scrollIntoView({ block: "start", behavior: doux ? "smooth" : "auto" });
    else window.scrollTo({ top: 0, behavior: doux ? "smooth" : "auto" });
  };

  const annuler = () => {
    setStyle(enregistre.style);
    setLinkedin(enregistre.linkedin);
    setVisibilite(enregistre.visibilite);
    setNom(enregistre.nom);
    setNomVisibilite(enregistre.nomVisibilite);
    setPins(enregistre.pins);
    setMsg(null);
  };

  const enregistrer = () =>
    start(async () => {
      setMsg(null);
      const r = await enregistrerProfil({ style, linkedin, visibilite, nom, nomVisibilite });
      if (!r.ok) {
        setMsg({ ok: false, texte: r.erreur });
        return;
      }
      const refus = [...r.refus];
      let pinsGardes = pins;
      if (base && pins.join("|") !== enregistre.pins.join("|")) {
        const p = await poserSceaux(pins);
        if (!p.ok) {
          refus.push(PERSO.posesRefus);
          pinsGardes = enregistre.pins;
        }
      }
      setStyle(r.style);
      setPins(pinsGardes);
      setEnregistre({ style: r.style, linkedin, visibilite, nom, nomVisibilite, pins: pinsGardes });
      setMsg({ ok: true, texte: refus.length ? PERSO.enregistreSauf(refus) : PERSO.enregistre });
      router.refresh();
    });

  const rk = rankFor(carte.elo, carte.mastery, carte.place);
  const rang = { tierIndex: rk.tierIndex, division: rk.division, elo: carte.elo, mastery: carte.mastery };
  // les blocs de la page, avec les réglages en cours (couleur, chiffres clés)
  const rendus: Partial<Record<CleBloc, React.ReactNode>> = {
    vitrine: <Vitrine style={style} stats={stats} rang={rang} />,
    radar: <RadarComparable matieres={stats.matieres} moyennes={moyennes} accent={style.accent} nom={carte.name} moi />,
    amis: amis ? <ListeAmis amis={amis.amis} total={amis.total} moi /> : null,
    ...rendusServeur,
  };

  const statut = msg ? (
    <span role="status" className={"text-[13px] font-medium " + (msg.ok ? "" : "text-pen")}>
      {msg.texte}
    </span>
  ) : modifie ? (
    <span className="text-[13px] font-semibold">{PERSO.nonEnregistre}</span>
  ) : null;
  const boutonEnregistrer = (
    <button type="button" className="btn btn-primary rl-press" onClick={enregistrer} disabled={bloque || !modifie}>
      {pending ? "…" : PERSO.enregistrer}
    </button>
  );

  const retour = (
    <Link href={`/people/${carte.id}`} className="inline-flex min-h-[36px] w-fit items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--paper)_82%,transparent)] px-3 py-1.5 text-[13px] font-semibold text-muted backdrop-blur hover:text-white">
      <ArrowLeft size={14} aria-hidden /> {PERSO.monProfil}
    </Link>
  );

  return (
    <div className="relative isolate pb-24">
      <AmbianceProfil style={style} />
      <div className="flex flex-col gap-6 md:gap-8">
        <EnteteJoueur
          d={apercu}
          haut={retour}
          kicker={JOUEURS.kickerMoi}
          rangDe="Ton rang"
          crayons={{
            banniere: <Crayon label={PERSO.modifier(PERSO.zones.banniere)} onClick={() => ouvrir("banniere")} />,
            sceau: <Crayon label={PERSO.modifier(PERSO.zones.sceau)} onClick={() => ouvrir("sceau")} />,
          }}
          actions={
            <>
              <Crayon label={PERSO.modifier(PERSO.zones.identite)} texte={PERSO.zones.identite} onClick={() => ouvrir("identite")} />
              <Crayon label={PERSO.modifier(PERSO.zones.encre)} texte={PERSO.zones.encre} onClick={() => ouvrir("encre")}>
                <span aria-hidden className="block h-4 w-4 rounded-full border border-line-2" style={{ background: couleurCss(style.accent) }} />
              </Crayon>
            </>
          }
          poses={
            <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-center lg:gap-6">
              <SceauxPoses poses={poses} label={ENTETE.posesChoisisMoi} onToucher={() => ouvrir("poses")} />
              <Crayon label={PERSO.modifier(PERSO.zones.poses)} texte={PERSO.zones.poses} onClick={() => ouvrir("poses")} />
            </div>
          }
        />

        {/* la page elle-même, rangée sur place */}
        <section id="rl-perso-page" aria-label={PERSO.zones.page} className="flex scroll-mt-24 flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 flex-[1_1_260px]">
              <p className="t-eyebrow m-0">{PERSO.zones.page}</p>
              <p className="t-small m-0 mt-1">{PERSO.pageAide}</p>
            </div>
            <Crayon label={PERSO.modifier(PERSO.pageCrayon)} texte={PERSO.pageCrayon} onClick={() => ouvrir("page")} />
          </div>
          {!disponible && <p className="t-small m-0 rounded-[12px] border border-dashed border-line-2 p-3">{PERSO.basePasPrete}</p>}
          <EditeurDisposition disposition={style.disposition} onChange={(d) => set("disposition", d)} rendus={rendus} supabase={supabase} onEnvoi={setEnvoiMedia} banqueGifs={banqueGifs} />
        </section>
      </div>

      {/* la barre de Personnaliser, collée en bas (au-dessus de la barre du téléphone) */}
      <div
        role="region"
        aria-label={PERSO.titre}
        className="fixed inset-x-3 z-40 mx-auto flex max-w-[720px] items-center gap-2 rounded-[18px] border border-line-2 bg-[var(--surface)] py-2 pl-4 pr-2 shadow-[var(--shadow-3)] bottom-[calc(90px+env(safe-area-inset-bottom,0px))] md:bottom-6"
      >
        <div className="min-w-0 flex-1">
          {statut ?? <p className="m-0 text-[13px] font-semibold">{PERSO.titre}</p>}
          <p className="t-micro m-0 truncate max-sm:hidden">{PERSO.regle}</p>
        </div>
        {modifie ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={annuler} disabled={pending}>
            {PERSO.annuler}
          </button>
        ) : (
          <Link href={`/people/${carte.id}`} className="btn btn-secondary btn-sm">
            {PERSO.terminer}
          </Link>
        )}
        {boutonEnregistrer}
      </div>

      <Feuille
        ouvert={zone !== null}
        onFermer={() => setZone(null)}
        titre={zone ? `${PERSO.titre} · ${PERSO.zones[zone]}` : PERSO.titre}
        apercu
        pied={
          <div className="flex flex-wrap items-center gap-3">
            {boutonEnregistrer}
            {statut}
          </div>
        }
      >
        <div className="pt-2">
          {(zone === "banniere" || zone === "sceau") && <Regle />}
          <div className="flex flex-col gap-6">
            {zone === "banniere" && <SectionBanniere b={b} gains={gains} onEnvoi={setEnvoiImage} />}
            {zone === "sceau" && <SectionCadre b={b} gains={gains} nom={carte.name} avatarUrl={carte.avatarUrl} />}
            {zone === "poses" && <SectionPoses gagnes={gagnes} pins={pins} setPins={puis(setPins)} base={base} />}
            {zone === "encre" && <SectionCouleur b={b} />}
            {zone === "identite" && (
              <>
                <SectionNom nom={nom} setNom={puis(setNom)} visibilite={nomVisibilite} setVisibilite={setNomVisibilite} />
                <SectionBio b={b} />
                <SectionLinkedin linkedin={linkedin} setLinkedin={puis(setLinkedin)} lienOk={lienOk} visibilite={visibilite} setVisibilite={setVisibilite} />
              </>
            )}
            {zone === "page" && (
              <>
                <SectionVitrine b={b} />
                <SectionAmbiance b={b} />
              </>
            )}
          </div>
        </div>
      </Feuille>
    </div>
  );
}
