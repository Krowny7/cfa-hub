import { redirect } from "next/navigation";
import { Carrousel } from "@/components/ui/Carrousel";
import type { Piece } from "@/components/ui/Presentoir";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { FormCode } from "@/components/salles/FormCode";
import { FormCreer } from "@/components/salles/FormCreer";
import { Stage } from "@/components/salles/Stage";
import { getMesSalles, getSallesPubliques } from "@/lib/salles/api";
import { analyserCode } from "@/lib/salles/logique";
import { createClient } from "@/lib/supabase/server";
import { SALLES } from "@/lib/voice-salles";
import { RETOUR_AFFRONTER, SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";
import s from "@/components/salles/Salles.module.css";

export const metadata = { title: "Salles · Ranked Lobby" };

type PageProps = { searchParams: Promise<{ code?: string | string[] }> };

const S = SOUS_AFFRONTER.salles;

// Les Salles, sur le modèle des sous-pages validé par Théo (2026-11-12) : l'en-tête commun (retour à
// S'affronter, l'entrée du palais), puis le cadre à zones. À gauche, les salles en carrousel de portes
// (les tiennes d'abord, puis les salles publiques ouvertes) : un clic sur la porte de devant ouvre la
// salle (une salle publique où tu n'es pas encore s'offre à la rejoindre). Dans la colonne grise,
// rejoindre avec un code et créer sa salle. /salles?code=K7MX2Q (le lien d'invitation, par
// /salles/rejoindre) pré-remplit le code : rien ne se joint tout seul (un lien ne fait pas d'action).
// Sans la migration (migration_salles.sql), la page dit que les salles arrivent.
export default async function SallesPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const sp = await searchParams;
  const brut = (Array.isArray(sp.code) ? sp.code[0] : sp.code) ?? "";
  const lu = brut ? analyserCode(brut) : null;

  const [mes, publiques] = await Promise.all([getMesSalles(supabase), getSallesPubliques(supabase)]);
  const bientot = (!mes.ok && mes.migrationAbsente) || (!publiques.ok && publiques.migrationAbsente);

  const entete = (
    <EnTeteSousPage retour={RETOUR_AFFRONTER} titre={SALLES.pageTitre} ligne={S.ligne} illustration={{ nom: "salles-entree", position: "50% 55%" }} />
  );

  if (bientot) {
    return (
      <SousPage entete={entete}>
        <CadreZones gauche={{ titre: SALLES.titre, contenu: <p className="t-body m-0 max-w-[560px] text-muted">{SALLES.bientot}</p> }} />
      </SousPage>
    );
  }

  // les portes : tes salles, puis les salles publiques où tu n'es pas encore
  const miennes = mes.ok ? mes.data : [];
  const dejaLa = new Set(miennes.map((m) => m.id));
  const autres = publiques.ok ? publiques.data.filter((p) => !p.dejaMembre && !dejaLa.has(p.id)) : [];
  const salles = [...miennes.map((m) => ({ id: m.id, nom: m.nom })), ...autres.map((p) => ({ id: p.id, nom: p.nom }))];
  const pieces: Piece[] = salles.map((x, i) => ({
    cle: x.id,
    href: `/salles/${x.id}`,
    numero: String(i + 1).padStart(2, "0"),
    // sur la porte, l'initiale du nom ; dessous, le nom en entier
    code: x.nom.trim().charAt(0).toUpperCase() || "?",
    titre: x.nom,
  }));
  const illisible = !mes.ok && !publiques.ok;

  return (
    <SousPage entete={entete}>
      <CadreZones
        gauche={{
          titre: S.choisir,
          contenu:
            pieces.length > 0 ? (
              <Carrousel forme="porte" pieces={pieces} action={S.ouvrir} />
            ) : (
              <p className="t-small m-0">{illisible ? SALLES.lectureImpossible : S.aucune}</p>
            ),
        }}
        droite={{
          titre: S.rejoindreOuCreer,
          contenu: (
            // la peau des Salles (jetons --sl-*) pour les deux formulaires ; le code au bouton à contour,
            // « Créer la salle » seul à l'encre (jamais deux encres dans la même colonne)
            <Stage>
              <div className="grid gap-2">
                <p className={s.libelle} aria-hidden>
                  {SALLES.codeLabel}
                </p>
                {lu?.ok && <p className={s.info}>{SALLES.codeInvite}</p>}
                {lu && !lu.ok && <p className={s.erreur}>{lu.erreur}</p>}
                <FormCode id="salles-code-champ" initial={lu?.ok ? lu.code : brut} surCarte />
              </div>
              <FormCreer />
            </Stage>
          ),
        }}
      />
    </SousPage>
  );
}
