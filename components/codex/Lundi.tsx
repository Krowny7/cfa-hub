"use client";

import { useState, useTransition } from "react";
import { codexChoisirSemaine } from "@/lib/codex/actions";
import type { Commande } from "@/lib/codex/catalogue";
import type { VueLundi } from "@/lib/codex/rythme";
import type { VueCodex } from "@/lib/codex/vue";
import { CODEX } from "@/lib/voice-codex";
import k from "./Calendrier.module.css";
import r from "./Rythme.module.css";

// Le lundi (V3 §10.3), ou la première visite de la semaine : Léonard relit
// la semaine passée, toujours en positif, puis le joueur choisit sa cible
// (3, 4 ou 5 jours d'encre) et une commande. Le choix tient jusqu'à dimanche
// (codexChoisirSemaine) ; « Plus tard » replie la carte pour cette visite,
// et la semaine garde ses contrats habituels tant que rien n'est choisi.
// `demo` : aperçus (rien n'est gardé).

type Props = { lundi: VueLundi; demo?: boolean; onVue?: (v: VueCodex) => void };

const jours = (n: number) => `${n} jour${n > 1 ? "s" : ""}`;

export function Lundi({ lundi, demo = false, onVue }: Props) {
  const [cible, setCible] = useState(4);
  const [commande, setCommande] = useState<Commande | null>(null);
  const [replie, setReplie] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [occupe, demarrer] = useTransition();
  if (replie) return null;

  const choisir = () =>
    demarrer(async () => {
      if (!commande) return;
      setMessage(null);
      if (demo) return setReplie(true);
      const res = await codexChoisirSemaine(cible, commande).catch(() => null);
      if (res?.ok) onVue?.(res.vue);
      else setMessage("Ton choix n'a pas pu être gardé pour l'instant. Réessaie dans un instant.");
    });

  return (
    <section className={`card-quiet ${k.carte}`} aria-labelledby="lundi-titre">
      <p className={`t-micro ${k.sur}`}>La semaine qui commence</p>
      <h2 id="lundi-titre" className={`font-brand ${k.titre}`}>
        Léonard relit ta semaine
      </h2>
      <div className={r.relue}>
        <p>
          {lundi.questions > 0
            ? `La semaine dernière : ${lundi.questions} questions${lundi.joursEncre > 0 ? ` et ${jours(lundi.joursEncre)} d'encre` : ""}.`
            : "Une semaine au repos : le carnet t'attendait, il n'a rien oublié."}
        </p>
        {lundi.montee && (
          <p>
            {lundi.montee.nom} a le plus monté depuis tes débuts : +{lundi.montee.points} points.
          </p>
        )}
        {lundi.pale && <p>{lundi.pale.nom} pâlit un peu : une séance cette semaine lui rendra ses couleurs.</p>}
      </div>

      <fieldset className={r.choix}>
        <legend>{CODEX.lundi.cible}</legend>
        <div className={r.cibles}>
          {lundi.cibles.map((n) => (
            <button key={n} type="button" className={`${r.pastille} rl-press`} aria-pressed={cible === n} onClick={() => setCible(n)}>
              {jours(n)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={r.choix}>
        <legend>{CODEX.lundi.titre}</legend>
        <div className={r.commandes}>
          {lundi.commandes.map((c) => (
            <button key={c.id} type="button" className={`${r.commande} rl-press`} aria-pressed={commande === c.id} onClick={() => setCommande(c.id)}>
              <span className={r.commandeNom}>{c.nom}</span>
              <span className={r.commandeResume}>{c.resume}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className={k.actions}>
        <button type="button" className="btn btn-primary rl-press" onClick={choisir} disabled={!commande || occupe}>
          C&apos;est ma semaine
        </button>
        <button type="button" className="btn rl-press" onClick={() => setReplie(true)}>
          Plus tard
        </button>
      </div>
      {message && (
        <p role="status" className="t-small m-0">
          {message}
        </p>
      )}
    </section>
  );
}
