"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import { ArcElectrique } from "@/components/ui/ArcElectrique";
import { useHorsEcran } from "@/components/ui/useHorsEcran";
import { LienJoueur } from "@/components/profil/CarteJoueur";
import { TitrePorte } from "@/components/profil/TitrePorte";
import { OrnementBanniere, PersoBanniere } from "@/components/profil/BanniereHeros";
import { BanniereComposee } from "@/components/profil/BanniereComposee";
import { signed } from "@/components/classement/format";
import type { BoardRow } from "@/components/classement/types";
import type { Composition } from "@/lib/profil/banniere";
import { PLACEMENT_GAMES, TIERS, rankFor, teinteDeRang } from "@/lib/ranks";
import { nombre, pct } from "@/lib/voice";
import { PODIUM } from "@/lib/voice-z2a";
import s from "./Podium.module.css";

// Le podium du Classement : les trois premiers en bannières de champions.
// - le fond est l'image de bannière que le joueur a choisie dans son profil
//   (sinon une des peintures du Classement, toujours la même pour lui) ;
// - le cadre est son rang : le liquide marbré du palier (public/ranks/v2),
//   qui dérive ; l'insigne est celui du palier ;
// - la carte s'incline sous la souris ou le doigt, avec un reflet
//   holographique ; au repos, elle se balance doucement, chacune à son
//   rythme ; le n° 1 a un arc électrique autour de son insigne ;
// - toute la carte mène au profil du joueur (sa carte d'abord, comme partout
//   dans le Classement) ;
// - la bannière « façon jeu » du joueur : son ornement (le cadre qu'il a
//   gagné : filet, cartouche, laurier, fronton) habille la carte, et son
//   personnage, posé en bas, dépasse du haut du fanion (BanniereHeros.tsx :
//   la même règle que l'aperçu de Personnaliser). Avec un personnage,
//   l'insigne passe dans le coin du haut pour lui laisser la place, et le
//   podium réserve au-dessus la place du débordement (data-perso) : rien ne
//   se chevauche. Sans personnage, la carte est celle d'avant.
// - la bannière COMPOSÉE du joueur (profile_style.banniere : son fond, son
//   cadre, son personnage et ses deux pièces, qui débordent dans la marge
//   transparente) remplace le fanion : BanniereComposee, à la largeur de la
//   place, sa zone de débordement comprise ; dessous, une petite plaque dit la
//   place, l'insigne (l'arc électrique du n° 1 le suit), le pseudo, le titre
//   et le rang. Pas de panneau ici : la carte complète est sur le profil.
// Léger : une seule boucle pour les trois cartes, qui ne tourne que lorsque le
// podium est à l'écran ; rien ne bouge en mouvement réduit, avec
// ?mouvement=off et en mode discret.

/** Peintures du Classement (San Romano), pour les joueurs sans bannière : toujours la même pour un joueur donné. */
const PAR_DEFAUT = ["/illustrations/classement-lice.webp", "/illustrations/joueurs-seigneurie.webp", "/illustrations/classement-grande-salle.webp"];
const fondParDefaut = (userId: string) => PAR_DEFAUT[[...userId].reduce((n, c) => n + c.charCodeAt(0), 0) % PAR_DEFAUT.length];

/** Incline les cartes d'un podium (données dans data-holo) : sous le pointeur, ou en balancement doux au repos. */
function useInclinaison(racine: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = racine.current;
    if (!root) return;
    const html = document.documentElement;
    const cartes = [...root.querySelectorAll<HTMLElement>("[data-holo]")].map((el, i) => ({ el, actif: false, phase: i * 1.7 }));
    const calme = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || html.dataset.rlMotion === "off" || html.dataset.discreet === "1";
    const pose = (el: HTMLElement, px: number, py: number) => {
      el.style.setProperty("--ry", ((px - 0.5) * 24).toFixed(2) + "deg");
      el.style.setProperty("--rx", ((0.5 - py) * 18).toFixed(2) + "deg");
      el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
    };
    const remet = () => {
      for (const c of cartes) for (const v of ["--rx", "--ry", "--mx", "--my"]) c.el.style.removeProperty(v);
    };

    let visible = false;
    let raf = 0;
    let dernier = 0;
    const boucle = (t: number) => {
      raf = 0;
      if (!visible || document.hidden || calme()) return;
      if (t - dernier >= 33) {
        dernier = t;
        for (const c of cartes) {
          if (c.actif) continue;
          const a = t / 1000 + c.phase;
          pose(c.el, 0.5 + Math.sin(a * 0.8) * 0.22, 0.45 + Math.cos(a * 0.6) * 0.16);
        }
      }
      raf = requestAnimationFrame(boucle);
    };
    const relance = () => {
      if (calme()) {
        for (const c of cartes) c.actif = false;
        remet();
        return;
      }
      if (visible && !document.hidden && !raf) raf = requestAnimationFrame(boucle);
    };

    const fins: Array<() => void> = [];
    for (const c of cartes) {
      const suit = (ev: PointerEvent) => {
        if (calme()) return;
        const r = c.el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        c.actif = true;
        pose(c.el, Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)));
      };
      const lache = () => {
        c.actif = false;
      };
      c.el.addEventListener("pointermove", suit);
      c.el.addEventListener("pointerdown", suit);
      c.el.addEventListener("pointerleave", lache);
      c.el.addEventListener("pointercancel", lache);
      fins.push(() => {
        c.el.removeEventListener("pointermove", suit);
        c.el.removeEventListener("pointerdown", suit);
        c.el.removeEventListener("pointerleave", lache);
        c.el.removeEventListener("pointercancel", lache);
      });
    }

    const obs = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((list) => {
      visible = list[list.length - 1].isIntersecting;
      relance();
    });
    if (obs) obs.observe(root);
    else visible = true;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const attrs = new MutationObserver(relance);
    attrs.observe(html, { attributes: true, attributeFilter: ["data-discreet", "data-rl-motion"] });
    mq.addEventListener("change", relance);
    document.addEventListener("visibilitychange", relance);
    relance();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      obs?.disconnect();
      attrs.disconnect();
      mq.removeEventListener("change", relance);
      document.removeEventListener("visibilitychange", relance);
      for (const f of fins) f();
    };
  }, [racine]);
}

