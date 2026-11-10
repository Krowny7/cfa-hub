"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { TRADUCTION as T } from "@/lib/voice-traduction";

// Le bouton « En français » de l'entraînement ciblé, quand la séance contient de l'Ethics.
// Les traductions sont en base (quiz_questions.prompt_fr / choices_fr, migration_questions_fr.sql),
// faites à l'avance, termes d'examen gardés en anglais. Le bouton n'apparaît que si au moins une
// question de la séance est traduite ; une question pas traduite reste en anglais.
// L'explication de la correction est déjà en français.

type Q = { id: string; prompt: string; choices: string[] };
type Fr = { prompt: string; choices: string[] };

export function useEnFrancais(ethics: boolean, questions: Q[], courante: Q | undefined) {
  const [traductions, setTraductions] = useState<Map<string, Fr>>(new Map());
  const [actif, setActif] = useState(false);
  const cle = ethics ? questions.map((q) => q.id).join(",") : "";

  useEffect(() => {
    setTraductions(new Map());
    if (!cle) return;
    let fini = false;
    void (async () => {
      try {
        const { data } = await createClient().from("quiz_questions").select("id,prompt_fr,choices_fr").in("id", cle.split(",")).neq("prompt_fr", "");
        if (fini || !data) return;
        const m = new Map<string, Fr>();
        for (const r of data as { id: string; prompt_fr: string | null; choices_fr: string[] | null }[]) if (r.prompt_fr && r.choices_fr?.length) m.set(r.id, { prompt: r.prompt_fr, choices: r.choices_fr });
        setTraductions(m);
      } catch {}
    })();
    return () => {
      fini = true;
    };
  }, [cle]);

  const fr = courante ? traductions.get(courante.id) : undefined;
  // une traduction n'est prise que si elle a le même nombre de choix (l'ordre des réponses ne bouge pas)
  const pris = actif && fr && courante && fr.choices.length === courante.choices.length ? fr : null;
  const bouton = traductions.size ? (
    <button type="button" className="btn btn-secondary btn-sm" aria-pressed={actif} onClick={() => setActif((a) => !a)} title={T.aide}>
      {!actif ? T.francais : pris ? T.anglais : T.pasTraduite}
    </button>
  ) : null;

  return { bouton, prompt: pris?.prompt, choices: pris?.choices };
}
