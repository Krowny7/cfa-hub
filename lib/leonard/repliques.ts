// Répliques de Léonard, la mascotte de Ranked Lobby.
// Module sans dépendance. Marqueurs à remplacer par l'appelant :
//   {score} → « 7/10 »   (session-*, erreurs-serie, defi-*, atelier-* ; « 3-5 » pour un duel)
//   {pct}   → « 70 % »   (session-*, erreurs-serie, defi-*)
//   {n}     → « 8 »      (serie-bonnes : nombre de bonnes réponses d'affilée ;
//                         erreurs-serie : nombre d'erreurs d'affilée ;
//                         atelier-rayees : ratures rayées pendant l'Atelier)
//   {notion} → « Duration » (atelier-progres, atelier-dur : la notion dont il parle)
// Les autres événements n'utilisent aucun marqueur.
// Une réplique peut proposer un pas concret (`action`) : un bouton sous la
// bulle, qui mène à la page et congédie Léonard (components/leonard).

export type Pose = "base" | "fier" | "moqueur" | "decu" | "etonne";
/** Le pas concret qu'une réplique propose : un bouton sous la bulle. */
export type Action = { libelle: string; href: string };
export type Replique = { texte: string; pose: Pose; action?: Action };
export type Evenement =
  | "tuto" | "erreurs-serie" | "session-ratee" | "session-moyenne" | "session-reussie" | "session-parfaite"
  | "serie-bonnes" | "progression" | "duel-gagne" | "duel-perdu" | "duel-ecrase" | "duel-nul"
  | "defi-reussi" | "defi-rate" | "atelier-progres" | "atelier-rayees" | "atelier-dur" | "atelier-fini" | "rang-monte" | "serie-sept" | "sceau-gagne" | "retour" | "tard" | "furtif"
  | "quete-faite" | "acte-nouveau" | "devoile" | "carnet"
  | "nouveautes";

/** Les deux visites guidées (TUTO, NOUVEAUTES) : des étapes, pas des répliques au hasard. */
export type Visite = "tuto" | "nouveautes";

// Les pas concrets proposés après un échec (et au retour).
const RATURES: Action = { libelle: "Voir mes ratures", href: "/moi?onglet=erreurs" };
const ATELIER: Action = { libelle: "Atelier", href: "/atelier" };
const FICHES: Action = { libelle: "Relire une fiche", href: "/reviser" };
const ECLAIR: Action = { libelle: "Cinq questions", href: "/eclair" };
const DUEL: Action = { libelle: "Un autre duel", href: "/duel" };

/**
 * Les échecs : chaque réplique finit par un pas concret et porte son `action`.
 * Jamais de moquerie de l'effort ni de l'absence ; la taquinerie vise Léonard
 * lui-même, Florence ou la finance (scripts/leonard/test-repliques.ts).
 */
export const EVENEMENTS_ECHEC = ["erreurs-serie", "session-ratee", "session-moyenne", "defi-rate", "duel-perdu", "duel-ecrase", "atelier-dur"] as const;
/** Les événements où le joueur peut se sentir jugé : les échecs, le retour, la nuit. */
export const EVENEMENTS_DELICATS = [...EVENEMENTS_ECHEC, "retour", "tard"] as const;

