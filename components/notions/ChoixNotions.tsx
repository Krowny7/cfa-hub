"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { lireNotionsATravailler, lireNotionsDisponibles, matieresDuChoix, plat, questionsDuChoix, type ChoixNotionsValeur, type NotionATravailler, type NotionDispo, type SourceNotions } from "@/lib/notions-choix";
import { TOPIC_LABELS, TOPICS } from "@/lib/practiceTopics";
import { createClient } from "@/lib/supabase/browser";
import { NOTIONS_CHOIX as V } from "@/lib/voice-notions";
import s from "./ChoixNotions.module.css";

// Le choix par notion : les notions de chaque matière, leurs concepts, et un badge sur celles qui
// sont à travailler. Les libellés (lib/notions.ts, un gros fichier) ne se chargent qu'à l'ouverture.

export type InfoChoix = { topics: string[]; total: number };

type Libelles = Map<string, string>;

function Case({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={s.case} data-on={on ? "1" : undefined}>
      {on && <Check size={12} strokeWidth={3} />}
    </span>
  );
}

export function ChoixNotions({
  source,
  valeur,
  onChange,
  salleId,
  demo,
}: {
  source: SourceNotions;
  valeur: ChoixNotionsValeur;
  onChange: (v: ChoixNotionsValeur, info: InfoChoix) => void;
  /** dans une Salle : le badge compte les joueurs présents */
  salleId?: string;
  /** aperçus et tests : des données d'exemple, sans lecture */
  demo?: { dispo: NotionDispo[]; faibles: NotionATravailler[] };
}) {
  const [dispo, setDispo] = useState<NotionDispo[] | null>(null);
  const [faibles, setFaibles] = useState<NotionATravailler[]>([]);
  const [noms, setNoms] = useState<Libelles>(new Map());
  const [erreur, setErreur] = useState(false);
  const [cherche, setCherche] = useState("");
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());
  const [matieres, setMatieres] = useState<Set<string>>(new Set());
  const client = useRef(createClient());

  useEffect(() => {
    let fini = false;
    setDispo(null);
    setErreur(false);
    Promise.all([demo ? demo.dispo : lireNotionsDisponibles(client.current, source), demo ? demo.faibles : lireNotionsATravailler(client.current, salleId), import("@/lib/notions")])
      .then(([d, f, lib]) => {
        if (fini) return;
        setNoms(new Map(lib.NOTIONS.map((n) => [n.id, n.court])));
        setFaibles(f);
        setDispo(d);
      })
      .catch(() => !fini && setErreur(true));
    return () => {
      fini = true;
    };
  }, [source, salleId, demo]);

  const parNotion = useMemo(() => new Map(faibles.map((f) => [f.notion, f.joueurs])), [faibles]);
  const notions = useMemo(() => new Set(valeur.notions), [valeur.notions]);
  const concepts = useMemo(() => new Set(valeur.concepts), [valeur.concepts]);
  const nom = (id: string) => noms.get(id) ?? id;

  const envoyer = (v: ChoixNotionsValeur) => onChange(v, { topics: matieresDuChoix(v, dispo ?? []), total: questionsDuChoix(v, dispo ?? []) });

  function basculerNotion(n: NotionDispo) {
    const suivant = new Set(notions);
    if (suivant.has(n.notion)) suivant.delete(n.notion);
    else suivant.add(n.notion);
    // la notion entière remplace ses concepts cochés un à un
    const dedans = new Set(n.concepts.map((c) => c.concept));
    envoyer({ notions: [...suivant], concepts: valeur.concepts.filter((c) => !dedans.has(c)) });
  }
  function basculerConcept(c: string) {
    const suivant = new Set(concepts);
    if (suivant.has(c)) suivant.delete(c);
    else suivant.add(c);
    envoyer({ notions: valeur.notions, concepts: [...suivant] });
  }
  const basculer = (set: Set<string>, cle: string) => {
    const n = new Set(set);
    if (n.has(cle)) n.delete(cle);
    else n.add(cle);
    return n;
  };

  const q = plat(cherche.trim());
  const garde = (n: NotionDispo) => !q || plat(nom(n.notion)).includes(q) || n.concepts.some((c) => plat(c.concept).includes(q));

  const ligne = (n: NotionDispo) => {
    const on = notions.has(n.notion);
    const joueurs = parNotion.get(n.notion);
    const visibles = q && !plat(nom(n.notion)).includes(q) ? n.concepts.filter((c) => plat(c.concept).includes(q)) : n.concepts;
    const ouverte = ouvertes.has(n.notion) || (q.length > 0 && visibles.length > 0);
    const cochees = n.concepts.filter((c) => concepts.has(c.concept)).length;
    return (
      <li key={n.notion}>
        <div className={s.ligne}>
          <button type="button" className={s.notion} aria-pressed={on} onClick={() => basculerNotion(n)}>
            <Case on={on} />
            <span className={s.nom}>{nom(n.notion)}</span>
            {joueurs !== undefined && <span className={s.badge}>{salleId ? V.aTravaillerSalle(joueurs) : V.aTravailler}</span>}
            <span className={s.compte}>{n.total}</span>
          </button>
          {n.concepts.length > 0 && (
            <button type="button" className={s.deplier} aria-expanded={ouverte} aria-label={V.voirConcepts(nom(n.notion))} data-coche={cochees > 0 ? "1" : undefined} onClick={() => setOuvertes((o) => basculer(o, n.notion))}>
              {cochees > 0 && <b>{cochees}</b>}
              <ChevronDown size={15} aria-hidden data-ouvert={ouverte ? "1" : undefined} />
            </button>
          )}
        </div>
        {ouverte && (
          <ul className={s.concepts}>
            {visibles.map((c) => {
              const dedans = on || concepts.has(c.concept);
              return (
                <li key={c.concept}>
                  <button type="button" className={s.concept} aria-pressed={dedans} disabled={on} onClick={() => basculerConcept(c.concept)}>
                    <Case on={dedans} />
                    <span className={s.conceptNom}>{c.concept}</span>
                    <span className={s.compte}>{c.total}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  if (erreur) return <p className={s.etat}>{V.erreur}</p>;
  if (!dispo) return <p className={s.etat}>{V.chargement}</p>;

  const aTravailler = faibles.flatMap((f) => dispo.filter((n) => n.notion === f.notion && garde(n)));
  const groupes = TOPICS.map((t) => ({ cle: t.key, nom: TOPIC_LABELS[t.key] ?? t.key, notions: dispo.filter((n) => n.notion.startsWith(t.key + ":") && garde(n)).sort((a, b) => Number(a.notion.split(":")[1]) - Number(b.notion.split(":")[1])) })).filter((g) => g.notions.length > 0);

  return (
    <div className={s.choix}>
      <label className={s.recherche}>
        <Search size={15} aria-hidden />
        <input type="search" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder={V.recherche} aria-label={V.recherche} />
      </label>
      <div className={s.liste}>
        {aTravailler.length > 0 && (
          <section>
            <h3 className={s.titre}>{salleId ? V.aTravaillerSalleTitre : V.aTravaillerTitre}</h3>
            <p className={s.aide}>{salleId ? V.aideSalle : V.aide}</p>
            <ul className={s.notions}>
              {aTravailler.map(ligne)}
            </ul>
          </section>
        )}
        {groupes.map((g) => {
          const ouvert = matieres.has(g.cle) || q.length > 0;
          const cochees = g.notions.filter((n) => notions.has(n.notion)).length;
          return (
            <section key={g.cle}>
              <button type="button" className={s.matiere} aria-expanded={ouvert} onClick={() => setMatieres((m) => basculer(m, g.cle))}>
                <span>{g.nom}</span>
                {cochees > 0 && <b>{cochees}</b>}
                <ChevronDown size={16} aria-hidden data-ouvert={ouvert ? "1" : undefined} />
              </button>
              {ouvert && (
                <ul className={s.notions}>
                  {g.notions.map(ligne)}
                </ul>
              )}
            </section>
          );
        })}
        {groupes.length === 0 && <p className={s.etat}>{V.rien}</p>}
      </div>
    </div>
  );
}
