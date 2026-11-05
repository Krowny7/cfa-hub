"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import { RUNNER_SALLE } from "@/lib/voice-salles";

// Le chat d'une Salle : dans la colonne de droite d'une partie (canal : la partie) et dans
// la salle d'attente (canal : la salle, `nu` : sans sa carte, posé dans un panneau du salon).
// Les messages passent par un canal Realtime (broadcast) : rien en base, rien dans le
// chemin du jeu. Si le canal
// ne répond pas, le chat le dit et la partie continue. Chacun garde ses messages le temps
// de l'onglet (sessionStorage), pour les retrouver après un rechargement ; qui arrive
// après coup ne voit pas ce qui a été dit avant. Le champ est un <input> : les raccourcis
// du jeu (A à E, 1 à 5, Entrée, flèches) ne s'y déclenchent pas (RunnerSalle les ignore).

const LONGUEUR_MAX = 280;
const NOM_MAX = 40;
const GARDES = 100;
/** Le temps laissé au canal pour s'ouvrir avant de dire qu'il ne répond pas. */
const OUVERTURE_MS = 8000;
const ENVOI_MIN_MS = 500;

type Message = { id: string; de: string; nom: string; texte: string };

/** Un message reçu du canal, s'il a la bonne forme. */
function lu(p: unknown): Message | null {
  const m = p as Partial<Message> | null;
  if (!m || typeof m.id !== "string" || typeof m.de !== "string" || typeof m.nom !== "string" || typeof m.texte !== "string" || !m.texte.trim()) return null;
  return { id: m.id.slice(0, 40), de: m.de.slice(0, 40), nom: m.nom.slice(0, NOM_MAX), texte: m.texte.slice(0, LONGUEUR_MAX) };
}

export function ChatSalle({ canal, moi, nu = false }: { canal: string; moi: { userId: string; nom: string }; nu?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState("");
  const [etat, setEtat] = useState<"ouverture" | "ouvert" | "hors">("ouverture");
  const voie = useRef<RealtimeChannel | null>(null);
  const liste = useRef<HTMLOListElement | null>(null);
  const dernierEnvoi = useRef(0);
  const cle = `salle-chat:${canal}`;

  const ajouter = (m: Message) => {
    setMessages((avant) => {
      if (avant.some((x) => x.id === m.id)) return avant;
      const suite = [...avant, m].slice(-GARDES);
      try {
        sessionStorage.setItem(cle, JSON.stringify(suite));
      } catch {}
      return suite;
    });
  };

  useEffect(() => {
    try {
      const gardes = JSON.parse(sessionStorage.getItem(cle) ?? "[]") as unknown[];
      setMessages(gardes.flatMap((g) => lu(g) ?? []));
    } catch {}
    let fin = () => {};
    try {
      const sb = createClient();
      const c = sb.channel(cle, { config: { broadcast: { self: false } } });
      c.on("broadcast", { event: "message" }, ({ payload }) => {
        const m = lu(payload);
        if (m) ajouter(m);
      });
      const delai = setTimeout(() => setEtat((e) => (e === "ouvert" ? e : "hors")), OUVERTURE_MS);
      c.subscribe((statut) => setEtat(statut === "SUBSCRIBED" ? "ouvert" : statut === "CHANNEL_ERROR" || statut === "TIMED_OUT" ? "hors" : (e) => e));
      voie.current = c;
      fin = () => {
        clearTimeout(delai);
        voie.current = null;
        void sb.removeChannel(c);
      };
    } catch {
      setEtat("hors");
    }
    return () => fin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  useEffect(() => {
    const el = liste.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const propre = texte.trim().slice(0, LONGUEUR_MAX);
    const maintenant = Date.now();
    if (!propre || !voie.current || etat !== "ouvert" || maintenant - dernierEnvoi.current < ENVOI_MIN_MS) return;
    dernierEnvoi.current = maintenant;
    const m: Message = { id: `${moi.userId.slice(0, 8)}-${maintenant}`, de: moi.userId, nom: moi.nom.slice(0, NOM_MAX), texte: propre };
    void voie.current.send({ type: "broadcast", event: "message", payload: m }).catch(() => setEtat("hors"));
    ajouter(m);
    setTexte("");
  }

  return (
    <section className={"grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 " + (nu ? "" : "card-quiet p-4")} aria-label={RUNNER_SALLE.chatTitre}>
      {!nu && <p className="t-micro m-0">{RUNNER_SALLE.chatTitre}</p>}
      {messages.length > 0 ? (
        <ol ref={liste} aria-live="polite" className="m-0 grid max-h-[150px] list-none gap-1 overflow-y-auto p-0 text-[13px] leading-snug">
          {messages.map((m) => (
            <li key={m.id} className="break-words">
              <b className="font-semibold">{m.de === moi.userId ? RUNNER_SALLE.chatToi : m.nom}</b> {m.texte}
            </li>
          ))}
        </ol>
      ) : (
        <p className="t-small m-0">{etat === "hors" ? RUNNER_SALLE.chatHors : RUNNER_SALLE.chatVide}</p>
      )}
      <form onSubmit={envoyer} className="flex gap-1.5">
        <input
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          maxLength={LONGUEUR_MAX}
          disabled={etat === "hors"}
          placeholder={RUNNER_SALLE.chatChamp}
          aria-label={RUNNER_SALLE.chatChamp}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-line bg-transparent px-2.5 py-1.5 text-[13px]"
        />
        <button type="submit" disabled={!texte.trim() || etat !== "ouvert"} className="rounded-lg bg-[var(--ink)] px-3 text-[13px] font-semibold text-[var(--paper)] disabled:opacity-40">
          {RUNNER_SALLE.chatEnvoyer}
        </button>
      </form>
    </section>
  );
}
