// Traduire une question d'Ethics en français, dans le navigateur (traducteur intégré de Chrome,
// sur la machine : rien n'est envoyé, rien en base). Les termes à connaître pour l'examen
// restent en anglais : on ne traduit que le texte entre eux. Sans traducteur (autre
// navigateur, Chrome ancien), `traductionPossible()` répond non et rien ne s'affiche.

/** Les termes d'examen gardés en anglais, des plus longs aux plus courts. */
const TERMES = [
  "Code of Ethics and Standards of Professional Conduct", "Standards of Professional Conduct", "Code and Standards", "Code of Ethics",
  "Standards of Practice Handbook", "Professional Conduct Program", "Disciplinary Review Committee", "CFA Institute", "CFA Program", "CFA charterholder", "CFA designation",
  "Global Investment Performance Standards", "GIPS", "Asset Manager Code", "Research Objectivity Standards",
  "material nonpublic information", "mosaic theory", "fiduciary duty", "fiduciary", "duty of loyalty", "duty of care", "loyalty, prudence, and care",
  "soft dollars", "soft dollar", "soft commissions", "client brokerage", "best execution", "proxy voting", "trade allocation", "block trade",
  "fair dealing", "suitability", "independence and objectivity", "misrepresentation", "misconduct", "plagiarism", "market manipulation",
  "front-running", "front running", "priority of transactions", "referral fees", "additional compensation arrangements", "preservation of confidentiality",
  "responsibilities of supervisors", "diligence and reasonable basis", "communication with clients", "record retention", "knowledge of the law",
  "conflicts of interest", "disclosure of conflicts", "performance presentation", "investment policy statement", "IPS",
  "composite", "composites", "verification", "firewall", "information barrier", "restricted list", "watch list", "blackout period", "quiet period",
  "ethical decision-making framework", "independent practice", "compliance procedures", "duties to employers", "duties to clients", "duties to employees",
];
const echapper = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// des mots entiers seulement (« IPS » ne prend pas « relationships »)
const MOTIF = new RegExp(`(?<![A-Za-z])(Standards? [IVX]{1,3}(?:\\([A-G]\\))?(?:\\s?\\d)?|${TERMES.map(echapper).join("|")})(?![A-Za-z])`, "gi");

type Traducteur = { translate: (t: string) => Promise<string> };
type ApiTraducteur = {
  availability: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  create: (o: { sourceLanguage: string; targetLanguage: string; monitor?: (m: EventTarget) => void }) => Promise<Traducteur>;
};
const api = (): ApiTraducteur | null => (typeof self !== "undefined" && "Translator" in self ? (self as unknown as { Translator: ApiTraducteur }).Translator : null);

export async function traductionPossible(): Promise<boolean> {
  try {
    const a = api();
    return !!a && (await a.availability({ sourceLanguage: "en", targetLanguage: "fr" })) !== "unavailable";
  } catch {
    return false;
  }
}

let promesse: Promise<Traducteur> | null = null;
const deja = new Map<string, string>();

/** À appeler depuis un clic la première fois : Chrome peut devoir télécharger le modèle. */
export function ouvrirTraducteur(progression?: (part: number) => void): Promise<Traducteur> {
  const a = api();
  if (!a) return Promise.reject(new Error("pas de traducteur"));
  promesse ??= a
    .create({
      sourceLanguage: "en",
      targetLanguage: "fr",
      monitor: (m) => m.addEventListener("downloadprogress", (e) => progression?.((e as unknown as { loaded: number }).loaded)),
    })
    .catch((e) => {
      promesse = null;
      throw e;
    });
  return promesse;
}

/** Le texte en français, termes d'examen gardés tels quels. */
export async function traduireFr(texte: string): Promise<string> {
  const vu = deja.get(texte);
  if (vu !== undefined) return vu;
  const tr = await ouvrirTraducteur();
  const morceaux = texte.split(MOTIF);
  const sortie = await Promise.all(
    morceaux.map(async (m, i) => {
      if (i % 2 === 1 || !/[a-z]{2}/i.test(m)) return m;
      const avant = m.match(/^\s*/)?.[0] ?? "";
      const apres = m.match(/\s*$/)?.[0] ?? "";
      return avant + (await tr.translate(m.trim())) + apres;
    }),
  );
  const fr = sortie.join("");
  deja.set(texte, fr);
  return fr;
}
