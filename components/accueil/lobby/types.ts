import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { BarreRang } from "@/components/moi/synthese/modele";
import type { IllustrationNom } from "@/lib/illustrations";
import type { Joueur, Nouveaute } from "@/lib/profil/nouveau";
import type { Segment } from "@/lib/voice-moi";

// Le contrat de l'accueil « Le lobby » (/dashboard) : tout ce que les cartes
// affichent, en données simples (aucune fonction : ce qui passe du serveur à un
// îlot client doit se sérialiser). Écrit par le lot 1, repris tel quel par les
// lots 2 à 5 (chacun lit sa tranche) et assemblé par le lot 6. Chaque bloc
// vaut `T | null`, jamais une valeur inventée : une source absente (migration
// non collée, pas de clé de service) laisse le bloc à null et la carte se
// masque ou se simplifie. Les dates et les nombres arrivent déjà formatés
// quand ils s'affichent tels quels (le serveur les écrit, pas le navigateur :
// pas d'écart d'hydratation).

/** Ce que reçoit toute lecture du lobby : les deux clients, le joueur, l'instant et le jour de Paris. */
export type CtxLecture = {
  sb: SupabaseClient;
  /** le client de service ; null sans clé : les lectures qui en dépendent se masquent */
  admin: SupabaseClient | null;
  user: Pick<User, "id" | "user_metadata" | "created_at">;
  now: Date;
  /** le jour d'aujourd'hui à Paris, « AAAA-MM-JJ » */
  jour: string;
};

export type Lien = { href: string; libelle: string };
export type EtatDefi = "todo" | "playing" | "done";

// ── lot 1 : le socle ────────────────────────────────────────────────────────

/**
 * L'en-tête : « Bon retour, Theo » à gauche, « J-110 avant l'examen · 18 février
 * 2027 » à droite, rien d'autre. `jn` : jours avant l'examen (0 = jour J) ; null
 * sans date ou une fois l'examen passé. `dateExamen` : « 18 février 2027 » ;
 * null sans date (la droite propose de la fixer).
 */
export type EnteteLobby = { jn: number | null; dateExamen: string | null; salut: string };

/** Les 30 du jour en héros (ou, à défaut, les 5 du jour : `format` « cinq »). */
export type CarteDefi = {
  format: "trente" | "cinq";
  etat: EtatDefi;
  /** « Samedi 1er novembre » */
  date: string;
  /** la puce de la carte : « Se fige dans 5 h » */
  statut: string;
  /** trois tuiles au plus : « 128 » · « joueurs aujourd'hui » */
  tuiles: { val: string; lib: string }[];
  /** la copie en cours : n répondues sur total (sinon null) */
  progression: { faites: number; total: number } | null;
  action: Lien;
  /** « Le classement du jour », une fois la copie rendue */
  second: Lien | null;
};

export type LigneClassement = { rang: number; nom: string; score: string; temps: string | null };

/** Le classement d'un jour : le top 5, ta ligne à part, le pied de carte. */
export type JourClassement = {
  cle: "auj" | "hier";
  /** « En direct », « Figé hier soir » */
  etat: string;
  direct: boolean;
  /** « 128 joueurs » */
  joueurs: string;
  lignes: LigneClassement[];
  /** ta ligne : « Toi : 19e » / « en 16 min 12 » / « 25/30 » ; `rendu` : la copie est rendue */
  toi: { titre: string; sous: string; val: string; rendu: boolean };
  /** « Se fige dans 5 h », « Vainqueur : Marie L. » */
  pied: string;
  /** la page du jour (/defi/AAAA-MM-JJ) */
  href: string;
};

/** Le classement des 30, accolé au héros (Aujourd'hui | Hier ; `hier` null : pas de sélecteur). */
export type ClassementLobby = {
  titre: string;
  aujourdhui: JourClassement;
  hier: JourClassement | null;
  /** tes initiales (ton pseudo), dans le rond de ta ligne « Toi » */
  initiales: string;
};

/** Les 5 du jour : cinq cases (juste, faite, vide), l'état en une ligne, le bouton. */
export type CarteCinqLobby = {
  etat: EtatDefi;
  /** le nombre de cases justes, pas leur place (la base ne dit pas laquelle) */
  cases: ("juste" | "faite" | null)[];
  joueurs: number;
  /** « 5/5 » ; null tant que personne n'a rendu */
  meilleur: string | null;
  /** copie en cours ou rendue : « 3/5 répondues », « 4/5 · 80 % · 12e sur 342 » ; null à rendre */
  ligne: Segment[] | null;
  action: Lien;
};

