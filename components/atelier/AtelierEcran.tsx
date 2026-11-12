"use client";

import { multDuJour, xpAvecSerie } from "@/lib/serie-encre";
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
import { ActionEncre, CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";

// /atelier : l'ouverture (choisir ses notions), la séance, l'arrêt (bilan
// partiel, reprise sous 24 heures) et le bilan. Un Atelier déjà en cours
// s'ouvre sur « Reprendre » ou « Le clore ». La séance vit côté serveur
// (migration_atelier.sql) ; les aperçus locaux passent une API sur place.
// L'ouverture (et l'Atelier en cours, ou trop peu de matière) suit le modèle des
// sous-pages (2026-11-12) : l'en-tête commun, puis le cadre à zones, la notion du
// jour à gauche, le registre resserré dans la colonne grise (`registre`, lu par la
// page). La séance, l'arrêt et le bilan : plus d'en-tête, l'écran seul.

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
  registre,
  demo,
}: {
  proposees: NotionProposee[];
  initiales: string[];
  courant: SeanceAtelier | null;
  rappels: Record<string, RappelNotion>;
  traits: number | null;
  /** la colonne grise (« Ton registre »), rendue par la page ; absente : une zone seule */
  registre?: React.ReactNode;
  demo?: DemoAtelier;
}) {
  const router = useRouter();
  const api: ApiAtelier = useMemo(() => {
    if (demo) return demo.api;
    const sb = createClient();
    return {
      lancer: (notions) => lancerAtelier(notions),
      repondre: (id, i, choix, retest, secondes) => repondreQcm(sb, id, i, choix, retest, secondes),
      repondreCalc: async (id, i, raw, retest, secondes) => {
        const r = await repondreCalcAtelier({ id, i, raw, retest, secondes });
        // la base rend l'XP de base ; le trigger de la série d'encre y ajoute le bonus
        if (r.ferme || (r.status !== "juste" && r.status !== "faux") || !(r.xp > 0)) return r;
        const mult = await multDuJour(sb);
        return { ...r, xp: xpAvecSerie(r.xp, mult), mult };
      },
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
      <div className="rl-wide">
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
      </div>
    );
  }

  if (vue.vue === "pause") {
    const { fin } = vue;
    return (
      <div className="rl-wide">
      <AtelierPause
        seance={fin.seance}
        reponses={fin.reponses}
        rappels={rappels}
        vuAt={fin.vuAt}
        envoi={envoi}
        onReprendre={() => setVue({ vue: "seance", seance: { ...fin.seance, ordre: fin.reponses, secondes: fin.secondes }, reprise: true })}
        onClore={() => void clore(fin.seance, fin.reponses, fin.secondes, fin.ajoutes)}
      />
      </div>
    );
  }

  if (vue.vue === "bilan") {
    return (
      <div className="rl-wide">
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
      </div>
    );
  }

  // l'ouverture, l'Atelier en cours ou trop peu de matière : l'en-tête commun et le cadre à zones
  const cadre = (contenu: React.ReactNode) => (
    <SousPage entete={<EnTeteSousPage retour={RETOUR_ENTRAINEMENT} titre={V.nom} ligne={V.carteSousTitre} illustration={{ nom: "qcm-machines" }} />}>
      <CadreZones gauche={{ titre: SOUS_ENTRAINEMENT.atelier.notion, contenu }} droite={registre ? { titre: SOUS_ENTRAINEMENT.atelier.registre, contenu: registre } : undefined} />
    </SousPage>
  );

  if (vue.vue === "encours") {
    const s = vue.seance;
    const noms = s.notions.map((n) => rappels[n]?.libelle ?? n).join(", ");
    return cadre(
      <div className="grid min-w-0 gap-5">
        <div className="grid gap-1.5">
          <p className="m-0 text-[22px] font-bold leading-tight tracking-[-0.02em]">{V.enCoursTitre}</p>
          <p className="t-small m-0">{V.enCoursTexte(noms, s.ordre.length)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <ActionEncre onClick={() => setVue({ vue: "seance", seance: s, reprise: true })}>
            {V.reprendre} <ArrowRight size={17} aria-hidden />
          </ActionEncre>
          {s.ordre.length > 0 && (
            <button type="button" className="btn btn-secondary min-h-[40px]" disabled={envoi} onClick={() => void clore(s, s.ordre, s.secondes, 0)}>
              {V.clore}
            </button>
          )}
        </div>
      </div>,
    );
  }

  if (!proposees.length && !initiales.length) {
    return cadre(
      <div className="grid gap-2">
        <p className="m-0 text-[20px] font-bold leading-tight">{V.peuTitre}</p>
        <p className="t-body m-0 text-muted">{V.peuTexte}</p>
      </div>,
    );
  }

  return cadre(<AtelierOuverture proposees={proposees} initiales={initiales} envoi={envoi} message={message} onCommencer={(n) => void commencer(n)} />);
}
