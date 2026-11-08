// Toute vidéo de victoire est réencodée dans le navigateur avant l'envoi, pour ménager le stockage
// et le chargement chez les autres joueurs. D'abord par WebCodecs (mediabunny, chargé seulement ici) :
// l'encodeur de la machine, bien plus vite que la lecture (2026-11-08 : 35 s de vidéo prenaient plus
// de 35 s). Sinon, ou si une piste se perdait (le son), on la rejoue dans un canevas, le son passe à
// part, et on enregistre le tout à un débit modéré : ça prend le temps de la vidéo, sans rien jouer
// sur les haut-parleurs. Une vidéo MP4 ou WebM déjà légère part telle quelle (`dejaLegere`).
// Module client : importé par lib/arene/envoi.ts.

const FORMATS = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
const COTE_MAX = 1280;
const DEBIT_MAX = 4_000_000;
const DEBIT_SON = 128_000;
/** On vise un peu sous la limite : l'encodeur ne respecte son débit qu'en moyenne. */
const MARGE = 0.75;

/** Le format d'enregistrement du navigateur, ou `null` s'il ne sait pas faire. */
export function formatDeCompression(): string | null {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement.prototype.captureStream !== "function") return null;
  return FORMATS.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

/** La taille de sortie : on garde le cadrage, et le grand côté s'arrête à 1280 pixels. */
export function tailleCompressee(largeur: number, hauteur: number): { l: number; h: number } {
  const k = Math.min(1, COTE_MAX / Math.max(largeur, hauteur));
  // les encodeurs veulent des dimensions paires
  return { l: Math.max(2, Math.round((largeur * k) / 2) * 2), h: Math.max(2, Math.round((hauteur * k) / 2) * 2) };
}

/** Le débit vidéo pour rester sous `plafond` octets sur `duree` secondes. */
export function debitPour(plafond: number, duree: number): number {
  const total = (plafond * MARGE * 8) / Math.max(1, duree);
  return Math.max(500_000, Math.min(DEBIT_MAX, Math.round(total - DEBIT_SON)));
}

/** Déjà au débit visé ou en dessous : la réencoder ne gagnerait rien (MP4 ou WebM seulement, lus partout). */
export const dejaLegere = (type: string, octets: number, duree: number): boolean =>
  (type === "video/mp4" || type === "video/webm") && octets <= ((DEBIT_MAX + DEBIT_SON) / 8) * Math.max(1, duree);

type Progression = (part: number) => void;

/**
 * Réencode `file` ; `progression` reçoit la part faite, de 0 à 1. Lève une erreur si le
 * navigateur n'y arrive pas : à l'appelant de dire quoi faire.
 */
export async function compresserVideo(file: Blob, duree: number, plafond: number, progression?: Progression): Promise<{ blob: Blob; type: string }> {
  try {
    return await compresserVite(file, duree, plafond, progression);
  } catch {
    progression?.(0);
    return compresserEnDirect(file, duree, plafond, progression);
  }
}

/** Les pistes perdues faute de codec : on ne veut pas d'une vidéo muette, la lecture garde le son. */
const PERTES = ["unknown_source_codec", "undecodable_source_codec", "no_encodable_target_codec"];

async function compresserVite(file: Blob, duree: number, plafond: number, progression?: Progression): Promise<{ blob: Blob; type: string }> {
  if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") throw new Error("WebCodecs indisponible");
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    const piste = await input.getPrimaryVideoTrack();
    if (!piste) throw new Error("pas d'image");
    const { l, h } = tailleCompressee(await piste.getDisplayWidth(), await piste.getDisplayHeight());
    const output = new mb.Output({ format: new mb.Mp4OutputFormat(), target: new mb.BufferTarget() });
    const conversion = await mb.Conversion.init({
      input,
      output,
      tracks: "primary",
      showWarnings: false,
      video: { width: l, height: h, fit: "fill", quality: new mb.Quality({ bitrate: debitPour(plafond, duree) }) },
      audio: { quality: new mb.Quality({ bitrate: DEBIT_SON }) },
    });
    if (!conversion.isValid || conversion.discardedTracks.some((d) => PERTES.includes(d.reason))) throw new Error("conversion incomplète");
    if (progression) conversion.onProgress = progression;
    await conversion.execute();
    const sortie = output.target.buffer;
    if (!sortie || sortie.byteLength === 0) throw new Error("compression vide");
    return { blob: new Blob([sortie], { type: "video/mp4" }), type: "video/mp4" };
  } finally {
    input.dispose();
  }
}

/** L'ancienne voie, partout où MediaRecorder existe : la vidéo rejouée dans un canevas, en temps réel. */
async function compresserEnDirect(file: Blob, duree: number, plafond: number, progression?: Progression): Promise<{ blob: Blob; type: string }> {
  const format = formatDeCompression();
  if (!format) throw new Error("compression indisponible");

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.playsInline = true;
  video.preload = "auto";
  let audio: AudioContext | null = null;
  let horloge = 0;
  try {
    await new Promise<void>((ok, ko) => {
      video.onloadedmetadata = () => ok();
      video.onerror = () => ko(new Error("vidéo illisible"));
    });
    const { l, h } = tailleCompressee(video.videoWidth, video.videoHeight);
    const toile = document.createElement("canvas");
    toile.width = l;
    toile.height = h;
    const c = toile.getContext("2d");
    if (!c) throw new Error("canevas indisponible");

    const flux = toile.captureStream(30);
    // le son passe par une sortie à part : rien ne s'entend, et il n'y a pas de piste si la vidéo est muette
    try {
      audio = new AudioContext();
      const sortie = audio.createMediaStreamDestination();
      audio.createMediaElementSource(video).connect(sortie);
      await audio.resume();
      for (const piste of sortie.stream.getAudioTracks()) flux.addTrack(piste);
    } catch {
      audio = null;
    }

    const morceaux: Blob[] = [];
    const enregistreur = new MediaRecorder(flux, { mimeType: format, videoBitsPerSecond: debitPour(plafond, duree), audioBitsPerSecond: DEBIT_SON });
    enregistreur.ondataavailable = (e) => {
      if (e.data.size > 0) morceaux.push(e.data);
    };
    const fini = new Promise<void>((ok) => {
      enregistreur.onstop = () => ok();
    });

    // une horloge et pas requestAnimationFrame : elle continue, plus lentement, si le joueur change d'onglet
    const peindre = () => c.drawImage(video, 0, 0, l, h);

    await new Promise<void>((ok, ko) => {
      const garde = setTimeout(() => ko(new Error("compression trop longue")), (duree + 20) * 1000);
      video.ontimeupdate = () => progression?.(Math.min(1, video.currentTime / Math.max(1, duree)));
      video.onended = () => {
        clearTimeout(garde);
        ok();
      };
      video.onerror = () => {
        clearTimeout(garde);
        ko(new Error("vidéo illisible"));
      };
      enregistreur.start(1000);
      peindre();
      horloge = window.setInterval(peindre, 1000 / 30);
      video.play().catch((e) => {
        clearTimeout(garde);
        ko(e);
      });
    });
    clearInterval(horloge);
    enregistreur.stop();
    await fini;
    const type = format.split(";")[0];
    const blob = new Blob(morceaux, { type });
    if (blob.size === 0) throw new Error("compression vide");
    return { blob, type };
  } finally {
    clearInterval(horloge);
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
    void audio?.close().catch(() => undefined);
  }
}