export const REPLIQUES: Record<Exclude<Evenement, Visite>, Replique[]> = {
  "erreurs-serie": [
    { texte: "{n} erreurs d’affilée. Mon cheval de bronze, lui, n’a jamais été fondu : tu fais déjà mieux que moi. Relis-les demain, elles auront séché.", pose: "base", action: RATURES },
    { texte: "Les Bardi et les Peruzzi ont fait faillite coup sur coup, vers 1345. Toi, ce n’est qu’une série d’erreurs. La fiche de la notion, et ça repart.", pose: "decu", action: FICHES },
    { texte: "Des erreurs en chaîne, c’est un signal, pas un verdict. Stop-loss : on coupe, et on reprend la notion à l’Atelier.", pose: "base", action: ATELIER },
    { texte: "Quand mes couleurs craquelaient, je reprenais l’enduit. Ici, pareil : l’énoncé jusqu’au bout, puis la fiche.", pose: "base", action: FICHES },
    { texte: "Une série noire, même les Médicis en ont eu. Tes ratures sont au carnet : demain, à froid, elles passeront mieux.", pose: "base", action: RATURES },
  ],

  "session-ratee": [
    { texte: "Celle-là m’aurait eu aussi. On la reprend demain, elle aura séché.", pose: "base", action: RATURES },
    { texte: "Une séance difficile, c’est une séance qui apprend. Dix minutes à l’Atelier ?", pose: "base", action: ATELIER },
    { texte: "{score}. Ma Cène s’écaillait déjà de mon vivant, on l’a restaurée. On fait pareil : tes ratures, demain, quand elles auront séché.", pose: "base", action: RATURES },
    { texte: "Chez Verrocchio, j’ai gâché plus d’un panneau avant le premier bon. Une fiche, et on y retourne.", pose: "base", action: FICHES },
    { texte: "{pct}. Le fond est touché : techniquement, c’est un point d’entrée. Cinq questions pour reprendre la main ?", pose: "base", action: ECLAIR },
  ],

  "session-moyenne": [
    { texte: "{score}. Pas un chef-d’œuvre, pas un gribouillis : une esquisse. Tes ratures du jour diront où repasser le trait.", pose: "base", action: RATURES },
    { texte: "{pct}. Le CFA veut « bien », tu tiens « pas mal ». L’écart tient souvent en deux ou trois notions, et l’Atelier les connaît.", pose: "base", action: ATELIER },
    { texte: "Rendement correct, volatilité élevée : ton ratio de Sharpe réclame une fiche. Une seule suffit pour ce soir.", pose: "etonne", action: FICHES },
    { texte: "Mi-figue, mi-raisin, comme mes comptes chez les Médicis. Tes ratures sont au carnet ; demain, elles auront séché.", pose: "base", action: RATURES },
    { texte: "{score}. Rebond du chat mort ou vraie reprise ? Cinq questions de plus pour trancher.", pose: "etonne", action: ECLAIR },
  ],

  "session-reussie": [
    { texte: "{pct}. Alpha positif. Tu peux facturer des frais de gestion.", pose: "fier" },
    { texte: "{score}. T’as mangé. Quelques miettes, mais t’as mangé.", pose: "fier" },
    { texte: "{pct}. Le jury du CFA commence à transpirer.", pose: "etonne" },
    { texte: "Bien joué. La Joconde sourit un peu plus que d’habitude.", pose: "fier" },
    { texte: "Très propre. Presque trop. Tu triches pas, hein ?", pose: "moqueur" },
    { texte: "{score}. Le genre de score qu’on screen et qu’on envoie au groupe.", pose: "fier" },
    { texte: "Ça sent le Level I validé, ça.", pose: "fier" },
    { texte: "Stonks. Tu peux mettre la flèche verte en fond d’écran.", pose: "fier" },
    { texte: "{score} ? Même Fred et Jamy auraient pris des notes.", pose: "etonne" },
    { texte: "{pct}. Le sans-faute, c’est pour la prochaine ? Je note.", pose: "moqueur" },
    { texte: "C’est carré. Je range mes vannes pour une autre fois.", pose: "fier" },
    { texte: "Pas parfait, mais ta Renaissance est en marche.", pose: "base" },
  ],

  "session-parfaite": [
    { texte: "{score}. T’as mangé et t’as pas laissé une miette.", pose: "fier" },
    { texte: "Sans-faute. Je suis vexé, j’avais préparé des vannes.", pose: "decu" },
    { texte: "100 %. Warren Buffett vient de t’ajouter sur LinkedIn.", pose: "etonne" },
    { texte: "Quelqu’un clippe ça ? C’est historique.", pose: "etonne" },
    { texte: "Flawless victory. Rien à chambrer. Ça m’arrive jamais.", pose: "fier" },
    { texte: "Zéro faute. Même mes carnets ont des ratures.", pose: "etonne" },
    { texte: "To the moon. Prends ton casque, ça monte vite.", pose: "fier" },
    { texte: "+1000 d’aura. Non, attends : +10 000.", pose: "fier" },
    { texte: "Des proportions parfaites. L’Homme de Vitruve te salue.", pose: "fier" },
    { texte: "{score}. Je te peindrais bien, mais la Joconde serait jalouse.", pose: "fier" },
    { texte: "Perfect ! Comme dans Street Fighter, avec la grosse voix.", pose: "fier" },
    { texte: "Qui t’a soufflé les réponses ? Personne ? Alors respect.", pose: "etonne" },
  ],

  "serie-bonnes": [
    { texte: "{n} d’affilée. Tu fais ton Émilien des 12 coups de midi ?", pose: "etonne" },
    { texte: "{n} de suite. Le chat spamme des « W ».", pose: "fier" },
    { texte: "Combo x{n}. Ça mérite la musique de victoire.", pose: "etonne" },
    { texte: "Bêta zéro : rien ne t’atteint.", pose: "fier" },
    { texte: "{n} à la suite. Je commence à m’inquiéter pour mes vannes.", pose: "moqueur" },
    { texte: "Je touche du bois. Du peuplier, comme la Joconde.", pose: "base" },
    { texte: "Même le Nasdaq ne monte pas aussi droit.", pose: "fier" },
    { texte: "Effet momentum. Franchement, j’achète.", pose: "fier" },
    { texte: "T’es chaud. Genre bouillant. Genre four à pizza.", pose: "etonne" },
    { texte: "{n} de suite. T’as un deuxième écran avec les réponses ?", pose: "moqueur" },
    { texte: "{n} bonnes d’affilée. C’est plus une série, c’est un abonnement.", pose: "moqueur" },
    { texte: "Main character energy. La caméra est sur toi.", pose: "fier" },
  ],

  "progression": [
    { texte: "Ah ouais ? Solide.", pose: "etonne" },
    { texte: "Attends… c’est toi, ça ? Respect.", pose: "etonne" },
    { texte: "Ah ouais, d’accord. On a un client.", pose: "etonne" },
    { texte: "Record battu. Je retire deux ou trois vannes. Pas toutes.", pose: "fier" },
    { texte: "Convexité positive : tu montes plus que tu ne descends.", pose: "fier" },
    { texte: "Syndrome de l’imposteur ? Non. T’es juste devenu bon.", pose: "fier" },
    { texte: "T’as pris des cours avec moi en cachette ?", pose: "etonne" },
    { texte: "Pente positive, faible volatilité. Ta courbe me plaît.", pose: "fier" },
    { texte: "Ok. Là, t’as toute mon attention.", pose: "etonne" },
    { texte: "Doucement. Tu vas finir par me rendre fier.", pose: "moqueur" },
    { texte: "Meilleure perf de ta vie ? Je veux un autographe.", pose: "etonne" },
    { texte: "Mode Kaizen activé. Inoxtag serait fier de toi.", pose: "fier" },
  ],

  "duel-gagne": [
    { texte: "Eh Ousmane Ballon d’or, eh Ousmane Ballon d’or !", pose: "fier" },
    { texte: "Hé hé hé haw. Pardon, réflexe de Clash Royale.", pose: "moqueur" },
    { texte: "Victoire royale. Le bus te dépose où tu veux.", pose: "fier" },
    { texte: "L’adversaire est K.O. ! C’est super efficace.", pose: "fier" },
    { texte: "GG EZ. Non, je rigole. GG tout court.", pose: "moqueur" },
    { texte: "Ton adversaire est parti en PLS. Envoie-lui des fleurs.", pose: "moqueur" },
    { texte: "Tu l’as shorté au bon moment. Pur profit.", pose: "fier" },
    { texte: "Gagné. Ton ELO prend l’ascenseur, le sien l’escalier.", pose: "fier" },
    { texte: "Il voulait un duel. Il a eu un cours magistral.", pose: "moqueur" },
    { texte: "C’est l’heure du du-du-duel… et c’est toi qui gagnes.", pose: "fier" },
    { texte: "Duel plié. Je l’ajoute à mes croquis, rubrique « victimes ».", pose: "moqueur" },
    { texte: "Vas-y, fais ta célébration. Je regarde pas. Si, je regarde.", pose: "moqueur" },
  ],

  "duel-perdu": [
    { texte: "Carapace bleue à deux mètres de l’arrivée. Revois les questions qui ont coûté le duel, et la revanche viendra.", pose: "decu", action: RATURES },
    { texte: "Même la Joconde s’est fait voler en 1911. Elle est revenue. Un autre duel, quand tu veux.", pose: "base", action: DUEL },
    { texte: "Ton ELO a pris un petit drawdown. Rien de grave : les questions manquées sont au carnet, à relire avant le prochain.", pose: "decu", action: RATURES },
    { texte: "Défaite. Ma machine volante aussi, au début. Et à la fin. Une fiche sur la notion qui a coincé ?", pose: "decu", action: FICHES },
    { texte: "Revanche ? Je dis ça, je dis rien. Relis d’abord celles qui t’ont piégé.", pose: "base", action: RATURES },
  ],

  "duel-ecrase": [
    { texte: "Il t’a pris de vitesse. Le duel dit surtout où creuser : les questions manquées t’attendent au carnet.", pose: "base", action: RATURES },
    { texte: "Un écart pareil, les Médicis appelaient ça une mauvaise saison. Ils rouvraient la banque le lundi. Dix minutes à l’Atelier ?", pose: "base", action: ATELIER },
    { texte: "Il a vendu ton ELO à découvert, et il a encaissé. On rachète bas : une fiche sur la notion qui a coincé.", pose: "decu", action: FICHES },
    { texte: "Fatality. Le bronze de mon cheval des Sforza est parti en canons : j’en ai pris une pareille. La notion en cause, en fiche, ce soir.", pose: "decu", action: FICHES },
    { texte: "On n’en parle plus. Ou plutôt si : dans ton carnet, question par question.", pose: "base", action: RATURES },
  ],

  "duel-nul": [
    { texte: "Égalité parfaite. Ça sent la belle.", pose: "etonne" },
    { texte: "Ni bull, ni bear : marché latéral.", pose: "base" },
    { texte: "Aussi ambigu que le sourire de la Joconde.", pose: "moqueur" },
    { texte: "Équilibre de Nash. Version CFA.", pose: "base" },
    { texte: "Même score ? Copier, c’est Standard I(C). Je plaisante.", pose: "moqueur" },
    { texte: "Un partout, balle au centre.", pose: "base" },
    { texte: "Ni seum, ni gloire. Juste un gros « mouais ».", pose: "moqueur" },
    { texte: "Match nul. Il faut une prolongation, là.", pose: "etonne" },
    { texte: "Vous êtes trop forts. Ou trop nuls. Je tranche pas.", pose: "moqueur" },
    { texte: "Deux portefeuilles, même perf. Le jury hésite.", pose: "base" },
    { texte: "Égalité ? Ça mérite une revanche. Ce soir, si possible.", pose: "etonne" },
  ],

  "defi-reussi": [
    { texte: "Défi du jour : plié. Tu peux aller frimer.", pose: "fier" },
    { texte: "Le hibou de Duolingo est vert de jalousie.", pose: "moqueur" },
    { texte: "Défi validé. Ta série te dit merci.", pose: "fier" },
    { texte: "Plus régulier qu’un coupon d’obligation. J’adore.", pose: "fier" },
    { texte: "Le défi voulait te piéger. Il repart bredouille.", pose: "fier" },
    { texte: "Et de un. Reviens demain, même heure, même talent.", pose: "base" },
    { texte: "Petite danse de victoire autorisée. Petite.", pose: "moqueur" },
    { texte: "Déjà fini ? Le défi n’a rien vu venir.", pose: "etonne" },
    { texte: "Je te peins un trophée. Livraison dans quelques années, comme d’hab.", pose: "moqueur" },
    { texte: "Daily quest terminée. XP récupérée.", pose: "fier" },
    { texte: "Défi réussi. Ça mérite une story, au minimum.", pose: "fier" },
  ],

  "defi-rate": [
    { texte: "Le défi a gagné aujourd’hui. Match retour demain ; d’ici là, ses questions t’attendent au carnet.", pose: "base", action: RATURES },
    { texte: "Défi : 1, toi : 0. Mon cheval de bronze n’a jamais vu le jour, et je m’en suis remis. Une fiche, et demain on recommence.", pose: "base", action: FICHES },
    { texte: "Les questions du jour étaient coriaces. Reprends les manquées demain, à froid : elles auront séché.", pose: "base", action: RATURES },
    { texte: "De peu ou de beaucoup, le remède est le même : la notion qui a coincé, à l’Atelier.", pose: "base", action: ATELIER },
  ],

  // le bilan de l'Atelier (la séance de 30 minutes sur ses points faibles)
  "atelier-progres": [
    { texte: "{notion}, c’est rentré. L’atelier a tourné à plein régime.", pose: "fier" },
    { texte: "{notion} : de l’esquisse au tableau. Je signe en bas à droite.", pose: "fier" },
    { texte: "Tu as repris {notion} au fusain. Le trait est net, maintenant.", pose: "fier" },
    { texte: "{notion} ? Rendement excédentaire. Ton apprenti est devenu maître.", pose: "etonne" },
    { texte: "Ah ouais, {notion}. Je le range avec mes carnets réussis.", pose: "etonne" },
    { texte: "{notion} tient debout. Mieux que mon cheval de bronze, jamais fondu.", pose: "fier" },
  ],

  "atelier-rayees": [
    { texte: "{n} ratures rayées. Le carnet respire.", pose: "fier" },
    { texte: "{n} de moins au carnet. J’ai un coup de gomme jaloux.", pose: "moqueur" },
    { texte: "{n} ratures rayées. Moi, je laisse les miennes : ça fait authentique.", pose: "moqueur" },
    { texte: "Rachat de dette : {n} ratures remboursées. Ton bilan s’allège.", pose: "fier" },
    { texte: "{n} ratures au propre. On repeint un mur entier, là.", pose: "fier" },
    { texte: "Moins {n} au carnet. La page commence à ressembler à une page.", pose: "base" },
  ],

  "atelier-dur": [
    { texte: "{notion}, ça résiste. La Joconde, j’ai mis seize ans. Relis la fiche, et on y retourne demain.", pose: "base", action: FICHES },
    { texte: "{score}. {notion} te tient tête. Le marbre est dur, on taille quand même : la fiche d’abord.", pose: "base", action: FICHES },
    { texte: "{notion} : un drawdown, pas une faillite. Ses ratures sèchent ; demain, on les reprend.", pose: "base", action: RATURES },
    { texte: "Même mes premiers croquis étaient bancals. Demain, {notion} encore, à l’Atelier.", pose: "base", action: ATELIER },
  ],

  "atelier-fini": [
    { texte: "{score}. Atelier rangé, pinceaux lavés.", pose: "base" },
    { texte: "Une séance de plus dans les jambes. C’est comme ça qu’on bâtit une cathédrale.", pose: "fier" },
    { texte: "{score}. Pas de chef-d’œuvre, mais du travail propre.", pose: "base" },
    { texte: "Trente minutes d’atelier. Plus efficace que trois heures de scroll.", pose: "moqueur" },
    { texte: "{score}. Je note le progrès dans mes carnets. À l’endroit, cette fois.", pose: "moqueur" },
    { texte: "Séance close. Ta courbe d’apprentissage vient de prendre un pli.", pose: "base" },
  ],

  "rang-monte": [
    { texte: "Quoi ? Ton rang évolue ! Sortez la musique Pokémon.", pose: "etonne" },
    { texte: "Nouveau rang. Je le note dans mes carnets. À l’endroit, cette fois.", pose: "fier" },
    { texte: "Inoxtag a eu son Everest. Toi, t’as ton rang.", pose: "fier" },
    { texte: "Plus haut que ma machine volante. Elle, elle n’a jamais décollé.", pose: "fier" },
    { texte: "Respect. Vraiment. Je retire tout ce que j’ai dit.", pose: "etonne" },
    { texte: "Level up ! J’ai la musique de Zelda dans la tête.", pose: "etonne" },
    { texte: "Je m’incline. Bas. Très bas. Mon dos de 574 ans proteste.", pose: "fier" },
    { texte: "Monter de rang, c’est une Renaissance. Je m’y connais.", pose: "fier" },
    { texte: "Si François Ier te voyait, il t’offrirait un château.", pose: "fier" },
    { texte: "Bull run officiel sur ton profil.", pose: "fier" },
    { texte: "Grand Maître un jour ? Franchement, je commence à y croire.", pose: "etonne" },
    { texte: "Ah ouais ? Nouveau rang ? Solide. Très solide.", pose: "etonne" },
  ],

  "serie-sept": [
    { texte: "Sept jours d’affilée. Moi, j’ai mis quatre ans sur un sourire.", pose: "fier" },
    { texte: "Une semaine sans lâcher. Ton XP double, et ça, c’est de l’intérêt composé.", pose: "fier" },
    { texte: "Sept jours d’encre. Le mois prochain, on parlera de rente.", pose: "moqueur" },
    { texte: "Régularité récompensée : c’est la seule martingale qui marche.", pose: "fier" },
    { texte: "Tu as tenu une semaine. Les Médicis auraient signé pour moins.", pose: "etonne" },
    { texte: "Streak de 7. Ne regarde pas en bas, ça double.", pose: "etonne" },
  ],

  "sceau-gagne": [
    { texte: "Un sceau de plus. Je le rangerais dans mes carnets, mais ils sont pleins.", pose: "fier" },
    { texte: "Succès débloqué. Le petit bruit, tu l’as entendu dans ta tête.", pose: "etonne" },
    { texte: "Trophée PlayStation débloqué. Version papier, mais quand même.", pose: "fier" },
    { texte: "Les Médicis scellaient leurs lettres comme ça. T’es en bonne compagnie.", pose: "fier" },
    { texte: "Un sceau, ça ne s’efface pas. Contrairement à mes esquisses.", pose: "base" },
    { texte: "Pose-le sur ton profil. Qu’ils voient tous.", pose: "moqueur" },
  ],

  // Le Codex (lib/codex) : une quête accomplie, un nouvel acte, un onglet dévoilé, le carnet feuilleté.
  // « acte-nouveau », « devoile » et « carnet » portent leur propre réplique (SignalLeonard.replique) ;
  // celles d'ici ne servent que de repli. Une quête faite et un acte qui s'ouvre sont désormais muets
  // (Codex simplifié §4.6, MUETS dans lib/leonard/apparitions) : Léonard ne parle qu'aux fêtes.
  "quete-faite": [
    { texte: "Tamponné. Verrocchio aurait dit « pas mal ». Moi je dis bravo.", pose: "fier" },
    { texte: "Une de moins sur la carte. Elle faisait moins la maligne au début.", pose: "moqueur" },
    { texte: "Quête accomplie. Le petit tampon rouge, c’est de la vraie encre. Presque.", pose: "fier" },
    { texte: "Voilà. Une ligne de plus dans mon carnet, à ton nom.", pose: "base" },
    { texte: "Ça se tamponne et ça ne s’efface pas. Contrairement à mes esquisses.", pose: "fier" },
    { texte: "Encore une. À ce rythme, je vais manquer d’encre. Jamais.", pose: "etonne" },
    { texte: "Joli trait. La carte te doit quelques points d’XP.", pose: "fier" },
    { texte: "Mission accomplie. Pas de cinématique, mais mon applaudissement compte double.", pose: "moqueur" },
    { texte: "Une quête de bouclée. La prochaine t’attend déjà, elle est impatiente.", pose: "base" },
    { texte: "Un tampon de plus. Les Médicis auraient mis ça au mur.", pose: "fier" },
  ],

  "acte-nouveau": [
    { texte: "Nouvel acte. Le rideau se lève, et il y a de la poussière partout.", pose: "base" },
    { texte: "On tourne la page du carnet. Prends de l’encre.", pose: "fier" },
  ],

  "devoile": [
    { texte: "Une nouvelle pièce de l’atelier vient de s’ouvrir.", pose: "fier" },
  ],

  "carnet": [
    { texte: "J’ai feuilleté ton carnet. Il y avait déjà de belles pages.", pose: "fier" },
  ],

  "retour": [
    { texte: "Te revoilà ! L’atelier est resté ouvert et les pinceaux sont propres. Cinq questions pour reprendre la main ?", pose: "etonne", action: ECLAIR },
    { texte: "Respawn au dernier feu de camp. On reprend doucement : une petite série d’abord.", pose: "base", action: ECLAIR },
    { texte: "Moi aussi, j’ai laissé des tableaux en plan pendant des années. L’important, c’est d’y revenir. Cinq questions, et on reprend le fil.", pose: "base", action: ECLAIR },
    { texte: "Bon retour à Florence. Ta place était gardée, ton carnet de ratures aussi.", pose: "fier", action: RATURES },
    { texte: "Ton retour était plus attendu que Silksong. Lui aussi a fini par arriver, et il valait l’attente.", pose: "etonne", action: ECLAIR },
  ],

  "tard": [
    { texte: "On dit que je dormais vingt minutes toutes les quatre heures. C’est faux. Dors.", pose: "base" },
    { texte: "Même le Louvre est fermé. Ferme les yeux, toi aussi : la mémoire se range pendant le sommeil.", pose: "base" },
    { texte: "Réviser la nuit, ça paie. Dormir aussi, et c’est gratuit.", pose: "base" },
    { texte: "Tokyo va bientôt ouvrir. Toi, tu as assez travaillé pour fermer.", pose: "moqueur" },
    { texte: "Ton lit a lancé un avis de recherche. Je lui dis que tu arrives ?", pose: "moqueur" },
    { texte: "Session de nuit : risque overnight élevé. La suite attendra demain, fraîche et dispose.", pose: "base" },
  ],

  "furtif": [
    { texte: "Les yeux de la Joconde te suivent. Les miens aussi.", pose: "moqueur" },
    { texte: "Le brainrot italien, c’est pas moi. Moi, j’ai fait la Renaissance.", pose: "moqueur" },
    { texte: "Six-seven ! … Non, je sais pas non plus ce que ça veut dire.", pose: "etonne" },
    { texte: "Bill Gates a payé un de mes carnets 30 millions. Et les tiens ?", pose: "moqueur" },
    { texte: "Un tableau à mon nom s’est vendu 450 millions. Ton ELO, ça va ?", pose: "etonne" },
    { texte: "Quoi ? Quoicoubeh. Pardon, j’essaie de parler jeune.", pose: "etonne" },
    { texte: "J’ai 574 ans et je suis plus motivé que toi.", pose: "moqueur" },
    { texte: "J’écris en miroir. Toi, tu scrolles TikTok. Chacun son talent.", pose: "moqueur" },
    { texte: "Comment est votre blanquette ? Pardon, mauvais film.", pose: "moqueur" },
    { texte: "Je m’ennuie. Fais une erreur, que je rigole un peu.", pose: "moqueur" },
    { texte: "J’ai dessiné un hélicoptère vers 1490. Toi, t’as ouvert une fiche ?", pose: "moqueur" },
    { texte: "La Peintresse gomme les gens. Moi, je gomme juste tes lacunes.", pose: "base" },
    { texte: "Rappel : l’Ethics, c’est des points faciles. Enfin, presque.", pose: "base" },
    { texte: "Une petite session ? Juste une. Promis, je regarde pas.", pose: "base" },
    { texte: "Le CFA ne va pas se réviser tout seul. J’ai vérifié.", pose: "base" },
    { texte: "Hé, toi. Oui, toi. T’as révisé aujourd’hui ?", pose: "moqueur" },
  ],
};

