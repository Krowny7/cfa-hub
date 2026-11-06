"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { mesNotionsATravailler } from "@/app/practice/actions";
import { choixDisponible, choixVide, contientRecherche, lireNotionsATravailler, lireNotionsDisponibles, matieresDuChoix, plat, questionsDuChoix, type ChoixNotionsValeur, type MockNotions, type NotionATravailler, type NotionDispo, type SourceNotions } from "@/lib/notions-choix";
import { chercherProches, type IndexMots } from "@/lib/notions-proches";
import { TOPIC_LABELS, TOPICS } from "@/lib/practiceTopics";
import { createClient } from "@/lib/supabase/browser";
import { NOTIONS_CHOIX as V } from "@/lib/voice-notions";
import s from "./ChoixNotions.module.css";

// Le choix par notion : les notions de chaque matière, leurs concepts, et un badge sur celles qui
// sont à travailler. Les libellés (lib/notions.ts, un gros fichier) ne se chargent qu'à l'ouverture.

export type InfoChoix = { topics: string[]; total: number };

/** au-delà, les libellés suffisent : pas de résultats proches en plus */
const MAX_DIRECTS_AVEC_PROCHES = 3;

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
  mock,
  demo,
}: {
  source: SourceNotions;
  valeur: ChoixNotionsValeur;
  onChange: (v: ChoixNotionsValeur, info: InfoChoix) => void;
  /** dans une Salle : le badge compte les joueurs présents */
  salleId?: string;
  /** source « examen » : les sessions et la version du mock */
  mock?: MockNotions;
  /** aperçus et tests : des données d'exemple, sans lecture */
  demo?: { dispo: NotionDispo[]; faibles: NotionATravailler[]; mots?: IndexMots };
}) {
  const [dispo, setDispo] = useState<NotionDispo[] | null>(null);
  const [faibles, setFaibles] = useState<NotionATravailler[]>([]);
  const [noms, setNoms] = useState<Libelles>(new Map());
  const [erreur, setErreur] = useState(false);
  const [cherche, setCherche] = useState("");
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());
  const [matieres, setMatieres] = useState<Set<string>>(new Set());
  const [indexMots, setIndexMots] = useState<IndexMots | null | undefined>(demo?.mots);
  const client = useRef(createClient());
  const cleMock = mock ? `${mock.version}|${mock.examens.join("|")}` : "";
  const dernier = useRef({ mock, valeur, onChange });
  dernier.current = { mock, valeur, onChange };

  useEffect(() => {
    let fini = false;
    setDispo(null);
    setErreur(false);
    const faiblesLus = demo ? demo.faibles : salleId ? lireNotionsATravailler(client.current, salleId) : mesNotionsATravailler().catch(() => []);
    Promise.all([demo ? demo.dispo : lireNotionsDisponibles(client.current, source, dernier.current.mock), faiblesLus, import("@/lib/notions")])
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
  }, [source, salleId, demo, cleMock]);

  // réglages rouverts, autres sessions de mock : le choix et son total suivent ce qui est disponible
  useEffect(() => {
    const { valeur: v, onChange: prevenir } = dernier.current;
    if (!dispo || choixVide(v)) return;
    const reste = choixDisponible(v, dispo);
    prevenir(reste, { topics: matieresDuChoix(reste, dispo), total: questionsDuChoix(reste, dispo) });
  }, [dispo]);

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
  const contient = (t: string) => contientRecherche(t, q);
  const garde = (n: NotionDispo) => !q || contient(nom(n.notion)) || n.concepts.some((c) => contient(c.concept));

  // les libellés répondent peu ou pas : on cherche aussi dans les mots des questions, chargés à ce moment-là
  const directs = q && dispo ? dispo.reduce((t, n) => t + (contient(nom(n.notion)) ? 1 : 0) + n.concepts.filter((c) => contient(c.concept)).length, 0) : 0;
  const parMots = q.length >= 3 && dispo !== null && (directs === 0 || (q.length >= 5 && directs <= MAX_DIRECTS_AVEC_PROCHES));
  useEffect(() => {
    if (!parMots || indexMots !== undefined) return;
    let fini = false;
    fetch("/notions-mots.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((i: IndexMots | null) => !fini && setIndexMots(i))
      .catch(() => !fini && setIndexMots(null));
    return () => {
      fini = true;
    };
  }, [parMots, indexMots]);
  const proches = useMemo(() => (parMots && indexMots && dispo ? chercherProches(q, indexMots, dispo) : []), [parMots, indexMots, dispo, q]);

  const ligne = (n: NotionDispo, seuls?: Set<string>) => {
    const on = notions.has(n.notion);
    const joueurs = parNotion.get(n.notion);
    const visibles = seuls?.size ? n.concepts.filter((c) => seuls.has(c.concept)) : !seuls && q && !contient(nom(n.notion)) ? n.concepts.filter((c) => contient(c.concept)) : n.concepts;
    // une ligne trouvée par la recherche arrive ouverte sur ses concepts : le chevron la replie
    const trouvee = seuls ? seuls.size > 0 : q.length > 0 && visibles.length > 0;
    const cle = trouvee ? `${seuls ? "proche" : "trouvee"}:${n.notion}` : n.notion;
    const ouverte = trouvee ? !ouvertes.has(cle) : ouvertes.has(cle);
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
            <button type="button" className={s.deplier} aria-expanded={ouverte} aria-label={V.voirConcepts(nom(n.notion))} data-coche={cochees > 0 ? "1" : undefined} onClick={() => setOuvertes((o) => basculer(o, cle))}>
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

  // ce que les libellés montrent déjà ne se répète pas
  const prochesVus = proches.flatMap((p) => {
    const n = dispo.find((x) => x.notion === p.notion);
    if (!n || (q && contient(nom(n.notion)))) return [];
    const seuls = p.concepts.filter((c) => !contient(c));
    return p.concepts.length > 0 && seuls.length === 0 ? [] : [{ n, seuls: new Set(seuls) }];
  });
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
              {aTravailler.map((n) => ligne(n))}
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
                  {g.notions.map((n) => ligne(n))}
                </ul>
              )}
            </section>
          );
        })}
        {prochesVus.length > 0 && (
          <section>
            <h3 className={s.titre}>{V.prochesTitre}</h3>
            <p className={s.aide}>{V.prochesAide}</p>
            <ul className={s.notions}>
              {prochesVus.map((p) => ligne(p.n, p.seuls))}
            </ul>
          </section>
        )}
        {groupes.length === 0 && prochesVus.length === 0 && <p className={s.etat}>{parMots && indexMots === undefined ? V.prochesCherche : V.rien}</p>}
      </div>
    </div>
  );
}
