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
import { ActionContour, ActionEncre, ColonneSeance, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { RETOUR_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { ATELIER_B } from "@/lib/voice-entrainement-b";
import { nombre } from "@/lib/voice";
import fiche from "@/components/atelier/AtelierOuverture.module.css";

// /atelier : l'ouverture (choisir ses notions), la séance, l'arrêt (bilan
// partiel, reprise sous 24 heures) et le bilan. Un Atelier déjà en cours
// s'ouvre sur « Reprendre » ou « Le clore ». La séance vit côté serveur
// (migration_atelier.sql) ; les aperçus locaux passent une API sur place.
// L'ouverture (et l'Atelier en cours, ou trop peu de matière), direction « le lieu, puis
// l'objet » (2026-11-13) : la porte (chiffre-héros vrai : les points faibles encore sous le
// seuil), puis, dans la colonne des séances, la fiche de la notion et « Commencer » à l'encre. Le
// registre de la colonne grise est retiré (les ratures et les questions marquées s'ouvrent depuis
// Moi). La séance, l'arrêt et le bilan : plus d'en-tête, l'écran seul.

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
  faibles: nbFaibles,
  initiales,
  courant,
  rappels,
  traits,
  demo,
}: {
  proposees: NotionProposee[];
  /** les points faibles encore sous le seuil (sans la notion demandée par ?notion=) ; à défaut, les proposées */
  faibles?: number;
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

  // l'ouverture, l'Atelier en cours ou trop peu de matière : la porte, puis la fiche dans la colonne des séances
  const faibles = nbFaibles ?? proposees.length;
  // les autres notions proposées attendent derrière, en pile (deux au plus)
  const cadre = (contenu: React.ReactNode, etiquette: string = ATELIER_B.notion, derriere = 0) => (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={RETOUR_ENTRAINEMENT}
          titre={V.nom}
          ligne={V.carteSousTitre}
          illustration={{ nom: "qcm-machines" }}
          heros={faibles > 0 ? { valeur: nombre(faibles), legende: ATELIER_B.heros(faibles) } : null}
        />
      }
    >
      <ColonneSeance className={fiche.colonne}>
        <div className={fiche.pile} data-derriere={derriere > 0 ? Math.min(2, derriere) : undefined}>
          {derriere > 1 && <span className={fiche.dos} data-rang="2" aria-hidden />}
          {derriere > 0 && <span className={fiche.dos} data-rang="1" aria-hidden />}
          <section className={fiche.fiche} aria-label={etiquette}>
            <p className={fiche.etiquette}>{etiquette}</p>
            {contenu}
          </section>
        </div>
      </ColonneSeance>
    </SousPage>
  );

  if (vue.vue === "encours") {
    const s = vue.seance;
    const noms = s.notions.map((n) => rappels[n]?.libelle ?? n).join(", ");
    return cadre(
      <div className="grid min-w-0 gap-5">
        <div className="grid gap-1.5">
          <p className={fiche.nom}>{noms}</p>
          <p className={fiche.repere}>{ATELIER_B.faites(s.ordre.length)}</p>
        </div>
        <div className={fiche.actions}>
          <ActionEncre onClick={() => setVue({ vue: "seance", seance: s, reprise: true })}>
            {V.reprendre} <ArrowRight size={17} aria-hidden />
          </ActionEncre>
          {s.ordre.length > 0 && (
            <ActionContour onClick={() => (envoi ? undefined : void clore(s, s.ordre, s.secondes, 0))}>{V.clore}</ActionContour>
          )}
        </div>
      </div>,
      ATELIER_B.enCours,
    );
  }

  if (!proposees.length && !initiales.length) {
    return cadre(
      <div className="grid gap-2">
        <p className={fiche.nom}>{V.peuTitre}</p>
        <p className={fiche.repere}>{V.peuTexte}</p>
      </div>,
    );
  }

  return cadre(
    <AtelierOuverture proposees={proposees} initiales={initiales} envoi={envoi} message={message} onCommencer={(n) => void commencer(n)} />,
    ATELIER_B.notion,
    proposees.length - 1,
  );
}
