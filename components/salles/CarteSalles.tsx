import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Bouton } from "@/components/classement/Encre";
import { FormCode } from "@/components/salles/FormCode";
import { Illustration } from "@/components/ui/Illustration";
import type { EntreeSalles } from "@/lib/salles/types";
import { SALLES } from "@/lib/voice-salles";
import a from "@/components/classement/Affronter.module.css";
import s from "./Salles.module.css";

// « Les Salles » sur S'affronter : à gauche l'aperçu des salles du moment, à droite la carte
// peinte, qui prend la majorité de la rangée. La peinture est claire : le texte y est sombre
// et sans voile, le bouton à gauche et le code à droite laissent les deux personnages
// visibles au centre. Sans la migration (migration_salles.sql), la carte peinte seule dit que
// les salles arrivent. Composant sans état ; `demo` (aperçus) coupe le champ de code.

function ApercuSalles({ apercu }: { apercu: NonNullable<EntreeSalles["apercu"]> }) {
  return (
    <section className={[a.carte, s.jetons, s.apercu].join(" ")} aria-label={SALLES.apercuTitre}>
      <p className={s.apercuTitre}>{SALLES.apercuTitre}</p>
      <p className={s.apercuCompte}>
        <b className="t-num">{apercu.total}</b> {SALLES.apercuOuvertes(apercu.total)}
      </p>
      <p className={s.apercuLigne}>{SALLES.apercuEnCours(apercu.enCours)}</p>
      {apercu.salles.length > 0 ? (
        <ul className={s.apercuListe}>
          {apercu.salles.map((x) => (
            <li key={x.id}>
              <Link href={x.mienne ? `/salles/${x.id}` : "/salles"}>
                <i className={[s.point, x.enCours ? s.pointVif : ""].filter(Boolean).join(" ")} aria-hidden />
                <b title={x.nom}>{x.nom}</b>
                <span>{SALLES.joueurs(x.nbMembres)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={s.apercuLigne}>{SALLES.apercuVide}</p>
      )}
    </section>
  );
}

export function CarteSalles({ salles, demo = false }: { salles?: EntreeSalles | null; demo?: boolean }) {
  const pret = Boolean(salles?.pret);
  const carte = (
    <section className={[a.carte, s.jetons, s.entree].join(" ")} aria-labelledby="cl-salles" data-salles={pret ? "pret" : "bientot"}>
      <div className={s.entreeFond} aria-hidden>
        <Illustration nom="salles-entree" position="50% 80%" decorative />
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
          <Bouton href="/salles">
            {SALLES.voirSalles} <ArrowRight size={17} aria-hidden />
          </Bouton>
          <FormCode id="cl-salles-code" demo={demo} surCarte />
        </div>
      )}
    </section>
  );
  if (!pret || !salles?.apercu) return carte;
  return (
    <div className={s.entreeRangee}>
      <ApercuSalles apercu={salles.apercu} />
      {carte}
    </div>
  );
}
