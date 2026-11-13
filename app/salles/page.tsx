import { redirect } from "next/navigation";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { PortesSalles, type PorteSalle } from "@/components/salles/PortesSalles";
import { FormCode } from "@/components/salles/FormCode";
import { CreerReplie } from "@/components/salles/CreerReplie";
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

// Les Salles (direction « le lieu, puis l'objet », lot 4 du 2026-11-13) : la porte (retour à
// S'affronter, l'entrée du palais) avec en chiffre-héros les joueurs présents dans les salles et, quand
// c'est vrai, « EN DIRECT » en vert ; puis la rangée des portes (les tiennes d'abord, puis les salles
// publiques ouvertes), le moment écrit sur chacune (en direct, salon ouvert, personne) : un clic ouvre
// la salle (une salle publique où tu n'es pas encore s'offre à la rejoindre). Dessous, rejoindre avec un
// code et créer sa salle. /salles?code=K7MX2Q (le lien d'invitation, par /salles/rejoindre) pré-remplit
// le code : rien ne se joint tout seul (un lien ne fait pas d'action). Présentation seule : les lectures
// et la logique des salles ne changent pas. Sans la migration (migration_salles.sql), la page dit que
// les salles arrivent.
export default async function SallesPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const sp = await searchParams;
  const brut = (Array.isArray(sp.code) ? sp.code[0] : sp.code) ?? "";
  const lu = brut ? analyserCode(brut) : null;

  const [mes, publiques] = await Promise.all([getMesSalles(supabase), getSallesPubliques(supabase)]);
  const bientot = (!mes.ok && mes.migrationAbsente) || (!publiques.ok && publiques.migrationAbsente);

  // les portes : tes salles, puis les salles publiques où tu n'es pas encore ; en direct d'abord
  const miennes = mes.ok ? mes.data : [];
  const dejaLa = new Set(miennes.map((m) => m.id));
  const autres = publiques.ok ? publiques.data.filter((p) => !p.dejaMembre && !dejaLa.has(p.id)) : [];
  const vif = (p: PorteSalle) => (p.enCours ? 2 : p.presents > 0 ? 1 : 0);
  const portes: PorteSalle[] = [
    ...miennes.map((m) => ({ id: m.id, nom: m.nom, enCours: m.enCours, presents: m.nbPresents, aRejoindre: false })).sort((a, b) => vif(b) - vif(a)),
    ...autres.map((p) => ({ id: p.id, nom: p.nom, enCours: p.enCours, presents: p.nbPresents, aRejoindre: true })).sort((a, b) => vif(b) - vif(a)),
  ];
  const illisible = !mes.ok && !publiques.ok;
  const direct = portes.filter((p) => p.enCours).length;
  const presents = portes.reduce((n, p) => n + p.presents, 0);

  const entete = (
    <EnTeteSousPage
      retour={RETOUR_AFFRONTER}
      titre={SALLES.pageTitre}
      ligne={portes.length > 0 ? S.ligneEtat(miennes.length, autres.length) : S.ligne}
      illustration={{ nom: "salles-entree", position: "50% 82%" }}
      voile="fort"
      heros={presents > 0 ? { valeur: presents, legende: S.presents(presents) } : null}
      enjeu={direct > 0 ? S.enDirectN(direct) : null}
      enjeuTon="direct"
    />
  );

  if (bientot) {
    return (
      <SousPage entete={entete}>
        <p className="t-body m-0 max-w-[560px] text-muted">{SALLES.bientot}</p>
      </SousPage>
    );
  }

  return (
    <SousPage entete={entete}>
      {portes.length > 0 ? (
        <PortesSalles portes={portes} />
      ) : (
        <p className="t-body m-0 text-muted">{illisible ? SALLES.lectureImpossible : S.aucune}</p>
      )}
      {/* sous un filet, une seule ligne : à gauche le code et « Rejoindre » (contour), à droite
          « Créer une salle » (contour), qui déplie son formulaire en place ; la peau des Salles
          (jetons --sl-*) pour les deux formulaires */}
      <Stage>
        <div className={s.rejoindreCreer}>
          <div className="grid min-w-0 content-start gap-2" title={S.rejoindre}>
            {lu?.ok && <p className={s.info}>{SALLES.codeInvite}</p>}
            {lu && !lu.ok && <p className={s.erreur}>{lu.erreur}</p>}
            <FormCode id="salles-code-champ" initial={lu?.ok ? lu.code : brut} surCarte />
          </div>
          <CreerReplie />
        </div>
      </Stage>
    </SousPage>
  );
}