/** Tes traits du jour : l'anneau, la série d'encre, le joker, l'examen. */
export type CarteTraitsLobby = {
  repondues: number;
  objectif: number;
  tenu: boolean;
  /** l'infobulle de l'anneau : les questions et les calculs du jour (« 7 questions · 2 calculs ») et sa version lue */
  detail: { questions: number; calculs: number; texte: string; aria: string };
  /** le jour de Paris (le sceau « TENU » ne joue son coup de tampon qu'une fois par jour) */
  jour: string;
  /** « Encore 14 traits », « Journée tenue » (sans prénom : l'en-tête le dit déjà) */
  titre: string;
  phrase: Segment[];
  /** les jours d'encre et le palier d'XP (« ×2 ») ; null sans jour d'encre */
  serie: { jours: number; mult: string | null } | null;
  /** le joker de la semaine ; null sans la migration ou sans série */
  joker: "disponible" | "pris" | null;
  /** J-n pour la ligne « Examen » ; null sans date */
  jn: number | null;
  /** le bouton d'encre de la carte : seulement quand les 30 et les 5 sont faits (ou absents) et la journée pas tenue */
  action: Lien | null;
};

/** Le personnage du vainqueur (lot 2) : son image, sa taille et sa position dans la bannière. */
export type PersoVainqueur = { src: string; taille: number; pos: number };

/** Le vainqueur des 30 d'hier, en bandeau peint. */
export type BandeVainqueurLobby = {
  nom: string;
  moi: boolean;
  /** « 29/30 en 11 min 40 s, devant 130 joueurs » */
  ligne: Segment[];
  /** « Platine », « Placement » */
  palier: string;
  /** l'image de sa bannière ; null : la peinture du site (accueil-bandeau) */
  fond: string | null;
  /** « Le classement d'hier » : la page du jour d'hier */
  href: string;
  /** rempli au lot 2 (null : pas de personnage) */
  perso: PersoVainqueur | null;
};

export type PhaseLobby = { index: 0 | 1 | 2; libelles: [string, string, string]; sur: string /* « phase 2 sur 3 » */ };

/** Ton rang : l'insigne, trois chiffres, la barre jusqu'à la division suivante, la phase de révision. */
export type CarteRangLobby = {
  /** index du palier dans TIERS */
  tier: number;
  division: string | null;
  /** « Platine II », « Placement » */
  palier: string;
  placement: boolean;
  /** la maîtrise du programme (le halo de l'insigne) */
  maitrise: number;
  /** « 1 478 » · « ELO », « 7e » · « sur 412 joueurs », « +12 » · « au dernier duel » */
  chiffres: { val: string; lib: string }[];
  barre: BarreRang;
  /** null sans date d'examen : le bloc invite à la fixer */
  phase: PhaseLobby | null;
};

/** Les 30 pas jouables et les 5 non plus : la tuile calme (le héros devient Tes traits du jour). */
export type CalmeLobby = { etat: "bientot" | "indispo" };

// ── lots 2 à 5 (null tant qu'ils ne sont pas branchés) ─────────────────────

export type EvenementLobby = { cle: string; initiales: string; sombre: boolean; texte: Segment[]; quand: string };
/**
 * Un joueur en ligne, en petit visage : sa photo de profil quand il en a une
 * (`avatarUrl`), sinon ses initiales. `moi` : c'est toi (toujours en tête, « Toi »).
 */
export type JoueurLobby = { id: string; nom: string; prenom: string; initiales: string; avatarUrl: string | null; moi: boolean; ami: boolean };
/**
 * « En ce moment dans le lobby ». `joueurs` : toi d'abord, puis tes amis en ligne,
 * puis les autres, huit au plus ; `plus` : combien d'autres joueurs en ligne ne
 * tiennent pas dans la rangée (« +12 »).
 */
