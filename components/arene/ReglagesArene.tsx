"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BanniereVs } from "@/components/arene/BanniereVs";
import { enregistrerArene } from "@/lib/arene/actions";
import { joueurArene, lireReglages } from "@/lib/arene/donnees";
import { envoyerImageVs, envoyerVideoVictoire } from "@/lib/arene/envoi";
import { ARENE_VIDE, FONDS, TRAITS, VICTOIRE_MAX_OCTETS, VICTOIRE_MAX_SECONDES, fondDe, type Arene } from "@/lib/arene/perso";
import { formatVideo } from "@/lib/arene/regles";
import { Mo, Refus } from "@/lib/profil/envoi-media";
import { createClient } from "@/lib/supabase/browser";
import { ARENE } from "@/lib/voice-arene";
import s from "./Arene.module.css";

// Dans Personnaliser : « Ta bannière de VS » (le fond, parmi les peintures du site
// ou son image, et la couleur du trait, avec l'aperçu) et « Ta vidéo de victoire »
// (envoi, aperçu dans son cadre, limites). Comme la photo, ces réglages
// s'enregistrent tout de suite, à part du brouillon du profil
// (lib/arene/actions.ts) : ils ne comptent pas dans « Modifications non
// enregistrées ». Sans la colonne profile_style.arene, une ligne dit que ça arrive.

const R = ARENE.reglages;

export function ReglagesArene({ joueur }: { joueur: { id: string; pseudo: string; photo: string | null; elo: number; maitrise: number | null; place: number | null } }) {
  const sb = useMemo(() => createClient(), []);
  const [arene, setArene] = useState<Arene>(ARENE_VIDE);
  const [dispo, setDispo] = useState<boolean | null>(null);
  const [envoi, setEnvoi] = useState<"image" | "video" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);
  const [pending, start] = useTransition();
  const champImage = useRef<HTMLInputElement | null>(null);
  const champVideo = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let abandon = false;
    void lireReglages(sb, joueur.id).then((r) => {
      if (abandon) return;
      setDispo(r.dispo);
      setArene(r.arene);
    });
    return () => {
      abandon = true;
    };
  }, [sb, joueur.id]);

  const fige = dispo !== true || envoi !== null;

  /** Montre le changement tout de suite, l'enregistre, revient en arrière si le serveur refuse. */
  function changer(suite: Arene) {
    const avant = arene;
    setArene(suite);
    setMsg(null);
    start(async () => {
      const r = await enregistrerArene(suite);
      if (!r.ok) {
        setArene(avant);
        setMsg({ ok: false, texte: r.erreur });
        return;
      }
      setArene(r.arene);
      setMsg({ ok: true, texte: R.enregistre });
    });
  }

  async function envoyer<T>(genre: "image" | "video", file: File | undefined, depot: (f: File) => Promise<T>, suite: (v: T) => Arene) {
    if (!file) return;
    setEnvoi(genre);
    setMsg(null);
    try {
      changer(suite(await depot(file)));
    } catch (e) {
      setMsg({ ok: false, texte: e instanceof Refus ? e.message : R.envoiRate });
    } finally {
      setEnvoi(null);
    }
  }

  const apercu = joueurArene(joueur, arene);
  const fondActif = arene.fond ?? null;
  const video = arene.video;
  const format = video ? formatVideo(video.ratio) : "vertical";

  return (
    <section id="rl-perso-arene" aria-labelledby="rl-arene-titre" className="flex scroll-mt-24 flex-col gap-5">
      <div>
        <h2 id="rl-arene-titre" className="t-eyebrow m-0">
          {R.titre}
        </h2>
        {dispo === false && <p className="t-small m-0 mt-2 rounded-[12px] border border-dashed border-line-2 p-3">{R.basePasPrete}</p>}
      </div>

      <div className={s.reglages}>
        <div className={s.colonne}>
          <h3 className="t-h3 m-0">{R.banniere}</h3>
          <div className={s.apercu}>
            <BanniereVs j={apercu} />
          </div>

          <p className="t-micro m-0">{R.fond}</p>
          <div className={s.vignettes} role="radiogroup" aria-label={R.fond}>
            {FONDS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={fondActif === f.key || (!fondActif && fondDe(arene, joueur.id).src === f.src)}
                aria-label={R.fonds[f.key]}
                title={R.fonds[f.key]}
                className={s.vigChoix}
                disabled={fige}
                onClick={() => changer({ ...arene, fond: f.key })}
              >
                <i className={s.vig} style={{ backgroundImage: `url("${f.src}")` }} />
              </button>
            ))}
            <button
              type="button"
              role="radio"
              aria-checked={fondActif === "image"}
              className={s.vigChoix}
              disabled={fige}
              onClick={() => (arene.image && fondActif !== "image" ? changer({ ...arene, fond: "image" }) : champImage.current?.click())}
            >
              <i className={s.vig} style={arene.image ? { backgroundImage: `url("${arene.image}")` } : undefined}>
                {arene.image ? null : envoi === "image" ? R.envoiEnCours : R.tonImage}
              </i>
              {arene.image && <span className="sr-only">{R.tonImage}</span>}
            </button>
            <input
              ref={champImage}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                void envoyer("image", f, (x) => envoyerImageVs(sb, x), (image) => ({ ...arene, image, fond: "image" }));
              }}
            />
          </div>

          <p className="t-micro m-0">{R.trait}</p>
          <div className={s.traits} role="radiogroup" aria-label={R.trait}>
            {TRAITS.map((t) => (
              <button key={t.key} type="button" role="radio" aria-checked={arene.trait === t.key} className={s.traitChoix} disabled={fige} onClick={() => changer({ ...arene, trait: t.key })}>
                <i style={t.key === "peinture" ? { backgroundImage: `url("${fondDe(arene, joueur.id).src}")` } : { background: t.couleur }} />
                {R.traits[t.key]}
              </button>
            ))}
          </div>
        </div>

        <div className={s.colonne}>
          <h3 className="t-h3 m-0">{R.video}</h3>
          <div className={s.videoBloc}>
            <div className={[s.video, s.videoApercu].join(" ")} data-format={format}>
              {video ? <video className={s.videoImg} src={video.url} controls playsInline preload="metadata" aria-label={R.video} /> : <div className={[s.videoImg, s.videoVide].join(" ")} />}
              <div className={s.videoCadre} />
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn btn-secondary btn-sm max-sm:min-h-[44px]" disabled={fige} onClick={() => champVideo.current?.click()}>
                  {envoi === "video" ? R.envoiEnCours : video ? R.remplacer : R.envoyer}
                </button>
                {video && (
                  <button type="button" className="btn btn-ghost btn-sm max-sm:min-h-[44px]" disabled={fige || pending} onClick={() => changer({ ...arene, video: null })}>
                    {R.retirer}
                  </button>
                )}
              </div>
              <input
                ref={champVideo}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  void envoyer("video", f, (x) => envoyerVideoVictoire(sb, x), (v) => ({ ...arene, video: v }));
                }}
              />
              {video ? (
                <p className={s.fichier}>
                  {video.nom}
                  <small>{R.fichier(video.duree, video.poids !== null ? Mo(video.poids) : null, format)}</small>
                </p>
              ) : (
                <p className="t-small m-0">{R.aucune}</p>
              )}
              <ul className={s.limites}>
                {R.limites(VICTOIRE_MAX_SECONDES, Mo(VICTOIRE_MAX_OCTETS)).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <p role="status" className={"m-0 text-[13px] font-medium " + (msg.ok ? "" : "text-pen")}>
          {msg.texte}
        </p>
      )}
    </section>
  );
}
