// « Maîtrisée » / « Pas encore » de la partie de cartes, écrits comme le reste
// du site écrit la maîtrise d'une carte (testé par
// scripts/flashcards/test-partie-enregistrement.ts) :
// - la boucle « À revoir » du paquet de la carte (lib/flashcards/boucle.ts,
//   marquerId) : gardée sur l'appareil (localStorage) et envoyée sur le compte
//   (action serveur enregistrerBoucle, table flashcard_progress), avec les
//   mêmes garde-fous que la révision (SuiviCompte : jamais écraser une
//   progression faite ailleurs ; « conflit » : on repart du compte et on y
//   repose les marques de la partie) ;
// - la répétition espacée du paquet (lib/srs.ts), pour LA PROCHAINE fois ;
// - le Codex (« flashcards_revues »), par paquets de 10 cartes et en fin de
//   partie.
// Jamais bloquant : table absente, session perdue ou base injoignable, la
// partie continue ; l'appareil garde la boucle et la révision d'un paquet la
// renverra au compte à sa prochaine ouverture. Sans navigateur : tout ce qui
// en dépend (stockage, envoi, balise, répétition espacée, Codex) est injecté,
// la classe est testable telle quelle.

import { boucleDuJoueur, choisirBoucle, demarrer, ecrireBoucle, lireBoucle, marquerId, type EtatBoucle, type Stockage } from "@/lib/flashcards/boucle";
import { SuiviCompte, cleLocale, cleSet, lireLigne, type LigneProgression } from "@/lib/flashcards/progression";
import type { ResultatEcriture } from "@/lib/flashcards/progression-serveur";
import { applyReview, loadSRS, saveSRS, type CardSRS } from "@/lib/srs";

/** Au plus ce nombre de conflits d'affilée sur une boucle : au-delà, l'appareil garde la sienne. */
const CONFLITS_MAX = 2;
/** Cartes révisées avant d'être notées au Codex (le reste part en fin de partie). */
const PAQUET_CODEX = 10;

export type CarteMarquee = { id: string; setId: string; matiere: string };

export type DependancesEnregistreur = {
  /** le joueur connecté : la boucle gardée sur l'appareil est à son nom */
  joueur: string;
  /** les cartes d'un paquet, dans l'ordre (de quoi réparer ou démarrer sa boucle) ; null : paquet inconnu */
  cartesDuPaquet: (setId: string) => readonly string[] | null;
  /** écrit la boucle sur le compte (action serveur enregistrerBoucle) */
  envoyer: (cle: string, etat: EtatBoucle) => Promise<ResultatEcriture>;
  /** dernier envoi quand la page se ferme (sendBeacon) */
  balise?: (cle: string, etat: EtatBoucle) => void;
  /** note des cartes révisées au Codex */
  noter?: (matiere: string, cartes: number) => void;
  /** stockage de l'appareil (défaut : localStorage) */
  stockage?: Stockage | null;
  /** répétition espacée (défaut : lib/srs.ts) */
  srs?: { lire: (setId: string) => Record<string, CardSRS>; ecrire: (setId: string, etat: Record<string, CardSRS>) => void };
  maintenant?: () => number;
};

type Boite = {
  cle: string;
  setId: string;
  ids: readonly string[];
  suivi: SuiviCompte;
  /** la boucle à jour (null tant qu'aucune carte n'a été jouée) */
  etat: EtatBoucle | null;
  /** la dernière version dont le compte a confirmé la réception */
  envoye: EtatBoucle | null;
  /** les marques de cette partie, pour les reposer si le compte a changé ailleurs */
  marques: [string, boolean][];
  enCours: boolean;
  sale: boolean;
};

export class EnregistreurPartie {
  private boites = new Map<string, Boite>();
  private lignes: Record<string, LigneProgression> = {};
  /** le compte est lu et accepte les écritures */
  private synchro = false;
  /** faux dès que le compte refuse (table absente, session perdue) : on cesse d'envoyer, en silence */
  private actif = true;
  private aNoter = new Map<string, number>();

  constructor(private o: DependancesEnregistreur) {}

  private now() {
    return (this.o.maintenant ?? Date.now)();
  }

  /**
   * Une nouvelle partie : les lignes du compte lues à la donne (clé
   * « set:<id> » ; null : table pas encore créée ou base injoignable, la
   * maîtrise reste sur l'appareil). Les boucles déjà en mémoire sont relues
   * à la prochaine carte jouée : une version écrite ailleurs depuis l'emporte.
   */
  nouvellePartie(lignes: Record<string, LigneProgression> | null): void {
    this.lignes = lignes ?? {};
    this.synchro = lignes !== null && this.actif;
    for (const b of this.boites.values()) {
      b.marques = [];
      if (!b.enCours) b.etat = null;
      const l = this.lignes[b.cle];
      if (l) b.suivi.lue(l);
    }
  }

  private boite(setId: string): Boite | null {
    const cle = cleSet(setId);
    const connue = this.boites.get(cle);
    if (connue) return connue;
    const ids = this.o.cartesDuPaquet(setId);
    if (!ids || ids.length === 0) return null;
    const b: Boite = { cle, setId, ids, suivi: new SuiviCompte(), etat: null, envoye: null, marques: [], enCours: false, sale: false };
    b.suivi.lue(this.lignes[cle]);
    this.boites.set(cle, b);
    return b;
  }

