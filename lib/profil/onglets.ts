// Les onglets du profil, dans l'ordre : Profil · Sceaux · Face-à-face (le
// Journal viendra se placer entre Sceaux et Face-à-face). L'onglet est dans
// l'URL (?onglet=sceaux) ; Face-à-face n'existe que sur le profil d'un
// autre joueur. Module neutre.

export const ONGLETS_PROFIL = ["profil", "sceaux", "face-a-face"] as const;
export type OngletProfil = (typeof ONGLETS_PROFIL)[number];

/** Les onglets d'un profil : sans Face-à-face sur le sien (ou son aperçu). */
export const ongletsDe = (autre: boolean): OngletProfil[] => ONGLETS_PROFIL.filter((o) => autre || o !== "face-a-face");

/** L'onglet demandé, s'il existe sur ce profil ; sinon Profil. */
export function ongletDepuis(brut: string | string[] | undefined, autre: boolean): OngletProfil {
  const v = Array.isArray(brut) ? brut[0] : brut;
  return ongletsDe(autre).find((o) => o === v) ?? "profil";
}

/** L'adresse d'un onglet (Profil : sans paramètre), en gardant « voir comme les autres ». */
export function hrefOnglet(id: string, onglet: OngletProfil, vue: string | null = null): string {
  const q = new URLSearchParams();
  if (vue) q.set("vue", vue);
  if (onglet !== "profil") q.set("onglet", onglet);
  const s = q.toString();
  return `/people/${id}${s ? `?${s}` : ""}`;
}
