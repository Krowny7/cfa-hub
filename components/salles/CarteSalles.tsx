import { ArrowRight, Users } from "lucide-react";
import { Bouton } from "@/components/classement/Encre";
import { FormCode } from "@/components/salles/FormCode";
import { Illustration } from "@/components/ui/Illustration";
import type { EntreeSalles } from "@/lib/salles/types";
import { SALLES } from "@/lib/voice-salles";
import a from "@/components/classement/Affronter.module.css";
import s from "./Salles.module.css";

// La carte « Les Salles » de S'affronter, peinte comme ses voisines (la Grande
// Salle, les Duels) : la peinture, un voile léger qui garde les personnages
// visibles à droite, le sceau noir, le titre, le bouton vers /salles et le champ
// de code. Aucune liste ici : les salles ouvertes et « Tes salles » vivent sur
// /salles. Sans la migration (migration_salles.sql), une ligne dit que les salles
// arrivent et rien d'autre ne s'affiche. Composant sans état : la page serveur
// lui dit si les salles sont prêtes ; `demo` (aperçus) coupe le champ de code.

export function CarteSalles({ salles, demo = false }: { salles?: EntreeSalles | null; demo?: boolean }) {
  const pret = Boolean(salles?.pret);
  return (
    <section className={[a.carte, s.jetons, s.entree].join(" ")} aria-labelledby="cl-salles" data-salles={pret ? "pret" : "bientot"}>
      <div className={s.entreeFond} aria-hidden>
        {/* mock-grande-salle en attendant : Théo donnera l'illustration de cette carte */}
        <Illustration nom="mock-grande-salle" position="62% 30%" decorative />
      </div>
      <div className={s.entreeTexte}>
        <span className={a.sceauNoir} aria-hidden>
          <Users size={20} />
        </span>
        <h2 id="cl-salles" className="font-brand">
          {SALLES.titre}
        </h2>
        <p>{pret ? SALLES.sous : SALLES.bientot}</p>
      </div>
      {pret && (
        <div className={s.entreeActions}>
          <Bouton href="/salles" surPeinture>
            {SALLES.voirSalles} <ArrowRight size={17} aria-hidden />
          </Bouton>
          <FormCode id="cl-salles-code" demo={demo} surCarte />
        </div>
      )}
    </section>
  );
}
