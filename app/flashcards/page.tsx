import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUBJECTS } from "@/components/reviser/catalog";
import { pad2 } from "@/components/reviser/rail";
import { flashcardGroups } from "@/components/FlashcardSubjectGrid";
import { subjectFromParam } from "@/components/ContentDetailHeader";
import { ChiffreProgramme, LigneProgramme, TableCartes } from "@/components/flashcards/TableCartes";
import type { Piece } from "@/components/ui/Presentoir";
import { EnTeteSousPage, Scene, SousPage } from "@/components/ui/SousPage";
import { avanceMatiere, clesAvances, suiviProgramme, type AvancesProgramme } from "@/lib/flashcards/avancement";
import { lireProgressions } from "@/lib/flashcards/progression-serveur";
import { PARTIE_ENTREE } from "@/lib/voice-partie";
import { LIEUX, RETOUR, RV } from "@/lib/voice-reviser";
import { TABLE_CARTES } from "@/lib/voice-postes";

type SearchParams = { view?: string; subject?: string };
type PageProps = { searchParams?: Promise<SearchParams> };
type SetRow = { id: string; title: string; visibility: string | null; library_folders?: { name: string | null } | null };

// Les flashcards (Réviser A, « le lieu, puis l'objet », 2026-11-13 ; disposition de Théo du
// 2026-11-12 gardée) : la porte (retour à Réviser, peinture du casier, chiffre-héros des cartes vues,
// la ligne d'état du programme), puis UNE scène : le carrousel des 10 paquets et Léonard le croupier
// sur la même ligne de sol (TableCartes). Sur le paquet de devant, ses cartes vues en Mono ; un clic
// ouvre la grille de sa matière (/flashcards/matiere/<clé>). Le tapis de Léonard lance la partie de
// cartes (la matière passée en ?subject= cochée d'avance, et le carrousel ouvert sur elle). Les
// cartes vues : les boucles du compte (flashcard_progress, une requête), puis l'appareil après le
// montage ; sans la table, ni chiffre ni mention (la ligne du lieu à la place).
export default async function FlashcardsPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};

  // L'ancienne vue Communauté (?view=community&scope=…&q=…) n'existe plus :
  // retour propre sur les paquets officiels, la matière gardée si elle est donnée.
  if (sp.view === "community") redirect(sp.subject ? `/flashcards?subject=${encodeURIComponent(sp.subject)}` : "/flashcards");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  // les paquets officiels, rangés par matière, et le nombre de cartes de chacun (repli : 15)
  let system: SetRow[] = [];
  const counts: Record<string, number> = {};
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("flashcard_sets")
      .select("id,title,visibility,library_folders(name),flashcards(count)")
      .eq("is_official", true)
      .eq("official_published", true)
      .limit(200);
    for (const r of (data ?? []) as unknown as (SetRow & { flashcards?: { count: number }[] | null })[]) {
      const n = r.flashcards?.[0]?.count;
      if (typeof n === "number") counts[r.id] = n;
      system.push({ id: r.id, title: r.title, visibility: r.visibility, library_folders: Array.isArray(r.library_folders) ? r.library_folders[0] : r.library_folders });
    }
  } catch {
    system = [];
  }
  const groups = flashcardGroups(system, counts);
  const progressions = await lireProgressions(supabase, user.id, clesAvances(groups));
  const avances: AvancesProgramme | null = progressions ? suiviProgramme(groups, progressions, user.id) : null;
  const avecPaquets = new Set(groups.filter((g) => g.rows.some((r) => r.kind === "set")).map((g) => g.key));

  const l = LIEUX.cartes;
  const pieces: Piece[] = SUBJECTS.map((x, i) => ({
    cle: x.key,
    href: avecPaquets.has(x.key) ? `/flashcards/matiere/${x.key}` : null,
    numero: pad2(i + 1),
    code: x.code,
    titre: x.name,
  }));

  // la partie de cartes : la matière passée en paramètre est cochée d'avance, et le carrousel s'ouvre sur elle
  const matierePartie = subjectFromParam(sp.subject);
  const hrefPartie = matierePartie ? `/flashcards/partie?matiere=${encodeURIComponent(matierePartie.key)}` : "/flashcards/partie";
  const total = avances ? Object.values(avances.matieres).reduce((n, m) => n + m.total, 0) : 0;

  // ce que dit le compte (côté serveur) : les cartes vues de chaque matière. Il décide du chiffre-héros
  // (seulement s'il y a au moins une carte vue : jamais un héros à zéro) et de la carte de devant :
  // la matière passée en ?subject=, sinon la première entamée pas finie, sinon la première neuve.
  const compte = avances
    ? pieces.flatMap((x) => {
        const m = avances.matieres[x.cle] ?? Object.values(avances.matieres).find((y) => y.cle === x.cle);
        return m ? [{ cle: x.cle, ...avanceMatiere(m, user.id) }] : [];
      })
    : [];
  const vuesCompte = compte.reduce((n, m) => n + m.vues, 0);
  const enCours = compte.find((m) => m.vues > 0 && m.vues < m.total) ?? compte.find((m) => m.vues === 0 && m.total > 0);
  const cleDevant = matierePartie?.key ?? enCours?.cle;
  const depart = Math.max(0, pieces.findIndex((x) => x.cle === cleDevant));

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={RETOUR.reviser}
          titre={l.titre}
          ligne={avances && total && vuesCompte > 0 ? <LigneProgramme avances={avances} /> : l.desc}
          illustration={{ nom: l.illustration, position: l.position }}
          heros={avances && total && vuesCompte > 0 ? { valeur: <ChiffreProgramme avances={avances} />, legende: TABLE_CARTES.herosLegende(total) } : null}
        />
      }
    >
      <Scene>
        <TableCartes
          pieces={pieces}
          depart={depart}
          avances={avances}
          hrefPartie={hrefPartie}
          aidePartie={matierePartie ? PARTIE_ENTREE.ligneMatiere(matierePartie.name) : PARTIE_ENTREE.aide}
          action={RV.cartesOuvrir}
        />
      </Scene>
    </SousPage>
  );
}
