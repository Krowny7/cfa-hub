import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { BrowserGroup, BrowserRow } from "@/components/ContentDetailHeader";
import { EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { MainQcm, type CarteMatiere, type SuiteCarte } from "@/components/qcm/Main";
import { codeMatiere, numeroPiece } from "@/components/entrainement/pieces";
import { nombre } from "@/lib/voice";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";

// /qcm (vue Système), direction « le lieu, puis l'objet » (2026-11-13) : la porte (la Bibliothèque,
// les réussites en chiffre-héros), puis l'objet : l'éventail des matières (components/qcm/Main). La
// carte levée montre ses QCM en pastilles (chacune ouvre son QCM) ; dessous, une seule action à
// l'encre : reprendre le QCM entamé de la matière (sinon ouvrir le suivant). La communauté et les
// séances chronométrées sur tes QCM (/session : 15 minutes, ou l'examen) restent à un clic, en haut à
// droite de la scène. Sans requête : app/qcm charge les données.

export type QcmEntree = { r: BrowserRow; g: BrowserGroup };

const S = SOUS_ENTRAINEMENT.qcm;
const intitule = (r: BrowserRow) => r.lead ?? r.main;

export function QcmAccueil({
  groups,
  recentes,
  initialKey,
}: {
  groups: BrowserGroup[];
  /** les QCM entamés et pas finis, le plus récent d'abord */
  recentes: QcmEntree[];
  /** la matière montrée (?subject=, sinon celle du QCM en cours) */
  initialKey: string | null;
}) {
  const cfa = groups.filter((g) => !g.key.startsWith("x-")).flatMap((g) => g.rows);
  const totalDone = cfa.reduce((n, r) => n + (r.done ?? 0), 0);
  const entames = cfa.filter((r) => (r.done ?? 0) > 0 && (r.count === null || (r.done ?? 0) < r.count)).length;

  // les cartes : les 10 matières (sans QCM : en filigrane), puis les autres rayons qui ont des QCM
  const rayons = groups.filter((g) => !g.key.startsWith("x-") || g.rows.length > 0);
  const cartes: CarteMatiere[] = rayons.map((g, i) => ({ cle: g.key, code: codeMatiere(g.key, g.name), numero: numeroPiece(i), nom: g.name, rows: g.rows }));
  const choisi = rayons.find((g) => g.key === initialKey) ?? rayons.find((g) => g.rows.length > 0) ?? null;
  const depart = Math.max(0, cartes.findIndex((c) => c.cle === choisi?.key));

  // l'action de la carte levée : le QCM entamé le plus récent de la matière, sinon le premier pas fini
  const suiteDe = (c: CarteMatiere): { r: BrowserRow; reprise: boolean } | null => {
    const recent = recentes.find((x) => x.g.key === c.cle);
    if (recent) return { r: recent.r, reprise: true };
    const entame = c.rows.find((r) => (r.done ?? 0) > 0 && (r.count === null || (r.done ?? 0) < r.count));
    if (entame) return { r: entame, reprise: true };
    const neuf = c.rows.find((r) => r.kind === "set" && !(r.count !== null && (r.done ?? 0) >= r.count)) ?? c.rows[0];
    return neuf ? { r: neuf, reprise: false } : null;
  };

  const suites: Record<string, SuiteCarte | null> = Object.fromEntries(
    cartes.map((c) => {
      const suite = suiteDe(c);
      return [c.cle, suite ? { href: `/qcm/${suite.r.id}`, texte: suite.reprise ? S.reprendreAction : S.ouvrirAction, compte: intitule(suite.r) } : null];
    }),
  );

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={RETOUR_ENTRAINEMENT}
          titre={S.titre}
          ligne={S.etat(entames, cfa.length)}
          heros={totalDone > 0 ? { valeur: nombre(totalDone), legende: S.heros } : null}
          illustration={{ nom: "qcm-bibliotheque", position: "50% 74%" }}
        />
      }
    >
      <Scene
        etiquette={S.main}
        droite={
          <span className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1">
            {/* les séances chronométrées sur tes QCM (l'ancien écran de /session) : 15 minutes, ou un examen */}
            <Link href="/session" className="ink-link inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-semibold">
              {S.chrono} <ArrowRight size={14} aria-hidden />
            </Link>
            <Link href="/session?mode=examen" className="ink-link inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-semibold">
              {S.examenQcm} <ArrowRight size={14} aria-hidden />
            </Link>
            <Link href="/qcm?view=community" className="ink-link inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-semibold">
              {S.communaute} <ArrowRight size={14} aria-hidden />
            </Link>
          </span>
        }
      >
        <MainQcm cartes={cartes} depart={depart} suites={suites} enCours={recentes[0]?.g.key ?? null} />
      </Scene>
    </SousPage>
  );
}
