"use client";

import { useState, useTransition } from "react";
import { CalendarOff } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { ajouterJours, joursEntre, libellePlage, plagesDe, refusDeLaBase, refusPose, type GenrePause, type JourPause, type PlagePause } from "@/components/moi/repos";
import type { ReposInitial } from "@/components/moi/repos-data";

// Moi › Réglages : le repos de la série d'encre (V3 §10.4). Des jours posés
// à l'avance (un ou deux jours de repos par semaine, ou une pause de
// quelques jours) qui ne comptent ni pour ni contre la série. Posés et
// retirés directement par le client Supabase (serie_pause_poser,
// serie_pause_retirer : la base vérifie tout) ; les règles de
// components/moi/repos.ts préviennent avant d'envoyer.
// Sans la table ou les fonctions (migration du Codex §8 pas encore collée),
// le réglage ne s'affiche pas (`initial` null, ou fonction absente au
// premier envoi).

const T = {
  titre: "Repos de la série",
  phrase: "Un jour de repos ne compte ni pour ni contre ta série : elle t'attend. Si tu révises quand même ce jour-là, il compte comme d'habitude.",
  regles: "Repos : deux jours par semaine au plus. Pause (vacances, maladie) : 14 jours d'affilée au plus, 30 par an. Toujours à l'avance.",
  genres: { repos: "Repos", pause: "Pause" } satisfies Record<GenrePause, string>,
  du: "Du",
  au: "Au",
  le: "Le",
  poser: "Poser",
  retirer: "Retirer",
  poses: "Déjà posés",
  aucun: "Rien de posé pour l'instant.",
  pose: "C'est posé.",
  retire: "C'est retiré.",
  refuse: "La base a refusé ces jours : vérifie les règles ci-dessus.",
  erreur: "Impossible pour le moment, réessaie dans un instant.",
};

/** La fonction ou la table manque encore (même règle que baseAbsente, lib/profil/sceaux-base.ts, module serveur). */
const absente = (e: { code?: string; message?: string } | null) => !!e && (["PGRST202", "PGRST205", "42883", "42P01"].includes(e.code ?? "") || /could not find|does not exist/i.test(e.message ?? ""));

export function ReposSerie({ initial }: { initial: ReposInitial | null }) {
  const [poses, setPoses] = useState<JourPause[]>(initial?.poses ?? []);
  const [cache, setCache] = useState(!initial);
  const [genre, setGenre] = useState<GenrePause>("repos");
  const aujourdhui = initial?.aujourdhui ?? "";
  const [de, setDe] = useState(aujourdhui);
  const [a, setA] = useState(aujourdhui);
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);
  const [pending, startTransition] = useTransition();
  if (cache || !initial) return null;

  const fin = genre === "repos" && a < de ? de : a;
  const refus = refusPose(de, fin, genre, aujourdhui, poses);

  const relire = async (sb: ReturnType<typeof createClient>) => {
    // depuis un an, comme lirePauses (repos-data.ts) : les règles comptent aussi les jours passés
    const { data } = await sb.from("serie_pauses").select("jour,genre").gte("jour", ajouterJours(aujourdhui, -364)).order("jour").limit(800);
    if (Array.isArray(data))
      setPoses(data.flatMap((r: { jour?: unknown; genre?: unknown }): JourPause[] => (typeof r.jour === "string" && (r.genre === "repos" || r.genre === "pause") ? [{ jour: r.jour.slice(0, 10), genre: r.genre }] : [])));
  };

  const poser = () =>
    startTransition(async () => {
      if (refus) return;
      const sb = createClient();
      const { error } = await sb.rpc("serie_pause_poser", { p_de: de, p_a: fin, p_genre: genre });
      if (absente(error)) return setCache(true);
      if (error) return setMsg({ ok: false, texte: refusDeLaBase(error.message) ?? T.refuse });
      await relire(sb).catch(() => {});
      setMsg({ ok: true, texte: T.pose });
    });

  const retirer = (p: PlagePause) =>
    startTransition(async () => {
      const sb = createClient();
      // seuls les jours à venir se retirent (aujourd'hui est déjà en jeu)
      for (const jour of joursEntre(p.de, p.a).filter((j) => j > aujourdhui)) {
        const { error } = await sb.rpc("serie_pause_retirer", { p_jour: jour });
        if (absente(error)) return setCache(true);
        if (error) {
          setMsg({ ok: false, texte: T.erreur });
          break;
        }
      }
      await relire(sb).catch(() => {});
      setMsg((m) => (m && !m.ok ? m : { ok: true, texte: T.retire }));
    });

  // « Déjà posés » : aujourd'hui et après (les jours passés ne servent qu'aux règles)
  const plages = plagesDe(poses.filter((p) => p.jour >= aujourdhui));
  return (
    <div id="repos" className="card flex flex-col gap-3 p-[22px]">
      <h3 className="m-0 flex items-center gap-2 text-[13px] font-semibold text-muted">
        <CalendarOff size={15} aria-hidden /> {T.titre}
      </h3>
      <p className="t-small m-0">{T.phrase}</p>
      <p className="t-micro m-0">{T.regles}</p>

      <div role="tablist" aria-label="Repos ou pause" className="seg w-full" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + ${genre === "pause" ? 1 : 0} * (100% - 8px) / 2)`, width: "calc((100% - 8px) / 2)" }} />
        {(["repos", "pause"] as const).map((g) => (
          <button key={g} type="button" role="tab" aria-selected={genre === g} onClick={() => setGenre(g)} className="seg-item min-h-[44px]">
            {T.genres[g]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-col gap-1 text-[13px] font-semibold">
          {genre === "repos" && de === fin ? T.le : T.du}
          <input type="date" className="input min-h-[44px]" min={aujourdhui} value={de} onChange={(e) => setDe(e.target.value)} />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-[13px] font-semibold">
          {T.au}
          <input type="date" className="input min-h-[44px]" min={de || aujourdhui} value={fin} onChange={(e) => setA(e.target.value)} />
        </label>
        <button type="button" className="btn btn-primary rl-press min-h-[44px]" disabled={pending || !!refus} onClick={poser}>
          {pending ? "…" : T.poser}
        </button>
      </div>
      {refus && de && <p className="t-micro m-0">{refus}</p>}
      {msg && (
        <p role="status" className={"m-0 text-[13px] font-medium " + (msg.ok ? "" : "text-pen")}>
          {msg.texte}
        </p>
      )}

      <div className="flex flex-col border-t border-line pt-2">
        <p className="t-eyebrow m-0 py-1">{T.poses}</p>
        {plages.length ? (
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {plages.map((p) => (
              <li key={p.de} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 text-[14px]">
                  <span className="font-semibold">{T.genres[p.genre]}</span> · {libellePlage(p, aujourdhui)}
                </span>
                {p.a > aujourdhui && (
                  <button type="button" className="btn btn-ghost btn-sm min-h-[44px] shrink-0" disabled={pending} onClick={() => retirer(p)}>
                    {T.retirer}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-micro m-0 py-1">{T.aucun}</p>
        )}
      </div>
    </div>
  );
}
