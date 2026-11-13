import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ErrorsTab } from "@/components/moi/ErrorsSection";
import { MarqueesTab } from "@/components/moi/MarqueesTab";
import { CartesMarqueesTab } from "@/components/moi/CartesMarqueesTab";
import { SynchroMarquesCartes } from "@/components/flashcards/SynchroMarquesCartes";
import { RaturesTab } from "@/components/moi/RaturesTab";
import { Dossier, Filet, Releve, type CaseReleve } from "@/components/moi/Dossier";
import { ActionEncre, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { DOSSIER, REG, SOUS_MOI } from "@/lib/voice-moi";
import { nombre } from "@/lib/voice";
import { fmtAgo } from "@/components/classement/format";
import s from "./Dossier.module.css";
import type { MoiData } from "@/components/moi/types";

// Les pages de liste de Moi, gabarit « Dossier » (direction du 2026-11-13) : le carnet de ratures
// (?onglet=erreurs) et les marquées (?onglet=marquees). La porte (retour à Moi, titre, une ligne, la
// peinture) porte le chiffre-héros : les ratures en cours, ou les marquées montrées. Dessous, le
// dossier : pour le carnet, le relevé (rayées en 7 jours, qui sèchent, scellées) et l'action à l'encre
// vers /revoir (le carnet sert à consulter, /revoir à agir) ; puis la liste sous son filet, avec ses
// filtres, « Mettre au propre » et « Sans calcul » (RaturesTab). Composant de présentation.

/**
 * Moi › Marquées : « Questions · 113 | Flashcards · 4 », en haut de la liste (les flashcards
 * se perdaient sous une longue liste de questions). Des liens (?vue=…) : la page est rendue
 * côté serveur, l'adresse dit ce qu'on regarde. Un compte inconnu (lecture en repli) : sans chiffre.
 */
function SelecteurMarquees({ actif, questions, cartes }: { actif: "questions" | "flashcards"; questions: number | null; cartes: number | null }) {
  const T = REG.marquees;
  const choix = [
    { cle: "questions", libelle: T.selQuestions, n: questions },
    { cle: "flashcards", libelle: T.selFlashcards, n: cartes },
  ] as const;
  return (
    <nav aria-label={T.selecteur} className="flex flex-wrap gap-2">
      {choix.map((c) => (
        <Link
          key={c.cle}
          href={`/moi?onglet=marquees&vue=${c.cle}`}
          className={"chip min-h-[44px] px-4 text-[15px]" + (actif === c.cle ? " chip-active" : "")}
          aria-current={actif === c.cle ? "page" : undefined}
        >
          {c.libelle}
          {c.n !== null && <span className="font-mono text-[13px] tabular-nums opacity-80">· {nombre(c.n)}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function Registre({ d, liste, vue, now }: { d: MoiData; liste: "ratures" | "marquees"; vue?: "questions" | "flashcards"; now?: number }) {
  // les flashcards marquées (lues par la page sur cet onglet) : une vue à part, choisie par le
  // sélecteur ; sans choix, les questions, ou les flashcards s'il n'y a qu'elles
  const cartes = liste === "marquees" ? d.cartesMarquees : undefined;
  const nQuestions = d.marquees.available ? d.marquees.items.length : null;
  const nCartes = cartes?.available && !cartes.erreur ? cartes.items.length : null;
  const voirCartes = !!cartes && (vue === "flashcards" || (vue === undefined && nQuestions === 0 && (nCartes ?? 0) > 0));
  const selecteur = cartes ? <SelecteurMarquees actif={voirCartes ? "flashcards" : "questions"} questions={nQuestions} cartes={nCartes} /> : null;

  // la liste complète : le carnet de ratures (ses filtres, « Mettre au propre », ses lignes), l'ancien
  // carnet des fiches tant que la migration manque, les questions marquées, ou les flashcards marquées
  const corps =
    voirCartes && cartes ? (
      <CartesMarqueesTab cartes={cartes} sansTitre />
    ) : liste === "ratures" ? (
      d.ratures.available ? (
        <RaturesTab initial={d.ratures} notions={d.ratures.parNotion} now={now} sansResume />
      ) : (
        <ErrorsTab errors={d.errors} now={now} />
      )
    ) : (
      <MarqueesTab marquees={d.marquees} cartes={cartes ? { available: cartes.available, n: cartes.items.length, erreur: cartes.erreur } : undefined} compact now={now} />
    );

  // le relevé du carnet : ce qui a bougé (rayées en 7 jours), ce qui sèche, ce qui tient (scellées) ; rien de nul
  const r = liste === "ratures" && d.ratures.available ? d.ratures : null;
  const cases: (CaseReleve | null)[] = r
    ? [
        r.retireesSemaine > 0 ? { valeur: nombre(r.retireesSemaine), legende: DOSSIER.ratures.semaine } : null,
        r.sechent ? { valeur: nombre(r.sechent), legende: DOSSIER.ratures.sechent } : null,
        r.scellees ? { valeur: nombre(r.scellees), legende: DOSSIER.ratures.scellees } : null,
        !r.scellees && r.retirees > 0 ? { valeur: nombre(r.retirees), legende: DOSSIER.ratures.anciennes } : null,
      ]
    : [];
  const releve = cases.filter((x): x is CaseReleve => x !== null);
  // le carnet vidé : le moment de gloire (« CARNET PROPRE »), les scellées (ou anciennes) en héros
  const propre = !!r && r.total === 0 && (r.scellees || r.retirees) > 0;
  // « Reprendre mes ratures » : seulement si /revoir en a à montrer (pas toutes encore à sécher)
  const agir = !!r && r.total > 0 && !(r.sechent !== undefined && r.sechent >= r.total);

  // le chiffre-héros : la liste montrée ; inconnu (lecture en repli) ou nul : pas de chiffre
  const n = liste === "ratures" ? (d.ratures.available ? d.ratures.total : null) : voirCartes ? nCartes : nQuestions;
  const heros = n
    ? { valeur: nombre(n), legende: liste === "ratures" ? DOSSIER.ratures.heros : voirCartes ? DOSSIER.marquees.herosCartes(n) : DOSSIER.marquees.herosQuestions(n) }
    : propre && r
      ? { valeur: nombre(r.scellees || r.retirees), legende: r.scellees ? DOSSIER.ratures.scellees : DOSSIER.ratures.anciennes }
      : null;

  // la ligne d'état (un état, pas une consigne) : la dernière rature ; les matières des marquées et la dernière marquée
  const derniereRature = r && r.total > 0 ? r.items.find((it) => it.removedAt === null)?.lastMissedAt : undefined;
  const marquees = d.marquees.available ? d.marquees.items : [];
  const derniereMarque = marquees.reduce<string | null>((m, it) => (m === null || it.flaggedAt > m ? it.flaggedAt : m), null);
  const ligne =
    liste === "ratures"
      ? derniereRature
        ? DOSSIER.ratures.ligne(fmtAgo(derniereRature, now))
        : propre
          ? DOSSIER.ratures.lignePropre
          : undefined
      : !voirCartes && derniereMarque
        ? DOSSIER.marquees.ligne(new Set(marquees.map((it) => it.rubrique)).size, fmtAgo(derniereMarque, now))
        : undefined;

  const entete =
    liste === "ratures" ? (
      <EnTeteSousPage retour={SOUS_MOI.retour} titre={SOUS_MOI.ratures.titre} ligne={ligne} illustration={{ nom: "moi-carnet", porte: "50% 80%" }} heros={heros} />
    ) : (
      <EnTeteSousPage retour={SOUS_MOI.retour} titre={REG.marquees.kickerTout} ligne={ligne} illustration={{ nom: "moi-marquees", position: "50% 30%", porte: "40% 74%" }} heros={heros} />
    );

  return (
    <SousPage entete={entete}>
      <Dossier plat={liste === "marquees"}>
        {r && (releve.length > 0 || propre) && (
          <Filet etiquette={DOSSIER.ratures.releve}>
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
              {releve.length > 0 ? <Releve items={releve} /> : <span />}
              {agir ? (
                <ActionEncre href="/revoir" label={DOSSIER.ratures.agirAria}>
                  {DOSSIER.ratures.agir} <ArrowRight size={16} aria-hidden />
                </ActionEncre>
              ) : propre ? (
                <p className={s.tampon}>{DOSSIER.ratures.tampon}</p>
              ) : null}
            </div>
          </Filet>
        )}
        <Filet etiquette={liste === "ratures" ? DOSSIER.ratures.carnet : DOSSIER.marquees.liste}>
          <div id="liste" className="flex min-w-0 scroll-mt-24 flex-col gap-4">
            {selecteur}
            {corps}
            {/* les flashcards gardées sur l'appareil qui rejoignent le compte : la page se relit une fois */}
            {cartes && <SynchroMarquesCartes />}
          </div>
        </Filet>
      </Dossier>
    </SousPage>
  );
}
