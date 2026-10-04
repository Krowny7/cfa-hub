// La banque de GIF (KLIPY, qui a pris la suite de Tenor pour Discord,
// Bluesky…) : la forme des résultats côté site, et leur lecture depuis la
// réponse de l'API. Les GIF ne sont pas recopiés chez nous : la page les
// affiche depuis le serveur de KLIPY (adresse vérifiée à l'écriture).
// Module neutre (client et serveur).

export type Rendu = { url: string; w: number; h: number };
export type GifBanque = { id: string; titre: string; apercu: Rendu; plein: Rendu };
export type PageGifs = { gifs: GifBanque[]; suite: boolean };

/** Une adresse de média KLIPY (https, un domaine en klipy.com, une image animée). */
export const URL_KLIPY = /^https:[/][/]([a-z0-9-]+[.])*klipy[.]com[/][A-Za-z0-9/._%-]+[.](gif|webp)$/;

type Format = { url?: unknown; width?: unknown; height?: unknown };
type Taille = Partial<Record<"gif" | "webp" | "jpg" | "mp4" | "webm", Format>>;

/** Le meilleur rendu d'une taille : WebP animé (plus léger), sinon GIF ; sans la partie « ?… ». */
function rendu(t: Taille | undefined): Rendu | null {
  for (const f of [t?.webp, t?.gif]) {
    const url = typeof f?.url === "string" ? f.url.split(/[?#]/)[0] : "";
    const w = Number(f?.width), h = Number(f?.height);
    if (URL_KLIPY.test(url) && w > 0 && h > 0) return { url, w: Math.round(w), h: Math.round(h) };
  }
  return null;
}

/** Les GIF d'une réponse KLIPY (recherche ou tendances) ; les publicités sont écartées. */
export function lireKlipy(json: unknown): PageGifs {
  const racine = (json as { data?: unknown } | null)?.data;
  const page = (racine && typeof racine === "object" && !Array.isArray(racine) ? racine : { data: racine }) as { data?: unknown; has_next?: unknown };
  const items = Array.isArray(page.data) ? page.data : [];
  const gifs: GifBanque[] = [];
  for (const it of items as Record<string, unknown>[]) {
    if (!it || typeof it !== "object" || it.type === "ad") continue;
    const f = (it.file ?? it.files) as Record<string, Taille> | undefined;
    if (!f) continue;
    const plein = rendu(f.hd) ?? rendu(f.md);
    const apercu = rendu(f.sm) ?? rendu(f.md) ?? plein;
    if (!plein || !apercu) continue;
    gifs.push({ id: String(it.slug ?? it.id ?? plein.url), titre: typeof it.title === "string" ? it.title.slice(0, 80) : "GIF", apercu, plein });
  }
  return { gifs, suite: page.has_next === true };
}
