"use client";

import { useEffect, useRef, useState } from "react";
import { FastForward, Pause, Play, Rewind, SkipBack, SkipForward } from "lucide-react";

export type Chapter = { title: string; start: number };

const RATES = [1, 1.25, 1.5, 1.75, 2, 0.75];
const RATE_KEY = "rl_audio_rate";
const POS_PREFIX = "rl_course_pos:";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const fmtRate = (r: number) => `${String(r).replace(".", ",")}×`;

/**
 * Lecteur de l'audio d'un cours complet : barre de lecture découpée par
 * module, chapitres cliquables, vitesse de lecture, et reprise là où on
 * s'était arrêté (si `storageKey` est fourni). Les contrôles de l'écran
 * verrouillé (téléphone) suivent le module en cours.
 */
export function CourseAudioPlayer({
  src,
  chapters,
  storageKey,
  title,
  duration: durationHint,
}: {
  src: string;
  chapters: Chapter[];
  /** clé stable (ex. le slug du cours) pour mémoriser la position */
  storageKey?: string;
  /** titre du cours, affiché sur l'écran verrouillé */
  title?: string;
  /** durée connue d'avance (secondes), en attendant les métadonnées */
  duration?: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const lastSaved = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationHint ?? 0);
  const [rate, setRate] = useState(1);
  const [resumedAt, setResumedAt] = useState<number | null>(null);

  const posKey = storageKey ? POS_PREFIX + storageKey : null;

  function savePosition(t: number, total: number) {
    if (!posKey) return;
    try {
      // Fin du cours (ou presque) : la prochaine écoute repart du début.
      if (total > 0 && t > total - 15) localStorage.removeItem(posKey);
      else if (t > 5) localStorage.setItem(posKey, String(Math.round(t)));
    } catch {}
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Vitesse et position mémorisées
    try {
      const r = Number(localStorage.getItem(RATE_KEY));
      if (RATES.includes(r)) {
        audio.playbackRate = r;
        setRate(r);
      }
      const saved = posKey ? Number(localStorage.getItem(posKey)) : 0;
      if (saved > 5) {
        pendingSeek.current = saved;
        setCurrent(saved);
        setResumedAt(saved);
      }
    } catch {}

    const applyPending = () => {
      const p = pendingSeek.current;
      if (p === null) return;
      pendingSeek.current = null;
      if (!audio.duration || p < audio.duration - 5) audio.currentTime = p;
    };
    const onTime = () => {
      setCurrent(audio.currentTime);
      if (Math.abs(audio.currentTime - lastSaved.current) >= 5) {
        lastSaved.current = audio.currentTime;
        savePosition(audio.currentTime, audio.duration || 0);
      }
    };
    const onLoaded = () => {
      if (audio.duration && Number.isFinite(audio.duration)) setDuration(audio.duration);
      applyPending();
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      savePosition(audio.currentTime, audio.duration || 0);
    };
    const onEnded = () => {
      setPlaying(false);
      savePosition(audio.duration || 0, audio.duration || 0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    if (audio.readyState >= 1) onLoaded();
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posKey]);

  function play() {
    audioRef.current?.play().catch(() => {});
  }

  function seekTo(sec: number) {
    const audio = audioRef.current;
    if (!audio) return;
    pendingSeek.current = null;
    audio.currentTime = sec;
    setCurrent(sec);
    play();
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      // Position mémorisée pas encore appliquée (métadonnées en retard)
      if (pendingSeek.current !== null && audio.readyState >= 1) {
        audio.currentTime = pendingSeek.current;
        pendingSeek.current = null;
      }
      play();
    } else audio.pause();
  }

  function skip(delta: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const max = audio.duration || durationHint || 0;
    const t = Math.max(0, Math.min(max, audio.currentTime + delta));
    audio.currentTime = t;
    setCurrent(t);
  }

  function cycleRate() {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
    try {
      localStorage.setItem(RATE_KEY, String(next));
    } catch {}
  }

  function onScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number(e.target.value);
    pendingSeek.current = null;
    audio.currentTime = t;
    setCurrent(t);
  }

  const activeIndex = chapters.reduce((acc, ch, i) => (current >= ch.start ? i : acc), 0);
  const active = chapters[activeIndex];
  const chapterEnd = chapters[activeIndex + 1]?.start ?? duration;
  const chapterPct = active && chapterEnd > active.start ? Math.min(100, ((current - active.start) / (chapterEnd - active.start)) * 100) : 0;
  const pct = duration ? Math.min(100, (current / duration) * 100) : 0;

  // Lit la position sur l'élément audio (et pas dans l'état) : sert aussi aux
  // boutons de l'écran verrouillé, enregistrés une seule fois.
  function goChapter(delta: number) {
    const t = audioRef.current?.currentTime ?? 0;
    const i = chapters.reduce((acc, ch, k) => (t >= ch.start ? k : acc), 0);
    // « Précédent » au milieu d'un module revient à son début (comme un lecteur de musique)
    if (delta < 0 && t - (chapters[i]?.start ?? 0) > 5) return seekTo(chapters[i].start);
    const ch = chapters[Math.max(0, Math.min(chapters.length - 1, i + delta))];
    if (ch) seekTo(ch.start);
  }

  // Écran verrouillé / casque : titre du module en cours et boutons.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !active) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: active.title,
        artist: title ?? "Cours complet",
        album: "Ranked Lobby",
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, title]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler("play", () => play());
      navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
      navigator.mediaSession.setActionHandler("seekbackward", () => skip(-15));
      navigator.mediaSession.setActionHandler("seekforward", () => skip(15));
      navigator.mediaSession.setActionHandler("previoustrack", () => goChapter(-1));
      navigator.mediaSession.setActionHandler("nexttrack", () => goChapter(1));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Le module en cours reste visible dans la liste quand elle défile en interne
  // (grand écran) ; on ne fait jamais défiler la page elle-même.
  useEffect(() => {
    const list = listRef.current;
    const row = list?.children[activeIndex] as HTMLElement | undefined;
    if (!list || !row || list.scrollHeight <= list.clientHeight + 1) return;
    // (la liste est positionnée : offsetTop est relatif à elle)
    const top = row.offsetTop;
    if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: Math.max(0, top - 8), behavior: "smooth" });
    }
  }, [activeIndex]);

  return (
    <div className="flex flex-col gap-4">
      <div className="card-hero p-5 md:p-6">
        <audio ref={audioRef} src={src} preload="metadata" />

        <p className="t-eyebrow">
          Module {activeIndex + 1} / {chapters.length}
        </p>
        <h2 className="t-h3 mt-1.5 line-clamp-2 min-h-[2.5em]">{active?.title ?? "Cours complet"}</h2>

        {/* Barre de lecture : un repère par module, curseur d'encre */}
        <div className="relative mt-5 h-6">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-[var(--well)]">
            <span className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${pct}%` }} />
          </div>
          {duration > 0 &&
            chapters.slice(1).map((ch) => (
              <span
                key={ch.start}
                className="absolute top-1/2 h-1.5 w-[1.5px] -translate-x-1/2 -translate-y-1/2 bg-[var(--hero-top)]"
                style={{ left: `${(ch.start / duration) * 100}%` }}
                aria-hidden
              />
            ))}
          <span
            className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_3px_var(--hero-top),0_1px_3px_rgba(0,0,0,0.3)]"
            style={{ left: `${pct}%` }}
            aria-hidden
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(current, duration || current)}
            onChange={onScrub}
            aria-label="Position dans le cours"
            aria-valuetext={`${formatTime(current)} sur ${formatTime(duration)}`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[12px] text-muted tabular-nums">
          <span>{formatTime(current)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={cycleRate}
            className="btn btn-ghost btn-sm w-[58px] shrink-0 px-0 font-mono text-[13px] tabular-nums"
            aria-label={`Vitesse de lecture : ${fmtRate(rate)}. Changer`}
            title="Vitesse de lecture"
          >
            {fmtRate(rate)}
          </button>
          <div className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => goChapter(-1)} className="icon-btn border-transparent bg-transparent shadow-none" aria-label="Module précédent" title="Module précédent">
              <SkipBack size={17} />
            </button>
            <button type="button" onClick={() => skip(-15)} className="icon-btn" aria-label="Reculer de 15 secondes" title="Reculer de 15 s">
              <Rewind size={17} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="btn btn-primary h-14 w-14 shrink-0 rounded-full p-0"
              aria-label={playing ? "Pause" : "Lecture"}
            >
              {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="translate-x-[1px]" />}
            </button>
            <button type="button" onClick={() => skip(15)} className="icon-btn" aria-label="Avancer de 15 secondes" title="Avancer de 15 s">
              <FastForward size={17} />
            </button>
            <button type="button" onClick={() => goChapter(1)} className="icon-btn border-transparent bg-transparent shadow-none" aria-label="Module suivant" title="Module suivant">
              <SkipForward size={17} />
            </button>
          </div>
          <span className="w-[58px] shrink-0" aria-hidden />
        </div>
        {resumedAt !== null && !playing && Math.abs(current - resumedAt) < 1 && (
          <p className="t-micro mt-3 text-center">Reprise là où tu t&apos;étais arrêté, à {formatTime(resumedAt)}.</p>
        )}
      </div>

      <div className="card p-1.5">
        <ol ref={listRef} className="relative lg:max-h-[calc(100vh-30rem)] lg:min-h-[180px] lg:overflow-y-auto">
          {chapters.map((ch, i) => {
            const on = i === activeIndex;
            const end = chapters[i + 1]?.start ?? duration;
            return (
              <li key={ch.start}>
                <button
                  type="button"
                  onClick={() => seekTo(ch.start)}
                  aria-current={on ? "true" : undefined}
                  className={`rl-row relative flex w-full items-start gap-3 rounded-[12px] px-3 py-2.5 text-left ${on ? "bg-surface-2" : ""}`}
                >
                  <span className={`w-6 shrink-0 pt-px font-mono text-[12px] tabular-nums ${on ? "font-semibold text-white" : "text-muted"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[14px] leading-snug ${on ? "font-semibold text-white" : "text-body"}`}>{ch.title}</span>
                    {on && (
                      <span className="mt-2 block h-[3px] overflow-hidden rounded-full bg-[var(--well)]" aria-hidden>
                        <span className="block h-full rounded-full bg-white" style={{ width: `${chapterPct}%` }} />
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 pt-px font-mono text-[12px] text-muted tabular-nums">
                    {on && playing ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-white">
                        <span className="h-1.5 w-1.5 rounded-full bg-white motion-safe:animate-pulse" aria-hidden />
                        −{formatTime(end - current)}
                      </span>
                    ) : (
                      formatTime(ch.start)
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
