"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/browser";
import { MESSAGES as M } from "@/lib/voice-messages";
import { PresenceDot } from "@/components/presence/Presence";
import s from "./MessagesAmis.module.css";

// Les messages entre amis, en bas à droite de toutes les pages (posé dans app/layout.tsx).
// Une conversation par ami, gardée en base (table messages_amis, migration_messages_amis.sql) :
// on n'écrit qu'à un ami accepté, on ne lit que ses conversations. Un message reçu arrive en
// direct (Realtime, filtré par les mêmes droits) et s'affiche en bulle au-dessus du bouton.
// Le composant vit tout le temps de l'onglet (layout racine) : la liste d'amis se recharge
// quand un inconnu écrit et à chaque ouverture du panneau ; les non-lus se recomptent quand
// le canal se (re)connecte et quand l'onglet redevient visible, pour rattraper une coupure.
// Rien ne s'affiche sans session ni sans ami ; si la table manque, tout reste caché.

type Ami = { id: string; nom: string; avatar: string | null };
type Msg = { id: string; de: string; a: string; texte: string; cree: string; lu_le?: string | null };

const MAX = 500;
const BULLE_MS = 7000;
/** On laisse la page se charger avant d'ouvrir les messages. */
const ATTENTE_MS = 1200;
const COLONNES = "id,de,a,texte,cree,lu_le";

