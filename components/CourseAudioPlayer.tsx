"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Rewind, FastForward } from "lucide-react";

export type Chapter = { title: string; start: number };

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CourseAudioPlayer({ src, chapters }: { src: string; chapters: Chapter[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  function seekTo(sec: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = sec;
    audio.play();
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }

  function skip(delta: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + delta));
  }

  function onScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
  }

  const activeIndex = chapters.reduce(
    (acc, ch, i) => (current >= ch.start ? i : acc),
    0
  );
  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div className="card p-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => skip(-15)}
          className="btn btn-ghost shrink-0 p-2"
          title="Reculer de 15s"
        >
          <Rewind size={16} />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className="btn btn-primary shrink-0 rounded-full p-3"
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          type="button"
          onClick={() => skip(15)}
          className="btn btn-ghost shrink-0 p-2"
          title="Avancer de 15s"
        >
          <FastForward size={16} />
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={onScrub}
            className="w-full accent-blue-400"
          />
          <div className="mt-0.5 flex justify-between text-[11px] tabular-nums text-white/40">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06] sm:hidden">
        <div className="h-full rounded-full bg-blue-400/70 transition-[width]" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 grid gap-1">
        {chapters.map((ch, i) => (
          <button
            key={ch.start}
            type="button"
            onClick={() => seekTo(ch.start)}
            className={[
              "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
              i === activeIndex && playing
                ? "bg-blue-500/15 text-blue-200"
                : "text-white/70 hover:bg-white/[0.05] hover:text-white/90",
            ].join(" ")}
          >
            <span className="min-w-0 truncate">
              <span className="mr-2 text-white/30 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              {ch.title}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-white/30">{formatTime(ch.start)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
