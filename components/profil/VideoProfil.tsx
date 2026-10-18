"use client";

import { useEffect, useRef } from "react";

// La vidéo d'un profil (un edit court, type TikTok) : elle tourne en boucle,
// toujours, sans le son et sans aucun bouton (même en mouvement réduit :
// c'est la page du joueur, qui l'a choisie). À sa proportion (verticale le
// plus souvent), dans la place que lui donne le format de son bloc
// (BlocProfil). L'adresse porte sa couverture (« #t= ») : c'est l'image
// qu'on voit avant la lecture, mais la lecture part de 0 (une fois les
// métadonnées chargées : avant, le navigateur sauterait à la couverture),
// pour que l'edit se voie depuis son début. Si le navigateur refuse la
// lecture automatique (économie d'énergie), elle part au premier geste sur
// la page. Une nouvelle adresse (la couverture réglée dans Personnaliser)
// recharge la vidéo : elle repart de 0 et reprend aussitôt. Pas d'attribut
// autoPlay : il lancerait la lecture à la couverture avant l'hydratation,
// puis la vidéo sauterait à 0.

export function VideoProfil({ url, ratio, label }: { url: string; ratio: number; label: string }) {
  const video = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    const auDebut = () => {
      v.currentTime = 0;
    };
    if (v.readyState >= 1) auDebut();
    else v.addEventListener("loadedmetadata", auDebut, { once: true });
    const lancer = () => {
      v.play().then(
        () => document.removeEventListener("pointerdown", lancer),
        () => {},
      );
    };
    // lecture refusée : elle part au premier geste sur la page
    document.addEventListener("pointerdown", lancer);
    lancer();
    return () => {
      document.removeEventListener("pointerdown", lancer);
      v.removeEventListener("loadedmetadata", auDebut);
    };
  }, [url]);

  const w = 1080;
  const h = Math.round(w / ratio);
  return (
    <div className="relative">
      <video ref={video} src={url} aria-label={label} width={w} height={h} muted loop playsInline preload="metadata" className="block h-auto w-full bg-black" />
    </div>
  );
}