export function MessagesAmis() {
  const sb = useRef<SupabaseClient | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const uidRef = useRef<string | null>(null);
  const [amis, setAmis] = useState<Ami[]>([]);
  const amisRef = useRef<Ami[]>([]);
  const [nonLus, setNonLus] = useState<Record<string, number>>({});
  const [ouvert, setOuvert] = useState(false);
  const [avec, setAvec] = useState<string | null>(null);
  /** la conversation affichée en ce moment (null : panneau fermé ou liste) */
  const avecRef = useRef<string | null>(null);
  const [fil, setFil] = useState<Msg[] | null>(null);
  const filRef = useRef<Msg[] | null>(null);
  /** les messages reçus pendant le chargement du fil, fusionnés à son arrivée */
  const enAttente = useRef<Msg[]>([]);
  const [filRate, setFilRate] = useState(false);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [bulle, setBulle] = useState<Msg | null>(null);
  const liste = useRef<HTMLOListElement | null>(null);

  uidRef.current = uid;
  amisRef.current = amis;
  filRef.current = fil;
  const ami = avec ? (amis.find((a) => a.id === avec) ?? null) : null;
  avecRef.current = ouvert && ami ? ami.id : null;

  // la session : suivie pour s'ouvrir après une connexion et se taire après une déconnexion
  useEffect(() => {
    try {
      const c = createClient();
      sb.current = c;
      const { data } = c.auth.onAuthStateChange((_e, session) => setUid(session?.user.id ?? null));
      return () => data.subscription.unsubscribe();
    } catch {
      return;
    }
  }, []);

  /** Les amis acceptés et leurs profils ; null si la lecture échoue. */
  async function chargerAmis(): Promise<Ami[] | null> {
    const c = sb.current;
    const moi = uidRef.current;
    if (!c || !moi) return null;
    try {
      const { data: liens, error } = await c.from("friendships").select("requester,addressee").eq("status", "accepted").or(`requester.eq.${moi},addressee.eq.${moi}`).limit(200);
      if (error) return null;
      const ids = ((liens ?? []) as { requester: string; addressee: string }[]).map((r) => (r.requester === moi ? r.addressee : r.requester));
      if (!ids.length) return [];
      const { data: profils } = await c.from("profiles").select("id,username,avatar_url").in("id", ids);
      const noms = new Map(((profils ?? []) as { id: string; username: string | null; avatar_url: string | null }[]).map((p) => [p.id, p]));
      return ids
        .map((id) => ({ id, nom: noms.get(id)?.username || M.joueur, avatar: noms.get(id)?.avatar_url ?? null }))
        .sort((x, y) => x.nom.localeCompare(y.nom, "fr"));
    } catch {
      return null;
    }
  }

  /** Recompte les non-lus, seulement ceux des amis actuels. */
  async function recompter(liste: Ami[]) {
    const c = sb.current;
    const moi = uidRef.current;
    if (!c || !moi || !liste.length) return setNonLus({});
    const { data, error } = await c.from("messages_amis").select("de").eq("a", moi).is("lu_le", null).in("de", liste.map((a) => a.id)).limit(500);
    if (error) return;
    const compte: Record<string, number> = {};
    for (const r of (data ?? []) as { de: string }[]) if (r.de !== avecRef.current) compte[r.de] = (compte[r.de] ?? 0) + 1;
    setNonLus(compte);
  }

  async function rafraichir() {
    const l = await chargerAmis();
    if (!l) return;
    setAmis(l);
    amisRef.current = l;
    await recompter(l);
  }

  function marquerLu(de: string) {
    setNonLus((n) => (n[de] ? { ...n, [de]: 0 } : n));
    const c = sb.current;
    const moi = uidRef.current;
    if (c && moi) void c.from("messages_amis").update({ lu_le: new Date().toISOString() }).eq("a", moi).eq("de", de).is("lu_le", null).then(() => {});
  }

  function vu(m: Msg) {
    setFil((f) => (f ? f.map((x) => (x.id === m.id ? { ...x, lu_le: m.lu_le ?? null } : x)) : f));
  }

  async function recu(m: Msg) {
    if (avecRef.current === m.de) {
      if (filRef.current === null) {
        if (!enAttente.current.some((x) => x.id === m.id)) enAttente.current.push(m);
      } else setFil((f) => (f && !f.some((x) => x.id === m.id) ? [...f, m] : f));
      marquerLu(m.de);
      return;
    }
    // un expéditeur pas encore connu (amitié acceptée depuis le chargement) : on relit les amis
    if (!amisRef.current.some((a) => a.id === m.de)) {
      const l = await chargerAmis();
      if (!l || !l.some((a) => a.id === m.de)) return;
      setAmis(l);
      amisRef.current = l;
    }
    setNonLus((n) => ({ ...n, [m.de]: (n[m.de] ?? 0) + 1 }));
    setBulle(m);
  }

  // les amis, les non-lus, puis l'écoute en direct (même sans ami : le premier peut arriver)
  useEffect(() => {
    const c = sb.current;
    if (!uid || !c) {
      setAmis([]);
      setNonLus({});
      setOuvert(false);
      setAvec(null);
      return;
    }
    let canal: RealtimeChannel | null = null;
    const visible = () => {
      if (document.visibilityState === "visible") void recompter(amisRef.current);
    };
    const t = setTimeout(() => {
      void rafraichir();
      canal = c
        .channel(`messages-amis:${uid}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages_amis", filter: `a=eq.${uid}` }, ({ new: m }) => void recu(m as Msg))
        // « Vu » : l'ami a ouvert un de mes messages
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages_amis", filter: `de=eq.${uid}` }, ({ new: m }) => vu(m as Msg))
        .subscribe((statut) => {
          // une reconnexion repasse par SUBSCRIBED : on rattrape ce qui est arrivé pendant la coupure
          if (statut === "SUBSCRIBED") void recompter(amisRef.current);
        });
      document.addEventListener("visibilitychange", visible);
    }, ATTENTE_MS);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", visible);
      if (canal) void c.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    if (!bulle) return;
    const t = setTimeout(() => setBulle(null), BULLE_MS);
    return () => clearTimeout(t);
  }, [bulle]);

  useEffect(() => {
    const el = liste.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [fil]);

  async function ouvrir(id: string) {
    if (!amisRef.current.some((a) => a.id === id)) return;
    setOuvert(true);
    setAvec(id);
    avecRef.current = id;
    enAttente.current = [];
    setFil(null);
    filRef.current = null;
    setFilRate(false);
    setErreur(false);
    setBulle((b) => (b?.de === id ? null : b));
    const c = sb.current;
    const moi = uidRef.current;
    if (!c || !moi) return;
    const { data, error } = await c.from("messages_amis").select(COLONNES).or(`and(de.eq.${moi},a.eq.${id}),and(de.eq.${id},a.eq.${moi})`).order("cree", { ascending: false }).limit(60);
    if (avecRef.current !== id) return;
    if (error) return setFilRate(true);
    const lus = ((data ?? []) as Msg[]).reverse();
    const vus = new Set(lus.map((m) => m.id));
    setFil([...lus, ...enAttente.current.filter((m) => !vus.has(m.id))]);
    enAttente.current = [];
    marquerLu(id);
  }

  function fermer() {
    setOuvert(false);
    setAvec(null);
    setFil(null);
  }

  function basculer() {
    if (ouvert) return fermer();
    setOuvert(true);
    void rafraichir();
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const propre = texte.trim().slice(0, MAX);
    const c = sb.current;
    const pour = avec;
    if (!propre || !pour || !c || envoi) return;
    setEnvoi(true);
    const { data, error } = await c.from("messages_amis").insert({ a: pour, texte: propre }).select(COLONNES).single();
    setEnvoi(false);
    if (avecRef.current !== pour) return;
    if (error || !data) return setErreur(true);
    setErreur(false);
    setTexte("");
    setFil((f) => [...(f ?? []), data as Msg]);
  }

  if (!uid || (!amis.length && !bulle)) return null;
  const total = amis.reduce((t, a) => t + (nonLus[a.id] ?? 0), 0);
  const nomDe = (id: string) => amis.find((a) => a.id === id)?.nom ?? M.joueur;

  return (
    <div className={s.dock}>
      {bulle && !ouvert && (
        <button type="button" className={s.bulle} onClick={() => void ouvrir(bulle.de)} aria-label={`${M.nouveau(nomDe(bulle.de))} · ${M.ouvrir}`}>
          <span className={s.bulleNom}>{M.nouveau(nomDe(bulle.de))}</span>
          <span className={s.bulleTexte}>{bulle.texte}</span>
        </button>
      )}

      {ouvert && (
        <section className={s.panneau} aria-label={ami ? ami.nom : M.titre}>
          <header className={s.tete}>
            {ami && (
              <button type="button" className={s.icone} onClick={() => (setAvec(null), setFil(null))} aria-label={M.retour}>
                ‹
              </button>
            )}
            <p className={s.titre}>{ami ? ami.nom : M.titre}</p>
            <button type="button" className={s.icone} onClick={fermer} aria-label={M.fermer}>
              ×
            </button>
          </header>

          {ami ? (
            <>
              <ol ref={liste} className={s.fil} aria-live="polite">
                {fil === null ? (
                  <li className={s.vide}>{filRate ? M.chargementRate : M.chargement}</li>
                ) : fil.length === 0 ? (
                  <li className={s.vide}>{M.aucun}</li>
                ) : (
                  fil.map((m) => (
                    <li key={m.id} className={m.de === uid ? s.moi : s.lui}>
                      {m.texte}
                    </li>
                  ))
                )}
              </ol>
              {fil && fil.length > 0 && fil[fil.length - 1].de === uid && fil[fil.length - 1].lu_le && <p className={s.vu}>{M.vu}</p>}
              {erreur && <p className={s.erreur}>{M.envoiRate}</p>}
              <form onSubmit={envoyer} className={s.champ}>
                <input
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  maxLength={MAX}
                  placeholder={M.champ}
                  aria-label={M.champ}
                  autoComplete="off"
                  autoFocus
                />
                <button type="submit" disabled={!texte.trim() || envoi || fil === null}>
                  {M.envoyer}
                </button>
              </form>
            </>
          ) : (
            <ul className={s.amis}>
              {amis.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => void ouvrir(a.id)}>
                    <span className={s.avatarBoite}>
                      {a.avatar ? <img src={a.avatar} alt="" className={s.avatar} /> : <span className={s.avatar}>{a.nom.slice(0, 1).toUpperCase()}</span>}
                      <PresenceDot userId={a.id} avatar={30} />
                    </span>
                    <span className={s.nom}>{a.nom}</span>
                    {nonLus[a.id] ? <span className={s.pastille}>{nonLus[a.id]}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <button type="button" className={s.bouton} onClick={basculer} aria-label={M.boutonAria(total)} aria-expanded={ouvert}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h16v11H9l-5 4z" />
        </svg>
        {total > 0 && <span className={s.pastille}>{total > 99 ? "99+" : total}</span>}
      </button>
    </div>
  );
}