  /** La boucle du paquet à jour : en mémoire, sinon la plus récente de l'appareil et du compte, sinon une neuve. */
  private etatDe(b: Boite): EtatBoucle {
    if (b.etat) return b.etat;
    const local = boucleDuJoueur(lireBoucle(cleLocale(b.cle), b.ids, this.o.stockage), this.o.joueur);
    const compte = lireLigne(this.lignes[b.cle], b.ids);
    return choisirBoucle(local, compte).etat ?? demarrer(b.ids, { maintenant: this.now() });
  }

  private garder(b: Boite, e: EtatBoucle): void {
    b.etat = e;
    ecrireBoucle(cleLocale(b.cle), { ...e, u: this.o.joueur }, this.o.stockage);
  }

  /** Une carte jugée : « Maîtrisée » (true) ou « Pas encore » (false). Ne lève jamais. */
  enregistrer(carte: CarteMarquee, maitrisee: boolean): void {
    try {
      const t = this.now();
      this.ecrireSrs(carte, maitrisee);
      this.compter(carte.matiere);
      const b = this.boite(carte.setId);
      if (!b) return;
      b.marques.push([carte.id, maitrisee]);
      const avant = this.etatDe(b);
      const suite = marquerId(avant, carte.id, maitrisee, t);
      // rien ne change (boucle finie, carte déjà marquée pareil, carte sortie des tours d'avant) : rien à garder ni à envoyer
      if (suite === avant) return;
      this.garder(b, b.suivi.horodater(suite, { synchro: this.synchro, avant: avant.maj, maintenant: t }));
      void this.pousser(b);
    } catch {
      // la partie continue sans enregistrer cette carte
    }
  }

  private ecrireSrs(carte: CarteMarquee, su: boolean) {
    try {
      const srs = this.o.srs ?? { lire: loadSRS, ecrire: saveSRS };
      srs.ecrire(carte.setId, applyReview(srs.lire(carte.setId), carte.id, su));
    } catch {
      // pas de répétition espacée pour cette fois
    }
  }

  private compter(matiere: string) {
    this.aNoter.set(matiere, (this.aNoter.get(matiere) ?? 0) + 1);
    let total = 0;
    for (const n of this.aNoter.values()) total += n;
    if (total >= PAQUET_CODEX) this.noterAuCodex();
  }

  private noterAuCodex() {
    const lot = [...this.aNoter.entries()].filter(([, n]) => n > 0);
    this.aNoter.clear();
    for (const [matiere, n] of lot) {
      try {
        this.o.noter?.(matiere, n);
      } catch {
        // le Codex ne gêne jamais la partie
      }
    }
  }

  /** Envoie la boucle sur le compte, une à la fois par paquet : la dernière version, sans doubler ni désordonner. */
  private async pousser(b: Boite): Promise<void> {
    if (!this.synchro || !this.actif) return;
    if (b.enCours) {
      b.sale = true;
      return;
    }
    b.enCours = true;
    try {
      let conflits = 0;
      do {
        b.sale = false;
        const e = b.etat;
        if (!e) break;
        b.suivi.envoye(e);
        let r: ResultatEcriture;
        try {
          r = await this.o.envoyer(b.cle, e);
        } catch {
          r = { ok: false, raison: "erreur" };
        }
        if (r.ok) {
          b.envoye = e;
          continue;
        }
        if (r.raison === "conflit") {
          if (++conflits > CONFLITS_MAX) break;
          if (!r.ligne || !b.suivi.recue(r.ligne)) break;
          // écrite ailleurs depuis : on repart de la version du compte et on y repose nos marques
          const c = lireLigne(r.ligne, b.ids);
          if (!c) break;
          const t = this.now();
          let x = c.etat;
          for (const [id, su] of b.marques) x = marquerId(x, id, su, t);
          if (x === c.etat) {
            this.garder(b, c.etat);
            b.envoye = c.etat;
            continue;
          }
          this.garder(b, b.suivi.horodater(x, { synchro: true, avant: c.etat.maj, maintenant: t }));
          b.sale = true;
          continue;
        }
        // erreur passagère : le prochain geste renverra la boucle entière ; sinon (table absente, session perdue, refus) on cesse
        if (r.raison !== "erreur") this.actif = false;
        break;
      } while (b.sale);
    } finally {
      b.enCours = false;
    }
  }

  /** La partie est finie ou abandonnée : ce qui reste à noter au Codex part. */
  terminer(): void {
    this.noterAuCodex();
  }

  /**
   * La page se ferme, passe en arrière-plan ou suit un lien : les boucles dont
   * le compte n'a pas confirmé la dernière version partent par la balise (une
   * action serveur n'y survit pas), et le Codex est noté.
   */
  balise(): void {
    this.noterAuCodex();
    if (!this.synchro || !this.actif || !this.o.balise) return;
    for (const b of this.boites.values()) {
      if (!b.etat || b.etat === b.envoye) continue;
      b.suivi.envoye(b.etat);
      try {
        this.o.balise(b.cle, b.etat);
      } catch {
        // l'état reste sur l'appareil, renvoyé à la prochaine ouverture du paquet
      }
    }
  }

  /** Pour les tests : la boucle en mémoire d'un paquet. */
  etatEnMemoire(setId: string): EtatBoucle | null {
    return this.boites.get(cleSet(setId))?.etat ?? null;
  }

  /** Pour les tests : le compte accepte-t-il encore les écritures ? */
  get envoiActif(): boolean {
    return this.synchro && this.actif;
  }

  /** Attend la fin des envois en cours (tests). */
  async attendre(): Promise<void> {
    for (let i = 0; i < 50 && [...this.boites.values()].some((b) => b.enCours); i++) await new Promise((r) => setTimeout(r, 0));
  }
}
