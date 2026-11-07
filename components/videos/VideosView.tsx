"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Clapperboard, Play } from "lucide-react";
import { dureeVideo, type VideoResume } from "@/lib/videos";
import { VIDEOS_TXT as T, horodatage, minutesDe } from "@/lib/voice-videos";

export type SourceVideo = { src: string | null; affiche: string | null };

// Page des vidéos résumé : le lecteur et ses chapitres (cliquables, celui en cours surligné), puis la liste
// des vidéos. Une vidéo d'une heure est une suite de parties jouées à la suite : à la fin d'une partie,
// la suivante démarre seule.
export function VideosView({ videos, video, sources }: { videos: VideoResume[]; video: VideoResume | null; sources: SourceVideo[] }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [partie, setPartie] = useState(0);
  const [saut, setSaut] = useState<number | null>(null);
  const [t, setT] = useState(0);
  const p = video?.parties[partie] ?? null;
  const s = sources[partie] ?? null;

  // après un changement de partie : se placer au bon moment puis lire
  useEffect(() => {
    const v = ref.current;
    if (!v || saut === null) return;
    const aller = () => {
      v.currentTime = saut;
      void v.play().catch(() => {});
      setSaut(null);
    };
    if (v.readyState >= 1) aller();
    else v.addEventListener("loadedmetadata", aller, { once: true });
    return () => v.removeEventListener("loadedmetadata", aller);
  }, [saut, partie]);

  function allerA(i: number, debut: number) {
    if (i !== partie) {
      setPartie(i);
      setT(debut);
      setSaut(debut);
    } else if (ref.current) {
      ref.current.currentTime = debut;
      setT(debut);
      void ref.current.play().catch(() => {});
    }
  }

  function suivante() {
    if (video && partie < video.parties.length - 1) allerA(partie + 1, 0);
  }

  // décalage de chaque partie dans la vidéo entière, pour afficher des horaires continus
  const decalages = video ? video.parties.map((_, i) => video.parties.slice(0, i).reduce((x, q) => x + q.secondes, 0)) : [];

  return (
    <div className="rl-wide flex flex-col gap-6 md:gap-8">
      <header className="min-w-0">
        <Link href="/reviser" className="t-small inline-flex items-center gap-1.5 font-semibold hover:text-white">
          <ArrowLeft size={14} aria-hidden /> {T.retour}
        </Link>
        <h1 className="t-h1 mt-3">{T.titre}</h1>
        <p className="t-small mt-2 max-w-[62ch]">{T.sous}</p>
      </header>

      {video && p ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
          <section className="min-w-0">
            <div className="card overflow-hidden">
              {s?.src ? (
                <video
                  ref={ref}
                  key={s.src}
                  src={s.src}
                  poster={s.affiche ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="block aspect-video w-full bg-black"
                  onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
                  onEnded={suivante}
                />
              ) : (
                <div className="grid aspect-video w-full place-items-center px-6 text-center">
                  <p className="t-small">{T.indisponible}</p>
                </div>
              )}
            </div>
            <p className="t-eyebrow mt-4">
              {video.numero ? T.serie(video.numero) : T.exemple} · {video.matieres.join(" · ")}
            </p>
            <h2 className="t-h2 mt-1">{video.titre}</h2>
            <p className="t-small mt-1">
              {T.minutes(minutesDe(dureeVideo(video)))}
              {video.parties.length > 1 ? ` · ${T.partie(partie + 1, video.parties.length)}` : ""}
            </p>
          </section>

          <aside aria-label={T.auProgramme} className="card min-w-0 p-4 lg:sticky lg:top-[84px]">
            <p className="t-eyebrow">{T.auProgramme}</p>
            <ol className="mt-3 flex flex-col gap-0.5">
              {video.parties.map((q, i) =>
                q.chapitres.map((c, k) => {
                  const fin = q.chapitres[k + 1]?.debut ?? q.secondes;
                  const actif = i === partie && t >= c.debut && t < fin;
                  return (
                    <li key={`${i}-${k}`}>
                      <button
                        type="button"
                        onClick={() => allerA(i, c.debut)}
                        aria-current={actif ? "true" : undefined}
                        className={
                          "flex w-full items-baseline gap-3 rounded-md px-2.5 py-2 text-left text-[14px] transition-colors " +
                          (actif ? "bg-surface-2 font-semibold text-white" : "text-muted hover:bg-surface-2 hover:text-white")
                        }
                      >
                        <span className="t-num w-12 shrink-0 text-[12px] opacity-70">{horodatage(decalages[i] + c.debut)}</span>
                        <span className="min-w-0 flex-1">{k === 0 && video.parties.length > 1 ? q.titre : c.titre}</span>
                        {actif && <Play size={12} className="shrink-0" aria-label={T.enCours} />}
                      </button>
                    </li>
                  );
                }),
              )}
            </ol>
          </aside>
        </div>
      ) : (
        <div className="card-quiet px-6 py-12 text-center">
          <Clapperboard size={20} className="mx-auto text-muted" aria-hidden />
          <p className="t-small mt-3">{T.aucune}</p>
        </div>
      )}

      <section aria-label={T.toutes} className="min-w-0">
        <p className="t-eyebrow">{T.toutes}</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {videos.map((v) => {
            const enLigne = v.etat === "en-ligne" && v.parties.length > 0;
            const courante = v.slug === video?.slug;
            const contenu = (
              <>
                <span className="t-eyebrow">{v.numero ? T.serie(v.numero) : T.exemple}</span>
                <span className="t-h3 mt-1 block">{v.titre}</span>
                <span className="t-small mt-1 block">{v.matieres.join(" · ")}</span>
                <span className="t-micro mt-3 block">
                  {enLigne ? (courante ? T.enCours : T.minutes(minutesDe(dureeVideo(v)))) : T.enPreparation}
                </span>
              </>
            );
            return (
              <li key={v.slug} className="min-w-0">
                {enLigne ? (
                  <Link href={`/videos?v=${v.slug}`} aria-current={courante ? "page" : undefined} className={"card card-hover block h-full p-4" + (courante ? " ring-1 ring-white/30" : "")}>
                    {contenu}
                  </Link>
                ) : (
                  <div className="card-quiet block h-full p-4 opacity-70">{contenu}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