/**
 * La visite guidée : chaque étape se joue sur une page (Léonard y emmène le
 * joueur) et peut éclairer un élément de cette page (`cible` = la valeur de
 * son attribut data-leonard). Sans cet élément sur la page, il éclaire son
 * `repli` s'il y en a un ; une étape `facultatif` est sautée (rien à montrer
 * à ce joueur-là). La page « /profil » est le profil du joueur (/people/<son id>).
 * La visite d'accueil tient en 5 étapes (Codex simplifié, 17 octobre 2026) :
 * les 30 et les 5 du jour, les traits du jour et leur anneau, le sceau des
 * quêtes en haut à droite (un guide secondaire ; sauté sans le Codex), la
 * tuile Codex de Moi (le Codex a quitté la barre), les réglages (me couper,
 * le mode sobre).
 */
export type EtapeTuto = Replique & { page: string; cible?: string; repli?: string; facultatif?: boolean };

export const TUTO: EtapeTuto[] = [
  { page: "/dashboard", cible: "defi", texte: "Moi c’est Léonard. Oui, celui de la Joconde. Ici, ton rendez-vous de chaque jour : les 30 et les 5 du jour. Un peu chaque jour, et ça rentre.", pose: "fier" },
  { page: "/dashboard", cible: "anneau", texte: "Et là, tes traits du jour : chaque réponse trace un bout de l’anneau. Fermé, ton objectif du jour est tenu. Giotto traçait ses cercles à main levée ; toi, tu réponds.", pose: "base" },
  { page: "/dashboard", cible: "sceau-quetes", facultatif: true, texte: "En haut à droite, mon sceau : quelques quêtes pour te guider, et ce que tu as gagné, à récupérer. Des idées, pas des ordres : ton plan reste le tien.", pose: "base" },
  { page: "/moi", cible: "moi-codex", texte: "Le Codex, mon grand livre de quêtes, est rangé ici, dans Moi : ton parcours, tes quêtes faites, ce qu’elles t’ont rapporté. Pour les curieux.", pose: "fier" },
  { page: "/moi?onglet=reglages", cible: "reglages", texte: "Et si je te saoule, c’est ici qu’on me coupe. Le mode sobre range aussi les fanfares : l’XP arrive seule. Tu le feras pas, hein ? Allez, ton premier trait t’attend.", pose: "decu" },
];

