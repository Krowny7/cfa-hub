"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CasFsa } from "@/lib/cas-fsa/types";
import { CAS } from "@/lib/voice-cas-fsa";
import { majAvancement, useAvancement, viderAvancement, type Issue } from "./avancement";
import { Etats } from "./Etats";
import { Onglets } from "./Onglets";
import { Question } from "./Question";
import s from "./CasFsa.module.css";

// Un cas pratique : à gauche le dossier (les états, toujours consultables), à droite les
// questions une par une. Au téléphone, les deux vues se partagent l'écran et un segment passe
// de l'une à l'autre sans perdre la réponse en cours. Le rang de la question, les issues et le
// tuto se gardent dans le navigateur (./avancement).

type Vue = "question" | "etats";

const VUES: { cle: Vue; nom: string }[] = [
  { cle: "question", nom: CAS.vueQuestion },
  { cle: "etats", nom: CAS.vueEtats },
];

export function CasPratique({ cas }: { cas: CasFsa }) {
  const a = useAvancement(cas.id);
  const [vue, setVue] = useState<Vue>("question");
  const haut = useRef<HTMLDivElement | null>(null);

  const n = cas.etapes.length;
  const ici = Math.min(a.ici, n);
  const etape = ici < n ? cas.etapes[ici] : null;
  const justes = cas.etapes.filter((e) => a.etapes[e.id] === "juste").length;
  const revelees = cas.etapes.filter((e) => a.etapes[e.id] === "revelee").length;
  const toutFait = justes + revelees === n;

  function aller(i: number) {
    majAvancement(cas.id, (x) => ({ ...x, ici: i }));
    // la question suivante commence en haut, sans bouger la page si ce haut est déjà visible
    const el = haut.current;
    if (el && el.getBoundingClientRect().top < 72) el.scrollIntoView({ block: "start" });
  }

  /** La prochaine question à faire : après celle-ci d'abord, puis depuis le début ; sinon le bilan. */
  function suivante() {
    const faite = (id: string) => Boolean(a.etapes[id]);
    const apres = cas.etapes.findIndex((e, i) => i > ici && !faite(e.id));
    const avant = cas.etapes.findIndex((e) => !faite(e.id));
    aller(apres >= 0 ? apres : avant >= 0 ? avant : n);
  }

  function terminer(id: string, issue: Issue) {
    majAvancement(cas.id, (x) => ({ ...x, etapes: { ...x.etapes, [id]: issue } }));
  }

  return (
    <div className={s.page}>
      <header className={s.enTete}>
        <Link href="/cas-pratiques" className={s.retour}>
          <ArrowLeft size={15} aria-hidden /> {CAS.retour}
        </Link>
        <h1 className={"font-brand " + s.titreCas}>{cas.societe}</h1>
        <p className={s.exercice}>
          {cas.exercice}
          <span className={s.referentiel}>{cas.referentiel}</span>
        </p>
      </header>

      <Onglets onglets={VUES} actif={vue} onChange={setVue} libelle={CAS.vuesLibelle} className={s.vues} />

      <div className={s.dossier} data-vue={vue}>
        <Etats cas={cas} />

        <div ref={haut} className={s.questions}>
          <ol className={s.rail} aria-label={CAS.railLibelle}>
            {cas.etapes.map((e, i) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={s.pas}
                  data-issue={a.etapes[e.id]}
                  aria-current={i === ici ? "step" : undefined}
                  aria-label={CAS.pas(i + 1, e.notion, a.etapes[e.id])}
                  title={e.notion}
                  onClick={() => aller(i)}
                >
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>

          {etape ? (
            <section className={s.feuille} aria-label={CAS.questionN(ici + 1, n)}>
              <div className={s.feuilleTete}>
                <div className={s.reperes}>
                  <p className={s.numero}>{CAS.questionN(ici + 1, n)}</p>
                  <h2 className={"font-brand " + s.notion} lang="en">
                    {etape.notion}
                  </h2>
                </div>
                <button type="button" role="switch" aria-checked={a.tuto} className={s.tuto} onClick={() => majAvancement(cas.id, (x) => ({ ...x, tuto: !x.tuto }))}>
                  <span aria-hidden className={"switch" + (a.tuto ? " is-on" : "")} />
                  {CAS.tuto}
                </button>
              </div>
              <Question
                key={etape.id}
                etape={etape}
                issue={a.etapes[etape.id]}
                tuto={a.tuto}
                onTermine={(issue) => terminer(etape.id, issue)}
                onSuivante={suivante}
                suivante={toutFait ? CAS.voirBilan : CAS.suivante}
              />
            </section>
          ) : (
            <section className={s.feuille} aria-label={CAS.termine}>
              <h2 className={"font-brand " + s.bilanTitre}>{CAS.termine}</h2>
              <p className={s.bilan}>{CAS.bilan(justes, revelees)}</p>
              <button type="button" className="btn btn-secondary rl-press w-fit" onClick={() => viderAvancement(cas.id)}>
                {CAS.recommencer}
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
