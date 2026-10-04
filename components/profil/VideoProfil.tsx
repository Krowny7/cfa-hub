"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

// La vidéo d'un profil (un edit court, type TikTok) : elle tourne en boucle,
// sans le son, tant qu'elle est à l'écran (en pause sinon : ni batterie ni
// données gaspillées) ; deux boutons posés dessus : le son, et pause /
// lecture. Mouvement réduit : elle attend qu'on la lance. À sa proportion
// (verticale le plus souvent), sur la largeur que lui donne sa taille
// (MediaProfil).

export function VideoProfil({ url, ratio, label }: { url: string; ratio: number; label: string }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [son, setSon] = useState(false);
  const [lecture, setLecture] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.3 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (video.current) video.current.muted = !son;
  }, [son]);

  const w = 1080;
  const h = Math.round(w / ratio);
  const bouton = "grid h-9 w-9 place-items-center rounded-full bg-[rgba(12,12,14,.55)] text-[#ffffff] backdrop-blur transition-transform hover:scale-105";
  return (
    <div className="relative">
      <video
        ref={video}
        src={url}
        aria-label={label}
        width={w}
        height={h}
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setLecture(true)}
        onPause={() => setLecture(false)}
        className="block h-auto w-full bg-black"
      />
      <div className="absolute bottom-3 right-3 flex gap-2">
        <button
          type="button"
          className={bouton}
          onClick={() => {
            const v = video.current;
            if (!v) return;
            if (v.paused) v.play().catch(() => {});
            else v.pause();
          }}
          aria-label={lecture ? "Mettre en pause" : "Lire la vidéo"}
        >
          {lecture ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
        </button>
        <button type="button" className={bouton} onClick={() => setSon((s) => !s)} aria-label={son ? "Couper le son" : "Mettre le son"} aria-pressed={son}>
          {son ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
