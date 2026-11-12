import { SubjectBrowser } from "@/components/ContentFolderBlocks";
import type { BrowserGroup, BrowserRow } from "@/components/ContentDetailHeader";
import { Carrousel } from "@/components/ui/Carrousel";
import type { Piece } from "@/components/ui/Presentoir";
import { Chiffre, ListeCourte } from "@/components/ui/Decors";
import { CadreAnnexe, CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { codeMatiere, numeroPiece } from "@/components/entrainement/pieces";
import { nombre } from "@/lib/voice";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";

// /qcm (vue Système), sur le modèle des sous-pages validé par Théo (2026-11-12) : l'en-tête commun
// (la Bibliothèque à droite), puis le cadre à zones : les matières en livres sur le carrousel à
// gauche (le livre de devant ouvre ses QCM, juste dessous ; le dernier livre mène à la
// communauté), les QCM à reprendre dans la colonne grise. Dessous, la seule annexe : les QCM de la
// matière choisie (on les choisit là). Sans requête : app/qcm charge les données.

export type QcmEntree = { r: BrowserRow; g: BrowserGroup };

const S = SOUS_ENTRAINEMENT.qcm;
const intitule = (x: QcmEntree) => `${x.r.lead ? `${x.r.lead} · ` : ""}${x.r.main}`;

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
  const totalCount = cfa.reduce((n, r) => n + (r.count ?? 0), 0);
  const totalDone = cfa.reduce((n, r) => n + (r.done ?? 0), 0);

  // les livres : les 10 matières (sans QCM : en filigrane), les autres rayons, puis la communauté
  const rayons = groups.filter((g) => !g.key.startsWith("x-") || g.rows.length > 0);
  const pieces: Piece[] = [
    ...rayons.map((g, i) => ({
      cle: g.key,
      href: g.rows.length ? `/qcm?subject=${encodeURIComponent(g.key)}#matieres` : null,
      numero: numeroPiece(i),
      code: codeMatiere(g.key, g.name),
      titre: g.name,
    })),
    { cle: "communaute", href: "/qcm?view=community", numero: numeroPiece(rayons.length), code: "COM", titre: S.communaute },
  ];
  const choisi = rayons.find((g) => g.key === initialKey) ?? rayons.find((g) => g.rows.length > 0) ?? null;
  const depart = Math.max(0, pieces.findIndex((p) => p.cle === choisi?.key));

  const aReprendre = recentes.slice(0, 3).map((x) => ({ cle: x.r.id, titre: intitule(x), detail: S.reussies(x.r.done ?? 0, x.r.count), href: `/qcm/${x.r.id}` }));
  const droite =
    aReprendre.length > 0
      ? { titre: S.reprendre, contenu: <ListeCourte lignes={aReprendre} /> }
      : totalCount > 0
        ? { titre: S.reprendre, contenu: <Chiffre valeur={nombre(totalDone)} legende={S.legendeTotal(totalCount)} /> }
        : undefined;

  return (
    <SousPage
      entete={<EnTeteSousPage retour={RETOUR_ENTRAINEMENT} titre={S.titre} ligne={S.ligne} illustration={{ nom: "qcm-bibliotheque", position: "50% 55%" }} />}
    >
      <CadreZones gauche={{ titre: S.choisir, contenu: <Carrousel forme="livre" pieces={pieces} action={S.ouvrir} depart={depart} /> }} droite={droite} />
      {choisi && (
        <CadreAnnexe id="matieres" titre={S.lesQcm(choisi.name)}>
          <SubjectBrowser
            groups={[choisi]}
            basePath="/qcm"
            unit={["question", "questions"]}
            setUnit={["QCM", "QCM"]}
            setLabel="QCM"
            drillLabel="Quiz des fiches"
            progressLabel="réussies"
            emptyLabel="Les QCM de cette matière arrivent bientôt."
          />
        </CadreAnnexe>
      )}
    </SousPage>
  );
}
