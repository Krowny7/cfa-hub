import type { Plan as PlanDate } from "@/lib/codex/plan";
import r from "./Rythme.module.css";

// Le plan daté (V3 §10.2), en tête du cap : « à l'heure », « 5 jours
// d'avance » ou « 9 jours de retard » d'après le dernier jalon échu, une frise
// de six points (J-120 à J-10) et, à la demande, le détail des jalons.

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const dateCourte = (jour: string) => DATE.format(new Date(jour + "T12:00:00Z"));

type Props = { plan: PlanDate; jour: string };

export function Plan({ plan, jour }: Props) {
  const etat = (j: PlanDate["jalons"][number]) => (j.fait ? "fait" : j.date <= jour ? "echu" : "avenir");
  return (
    <section className={r.plan} aria-label="Le plan daté">
      <p className={r.planTete}>
        <span>Le plan :</span>
        <strong className={r.ecart}>{plan.libelle}</strong>
        {plan.prochain && (
          <span>
            · prochain jalon le {dateCourte(plan.prochain.date)} : {plan.prochain.titre.charAt(0).toLowerCase() + plan.prochain.titre.slice(1)}
          </span>
        )}
      </p>
      <ol className={r.frise} aria-hidden>
        {plan.jalons.map((j) => (
          <li key={j.j} className={r.jalon} data-etat={etat(j)} title={`${j.titre} · ${dateCourte(j.date)}`}>
            <span className={r.point} />
            <span className={r.jalonJ}>J-{j.j}</span>
          </li>
        ))}
      </ol>
      <details className={r.detail}>
        <summary>Les jalons</summary>
        <ul className={r.jalons}>
          {plan.jalons.map((j) => (
            <li key={j.j}>
              {j.titre} <span>· J-{j.j}, le {dateCourte(j.date)} · {j.fait ? (j.atteint ? `fait le ${dateCourte(j.atteint)}` : "fait") : j.date <= jour ? "à reprendre" : "à venir"}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