/**
 * Les nouveautés d'une version (lib/presentation, VERSION_NOUVEAUTES) : une
 * visite courte, une fois par compte, pour ceux qui ont déjà fait la visite
 * d'accueil. Version 4 (Codex simplifié, 17 octobre 2026) : les quêtes logent
 * dans le sceau en haut à droite, une quête faite se récupère (« Récupérer »),
 * et le Codex a quitté la barre pour une tuile de Moi. Le sceau n'est là
 * qu'avec le Codex : ses deux étapes sont facultatives. Une étape dont
 * l'élément peut manquer (pas de données) est facultative ou a un repli.
 */
export const NOUVEAUTES: EtapeTuto[] = [
  { page: "/dashboard", cible: "sceau-quetes", facultatif: true, texte: "Re. J’ai rangé l’atelier. Les quêtes logent maintenant en haut à droite, dans ce sceau : celles du jour, et la suite si tu en veux.", pose: "fier" },
  { page: "/dashboard", cible: "sceau-quetes", facultatif: true, texte: "Une quête faite ne paie plus en douce : un chiffre se pose sur le sceau, tu touches « Récupérer », et l’XP est à toi. En mode sobre, elle arrive seule.", pose: "base" },
  { page: "/moi", cible: "moi-codex", texte: "Le Codex a quitté la barre du haut : il t’attend ici, dans Moi, avec l’historique de tes quêtes. Quand tu veux, sans obligation.", pose: "base" },
];

/** Ce que montrent les nouveautés de cette version, en une ligne (Moi › Réglages, « Les nouveautés »). */
export const RESUME_NOUVEAUTES = "Le sceau des quêtes, « Récupérer », le Codex dans Moi";