export type EnDirectLobby = { enLigne: number | null; duels: number | null; copiesHeure: number; evenements: EvenementLobby[]; joueurs: JoueurLobby[]; plus: number };
export type MesureRival = { cle: "traits" | "jours" | "temps" | "serie" | "duels"; lib: string; toi: number; lui: number; toiTxt: string; luiTxt: string; aria: string };
export type RivalLobby = {
  id: string;
  nom: string;
  prenom: string;
  initiales: string;
  /** tes initiales (ton pseudo), pour ta ligne « Toi » du face-à-face */
  initialesMoi: string;
  href: string;
  mesures: MesureRival[];
  /** repli sans mesures : « 3 victoires sur 5 rencontres » */
  bilan: string | null;
  verdict: Segment[];
  rattrape: Segment[] | null;
  defi: Lien;
  relance: { dispo: boolean; envoyee: boolean; apercu: string };
  recue: string | null;
};
export type SourceCarte = "toutes" | "marquees" | "faibles";
export type CarteDuJourLobby = {
  id: string;
  matiere: { cle: string; court: string; code: string };
  recto: string;
  verso: string;
  resume: string;
  prompt: string;
  reglages: { mats: string[]; src: SourceCarte };
  repli: string | null;
};
export type RecordLobby = { val: string; unite: string | null; detail: Segment[] } | null;
export type ScoresLobby = { copie: RecordLobby; maitrise: RecordLobby; examen: RecordLobby; rang: RecordLobby };
/** `unite` : ce que compte la barre, au pluriel (« duels gagnés »). */
export type DeblocageLobby = { nom: string; type: "cadre" | "banniere" | "titre" | "folio" | "ornement"; fait: number; total: number; reste: string; href: string; unite: string };
export type QueteLobby = { titre: string; valeur: number; cible: number; xp: number | null; href: string };
export type GrandeSalleLobby = { titre: string; ligne: string; action: Lien };
export type AfficheLobby = { nom: IllustrationNom; legende: string; position?: string };
/**
 * Une relance reçue (migration_accueil.sql), ajoutée aux nouvelles des amis : « Marie t'a relancé ce matin ».
 * `jour` : le jour de Paris de la relance ; `quand` : « ce matin », « hier » (dit au serveur).
 */
export type NouveauteRelance = { type: "relance"; cle: string; jour: string; joueur: Joueur; quand: string };
/** Ce que « Du nouveau » liste : les nouvelles des amis (palier, victoire, dépassement) et les relances reçues. */
export type NouveauLobby = Nouveaute | NouveauteRelance;
/** `avatarUrl` : la photo de profil de l'ami (null : ses initiales). */
export type AmisLobby = { total: number; enLigne: number | null; visages: { id: string; nom: string; initiales: string; avatarUrl: string | null; enLigne: boolean }[]; demandes: number };
export type CarnetLobby = { jours: [string, number][]; aujourdhui: string; serie: number; record: number; seuil: number | null };

export type Lobby = {
  entete: EnteteLobby;
  heros: CarteDefi | null;
  classement: ClassementLobby | null;
  cinq: CarteCinqLobby | null;
  /** la tuile calme « Les 30 : bientôt » (seulement quand `heros` est null) */
  calme: CalmeLobby | null;
  traits: CarteTraitsLobby;
  vainqueur: BandeVainqueurLobby | null;
  rang: CarteRangLobby;
  enDirect: EnDirectLobby | null;
  rival: RivalLobby | null;
  carteDuJour: CarteDuJourLobby | null;
  scores: ScoresLobby | null;
  deblocage: DeblocageLobby | null;
  quete: QueteLobby | null;
  grandeSalle: GrandeSalleLobby | null;
  affiches: { rival: AfficheLobby; scores: AfficheLobby };
  nouveau: NouveauLobby[] | null;
  amis: AmisLobby | null;
  carnet: CarnetLobby | null;
  /** pour l'anneau du logo, la célébration des 7 jours, le mode sobre */
  jour: { repondues: number; serieAffichee: number; cleSerie: string | null; doubleDeja: boolean; sobre: boolean };
};

/**
 * Les cinq cartes lentes, lues APRÈS la page (en continu : chacune se rend dans son <Suspense>, un squelette de
 * même taille attend à sa place). Ce sont des promesses qui ne rejettent JAMAIS : `null` veut dire que la lecture a
 * vraiment échoué ou dépassé le filet (la carte se masque et sa rangée se recompose). Un champ absent : la carte
 * vient de `Lobby` (aperçus, tests), rendue d'un bloc comme avant. Elles ne traversent jamais vers un îlot client :
 * seuls les composants serveur de Rangees.tsx les attendent.
 */
export type CartesDifferees = {
  enDirect?: Promise<EnDirectLobby | null>;
  rival?: Promise<RivalLobby | null>;
  carteDuJour?: Promise<CarteDuJourLobby | null>;
  deblocage?: Promise<DeblocageLobby | null>;
  quete?: Promise<QueteLobby | null>;
};