/** Le fond d'une bannière composée qui n'a pas le sien : l'image de bannière du profil du joueur, sinon sa peinture du Classement. */
function FondPodium({ r }: { r: BoardRow }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={r.bannerUrl || fondParDefaut(r.userId)} alt="" loading="lazy" decoding="async" draggable={false} />;
}

/** La place d'un joueur qui a composé sa bannière : la bannière entière (marge de débordement comprise), puis la plaque de son identité. */
function BanniereCompose({ r, place, composition }: { r: BoardRow; place: 1 | 2 | 3; composition: Composition }) {
  const first = place === 1;
  const rk = rankFor(r.elo, r.mastery, r.rank);
  const tier = rk.tierIndex;
  const placement = r.gamesPlayed < PLACEMENT_GAMES;
  const nomRang = placement ? PODIUM.placement(r.gamesPlayed, PLACEMENT_GAMES) : `${rk.tier.name}${rk.division ? ` ${rk.division}` : ""}`;
  const style = { "--teinte": teinteDeRang(tier) } as CSSProperties;
  return (
    <LienJoueur
      id={r.userId}
      nom={r.name}
      className={s.composee + (first ? " " + s.premier : "")}
      style={style}
      data-holo=""
      data-composee=""
      aria-label={`${PODIUM.place(place)} : ${r.isMe ? "toi" : r.name}, ${nomRang}, ${r.elo} ELO`}
    >
      <BanniereComposee composition={composition} fond={<FondPodium r={r} />} metal={TIERS[tier].metal[1]} />
      <span className={s.plaqueId}>
        <span className={s.plaqueTete}>
          <span aria-hidden className={s.placeC + " font-brand"}>
            {place}
          </span>
          <span className={s.insigneC}>
            {first && (
              <span aria-hidden className={s.arcPlaque}>
                <ArcElectrique palier={tier} rayon={999} />
              </span>
            )}
            {/* sur le podium, l'insigne reste en couleur même en placement (palier de l'ELO actuel) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/ranks/v2/petit-${tier}-128.png`} width={128} height={128} alt="" draggable={false} />
          </span>
        </span>
        <span className={s.pseudo + " font-brand"}>{r.isMe ? PODIUM.toi : r.name}</span>
        <TitrePorte titre={r.titre} className="-mt-[1cqw] text-[length:max(10px,5.4cqw)] [color:rgba(255,255,255,0.86)] [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]" />
        <span className={s.rang}>
          <span>{nomRang}</span>
          <b>{nombre(r.elo)}</b>
        </span>
      </span>
    </LienJoueur>
  );
}

function Banniere({ r, place }: { r: BoardRow; place: 1 | 2 | 3 }) {
  // la bannière composée du joueur, si elle est enregistrée : elle remplace le fanion
  if (r.banniere) return <BanniereCompose r={r} place={place} composition={r.banniere} />;
  const first = place === 1;
  const rk = rankFor(r.elo, r.mastery, r.rank);
  const tier = rk.tierIndex;
  const placement = r.gamesPlayed < PLACEMENT_GAMES;
  const nomRang = placement ? PODIUM.placement(r.gamesPlayed, PLACEMENT_GAMES) : `${rk.tier.name}${rk.division ? ` ${rk.division}` : ""}`;
  // les chiffres qui existent vraiment : les parties jouées, la maîtrise, le dernier match
  const stats: Array<[string, string]> = [[nombre(r.gamesPlayed), PODIUM.parties]];
  if (r.mastery !== null) stats.push([pct(r.mastery), PODIUM.maitrise]);
  if (r.lastDelta !== null && r.lastDelta !== 0) stats.push([signed(r.lastDelta), PODIUM.dernier]);
  const perso = r.perso || null;
  const style = {
    "--liq": `url(/ranks/v2/liquide-${tier}.webp)`,
    "--teinte": teinteDeRang(tier),
    "--n": stats.length,
  } as CSSProperties;
  return (
    <LienJoueur
      id={r.userId}
      nom={r.name}
      className={s.banniere + (first ? " " + s.premier : "") + (perso ? " " + s.avecPerso : "")}
      style={style}
      data-holo=""
      data-ornement={r.ornement || "filet"}
      aria-label={`${PODIUM.place(place)} : ${r.isMe ? "toi" : r.name}, ${nomRang}, ${r.elo} ELO`}
    >
      <span aria-hidden className={s.cadre} />
      <span aria-hidden className={s.forme}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={s.fond} src={r.bannerUrl || fondParDefaut(r.userId)} alt="" loading="lazy" decoding="async" draggable={false} />
        <span className={s.ombre} />
      </span>
      <OrnementBanniere cle={r.ornement} />
      {perso && <PersoBanniere perso={perso} taille={r.persoTaille} pos={r.persoPos} />}
      <span aria-hidden className={s.place + " font-brand"}>
        {place}
      </span>
      {first && (
        <span aria-hidden className={s.arcWrap}>
          <ArcElectrique palier={tier} rayon={999} />
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {/* sur le podium, l'insigne reste en couleur même en placement (palier de l'ELO actuel) */}
      <img className={s.insigne} src={`/ranks/v2/petit-${tier}-128.png`} width={128} height={128} alt="" draggable={false} />
      <span className={s.bas}>
        <span className={s.pseudo + " font-brand"}>{r.isMe ? PODIUM.toi : r.name}</span>
        <TitrePorte titre={r.titre} className="-mt-[1cqw] text-[length:max(10px,5.4cqw)] [color:rgba(255,255,255,0.86)] [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]" />
        <span className={s.rang}>
          <span>{nomRang}</span>
          <b>{nombre(r.elo)}</b>
        </span>
        <span className={s.stats} aria-hidden>
          {stats.map(([v, k]) => (
            <span key={k}>
              {v}
              <small>{k}</small>
            </span>
          ))}
        </span>
      </span>
      <span aria-hidden className={s.reflet} />
    </LienJoueur>
  );
}

