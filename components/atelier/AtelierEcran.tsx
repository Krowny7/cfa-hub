"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { lancerAtelier, repondreCalcAtelier } from "@/app/atelier/actions";
import { AtelierOuverture } from "@/components/atelier/AtelierOuverture";
import { AtelierSeance, type FinSeance } from "@/components/atelier/AtelierSeance";
import { AtelierBilan, AtelierPause } from "@/components/atelier/AtelierBilan";
import type { Reponse } from "@/lib/atelier";
import { cloreAtelier, repondreQcm, type ApiAtelier, type ClotureAtelier, type NotionProposee, type RappelNotion, type SeanceAtelier } from "@/lib/atelier-seance";
import { ATELIER as V } from "@/lib/voice-atelier";

// /atelier : l'ouverture (choisir ses notions), la séance, l'arrêt (bilan
// partiel, reprise sous 24 heures) et le bilan. Un Atelier déjà en cours
// s'ouvre sur « Reprendre » ou « Le clore ». La séance vit côté serveur
// (migration_atelier.sql) ; les aperçus locaux passent une API sur place.

export type VueAtelier =
  | { vue: "ouverture" }
  | { vue: "encours"; seance: SeanceAtelier }
  | { vue: "seance"; seance: SeanceAtelier; reprise: boolean }
  | { vue: "pause"; fin: FinSeance & { seance: SeanceAtelier } }
  | { vue: "bilan"; seance: SeanceAtelier; reponses: Reponse[]; cloture: ClotureAtelier | null; ajoutes: number };

/** Aperçus : l'API sur place et l'écran de départ. */
export type DemoAtelier = {
  api: ApiAtelier;
  depart?: VueAtelier;
  demoEtape?: { secondes?: number; choix?: number; raw?: string; rappelDe?: string };
};

export function AtelierEcran({
  proposees,
  initiales,
  courant,
  rappels,
  traits,
  demo,
}: {
  proposees: NotionProposee[];
  initiales: string[];
  courant: SeanceAtelier | null;
  rappels: Record<string, RappelNotion>;
  traits: number | null;
  demo?: DemoAtelier;
}) {
  const router = useRouter();
  const api: ApiAtelier = useMemo(() => {
    if (demo) return demo.api;
    const sb = createClient();
    return {
      lancer: (notions) => lancerAtelier(notions),
      repondre: (id, i, choix, retest, secondes) => repondreQcm(sb, id, i, choix, retest, secondes),
      repondreCalc: (id, i, raw, retest, secondes) => repondreCalcAtelier({ id, i, raw, retest, secondes }),
      clore: (id, secondes) => cloreAtelier(sb, id, secondes),
    };
  }, [demo]);
  const [vue, setVue] = useState<VueAtelier>(demo?.depart ?? (courant ? { vue: "encours", seance: courant } : { vue: "ouverture" }));
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const commencer = async (notions: string[]) => {
    setEnvoi(true);
    setMessage(null);
    try {
      const r = await api.lancer(notions);
      if (r.kind === "ok") setVue({ vue: "seance", seance: r.seance, reprise: r.seance.ordre.length > 0 });
      else setMessage(r.kind === "vide" ? V.vide : r.kind === "indisponible" ? V.bientotTitre : V.erreur);
    } catch {
      setMessage(V.erreur);
    } finally {
      setEnvoi(false);
    }
  };

  const clore = useCallback(
    async (seance: SeanceAtelier, reponses: Reponse[], secondes: number, ajoutes: number) => {
      setEnvoi(true);
      try {
        const cloture = await api.clore(seance.id, secondes);
        // rien de répondu : l'Atelier s'est effacé, retour à l'ouverture
        if (!cloture && !reponses.length) setVue({ vue: "ouverture" });
        else setVue({ vue: "bilan", seance, reponses, cloture, ajoutes });
      } catch {
        setVue({ vue: "bilan", seance, reponses, cloture: null, ajoutes });
      } finally {
        setEnvoi(false);
        window.scrollTo({ top: 0 });
      }
    },
    [api],
  );

  if (vue.vue === "seance") {
    return (
      <AtelierSeance
        key={vue.seance.id + (vue.reprise ? "-r" : "")}
        seance={vue.seance}
        api={api}
        rappels={rappels}
        reprise={vue.reprise}
        demoEtape={demo?.demoEtape}
        onPause={(fin) => setVue({ vue: "pause", fin })}
        onFin={(fin) => void clore(fin.seance, fin.reponses, fin.secondes, fin.ajoutes)}
      />
    );
  }

  if (vue.vue === "pause") {
    const { fin } = vue;
    return (
      <AtelierPause
        seance={fin.seance}
        reponses={fin.reponses}
        rappels={rappels}
        vuAt={fin.vuAt}
        envoi={envoi}
        onReprendre={() => setVue({ vue: "seance", seance: { ...fin.seance, ordre: fin.reponses, secondes: fin.secondes }, reprise: true })}
        onClore={() => void clore(fin.seance, fin.reponses, fin.secondes, fin.ajoutes)}
      />
    );
  }

  if (vue.vue === "bilan") {
    return (
      <AtelierBilan
        seance={vue.seance}
        reponses={vue.reponses}
        cloture={vue.cloture}
        rappels={rappels}
        traits={traits}
        ajoutes={vue.ajoutes}
        onAutre={() => {
          setVue({ vue: "ouverture" });
          router.refresh();
        }}
      />
    );
  }

  if (vue.vue === "encours") {
    const s = vue.seance;
    const noms = s.notions.map((n) => rappels[n]?.libelle ?? n).join(", ");
    return (
      <section className="card-hero rl-in mx-auto grid w-full max-w-[760px] gap-5 p-6 md:p-8" aria-label={V.enCoursTitre}>
        <div className="grid gap-1.5">
          <p className="t-eyebrow m-0">{V.kicker}</p>
          <h1 className="t-h1 m-0">{V.enCoursTitre}</h1>
          <p className="t-small m-0">{V.enCoursTexte(noms, s.ordre.length)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" className="btn btn-primary btn-lg rl-press min-h-[44px]" onClick={() => setVue({ vue: "seance", seance: s, reprise: true })} autoFocus>
            {V.reprendre} <ArrowRight size={17} aria-hidden />
          </button>
          {s.ordre.length > 0 && (
            <button type="button" className="btn btn-secondary btn-lg min-h-[44px]" disabled={envoi} onClick={() => void clore(s, s.ordre, s.secondes, 0)}>
              {V.clore}
            </button>
          )}
        </div>
      </section>
    );
  }

  if (!proposees.length && !initiales.length) {
    return (
      <section className="card rl-in mx-auto grid w-full max-w-[760px] gap-3 p-6 md:p-8">
        <h1 className="t-h2 m-0">{V.peuTitre}</h1>
        <p className="t-body m-0 text-muted">{V.peuTexte}</p>
      </section>
    );
  }

  return <AtelierOuverture proposees={proposees} initiales={initiales} envoi={envoi} message={message} onCommencer={(n) => void commencer(n)} />;
}