// Une place que personne n'a encore prise (le joueur n'a pas joué) : la même
// bannière, en grisé, qui mène aux duels.
function BanniereLibre({ place }: { place: 1 | 2 | 3 }) {
  const style = { "--liq": "url(/encres/san-romano.webp)", "--teinte": "var(--muted, #8a8a84)", "--n": 0 } as CSSProperties;
  return (
    <Link href="/duel" className={s.banniere + (place === 1 ? " " + s.premier : "")} style={style} data-holo="" aria-label={PODIUM.libreAria(place)}>
      <span aria-hidden className={s.cadre} />
      <span aria-hidden className={s.forme}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={s.fond} src="/illustrations/classement-lice.webp" alt="" loading="lazy" decoding="async" draggable={false} style={{ filter: "brightness(0.72)" }} />
        <span className={s.ombre} />
      </span>
      <span aria-hidden className={s.place + " font-brand"}>
        {place}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.insigne} src="/ranks/v2/petit-0-128.png" width={128} height={128} alt="" draggable={false} style={{ opacity: 0.6 }} />
      <span className={s.bas}>
        <span className={s.pseudo + " font-brand"}>{PODIUM.libre}</span>
        <span className={s.rang}>
          <span>{PODIUM.libreLigne}</span>
        </span>
      </span>
      <span aria-hidden className={s.reflet} />
    </Link>
  );
}

/** Les trois premiers du classement, en bannières (le n° 1 au centre, plus grand). `rows` : les trois premiers, dans l'ordre 1, 2, 3 ; null = place encore à prendre. */
export function PodiumBannieres({ rows, label }: { rows: [BoardRow | null, BoardRow | null, BoardRow | null]; label: string }) {
  const racine = useRef<HTMLDivElement | null>(null);
  useHorsEcran(racine);
  useInclinaison(racine);
  // un personnage de fanion quelque part : le podium garde au-dessus la place de sa tête (une bannière composée a sa propre marge)
  const avecPerso = rows.some((r) => !!r?.perso && !r.banniere);
  return (
    <div ref={racine} className={s.podium} role="group" aria-label={label} data-perso={avecPerso ? "1" : "0"}>
      {rows[0] ? <Banniere r={rows[0]!} place={1} /> : <BanniereLibre place={1} />}
      {rows[1] ? <Banniere r={rows[1]!} place={2} /> : <BanniereLibre place={2} />}
      {rows[2] ? <Banniere r={rows[2]!} place={3} /> : <BanniereLibre place={3} />}
    </div>
  );
}
