// Répliques de Léonard, la mascotte de Ranked Lobby.
// Module sans dépendance. Marqueurs à remplacer par l'appelant :
//   {score} → « 7/10 »   (session-ratee, session-moyenne, session-reussie, session-parfaite)
//   {pct}   → « 70 % »   (mêmes événements)
//   {n}     → « 8 »      (serie-bonnes : nombre de bonnes réponses d'affilée ;
//                         atelier-rayees : ratures rayées pendant l'Atelier)
//   {notion} → « Duration » (atelier-progres, atelier-dur : la notion dont il parle)
// Les autres événements n'utilisent aucun marqueur.

export type Pose = "base" | "fier" | "moqueur" | "decu" | "etonne";
export type Replique = { texte: string; pose: Pose };
export type Evenement =
  | "tuto" | "erreurs-serie" | "session-ratee" | "session-moyenne" | "session-reussie" | "session-parfaite"
  | "serie-bonnes" | "progression" | "duel-gagne" | "duel-perdu" | "duel-ecrase" | "duel-nul"
  | "defi-reussi" | "defi-rate" | "atelier-progres" | "atelier-rayees" | "atelier-dur" | "atelier-fini" | "rang-monte" | "sceau-gagne" | "retour" | "tard" | "furtif"
  | "nouveautes";

/** Les deux visites guidées (TUTO, NOUVEAUTES) : des étapes, pas des répliques au hasard. */
export type Visite = "tuto" | "nouveautes";

export const REPLIQUES: Record<Exclude<Evenement, Visite>, Replique[]> = {
  "erreurs-serie": [
    { texte: "Et 1, et 2 et 3-0, on dirait l’OM.", pose: "moqueur" },
    { texte: "Trois d’affilée. Tu fais exprès pour me voir, avoue.", pose: "moqueur" },
    { texte: "Jusqu’ici tout va bien… Ah non, en fait.", pose: "decu" },
    { texte: "Courbe des taux inversée. Récession en vue sur ta session.", pose: "decu" },
    { texte: "Tu veux un 50/50 ? Un appel à un ami ?", pose: "moqueur" },
    { texte: "Tu fais ton Perceval : « c’est pas faux ». Si, c’est faux.", pose: "moqueur" },
    { texte: "Margin call : ton cerveau réclame des liquidités. Vite.", pose: "decu" },
    { texte: "Chat, c’est réel ? Trois erreurs de suite ?", pose: "etonne" },
    { texte: "-1000 d’aura. Ça se rattrape, mais pas en cliquant au hasard.", pose: "moqueur" },
    { texte: "On a jeté de la soupe sur ma Joconde. Elle a tenu. Toi aussi.", pose: "base" },
    { texte: "Respire. Lis l’énoncé. Puis relis le bout que t’as sauté.", pose: "base" },
    { texte: "Stop-loss déclenché. On coupe la perte et on repart.", pose: "base" },
  ],

  "session-ratee": [
    { texte: "{score}. Krach de 1929, version révisions.", pose: "decu" },
    { texte: "T’as révisé. T’as cliqué. T’as raté. Bref.", pose: "decu" },
    { texte: "Au bilan : beaucoup de passif, très peu d’actif.", pose: "moqueur" },
    { texte: "{score}. Je le note dans mes carnets. En miroir, personne ne lira.", pose: "moqueur" },
    { texte: "Bonne nouvelle : à {pct}, c’est le moment de buy the dip.", pose: "base" },
    { texte: "{pct}. Not stonks. Vraiment pas stonks.", pose: "decu" },
    { texte: "Joueur du Grenier ferait un épisode sur cette session.", pose: "moqueur" },
    { texte: "Wasted. Respawn dans 3, 2, 1…", pose: "moqueur" },
    { texte: "Etchebest serait déjà en train de hurler. Moi, je souris.", pose: "moqueur" },
    { texte: "{score} ? Même en 1500, sans Internet, j’aurais fait mieux.", pose: "moqueur" },
    { texte: "Le fond est touché. Techniquement, c’est un point d’entrée.", pose: "base" },
    { texte: "On va dire que c’était un échauffement. Un long échauffement.", pose: "base" },
  ],

  "session-moyenne": [
    { texte: "{score}. Mi-figue, mi-raisin. Plutôt raisin sec.", pose: "moqueur" },
    { texte: "{pct}. Sur un malentendu, ça peut marcher. Pas au CFA.", pose: "moqueur" },
    { texte: "Correct. Comme une pizza surgelée : ça dépanne, ça régale pas.", pose: "base" },
    { texte: "Rebond du chat mort ou vraie reprise ? À suivre.", pose: "etonne" },
    { texte: "{score}. Marche aléatoire ? Avoue, t’en as cliqué deux ou trois au pif.", pose: "moqueur" },
    { texte: "Rendement moyen, risque élevé. Ton ratio de Sharpe fait la tête.", pose: "decu" },
    { texte: "{pct}, c’est « pas mal ». Le CFA, lui, veut « bien ».", pose: "base" },
    { texte: "{score}. On dirait un bulletin de 3e : « peut mieux faire ».", pose: "moqueur" },
    { texte: "Moitié juste, moitié faux. Ton portefeuille est bien diversifié.", pose: "moqueur" },
    { texte: "{pct}. Pas de quoi faire un TikTok, pas de quoi pleurer.", pose: "base" },
    { texte: "Pas un chef-d’œuvre, pas un gribouillis. Une esquisse.", pose: "base" },
    { texte: "Pas mal. Pas fou. Mais pas mal.", pose: "fier" },
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
    { texte: "Carapace bleue à deux mètres de l’arrivée. Classique.", pose: "decu" },
    { texte: "La tribu a parlé. Rends-moi ton flambeau.", pose: "decu" },
    { texte: "Mission échouée. On l’aura la prochaine fois.", pose: "moqueur" },
    { texte: "« J’ai cliqué trop vite » ? Standard I(C), misrepresentation.", pose: "moqueur" },
    { texte: "Le seum est autorisé. Cinq minutes, pas plus.", pose: "moqueur" },
    { texte: "Revanche ? Je dis ça, je dis rien.", pose: "base" },
    { texte: "Même la Joconde s’est fait voler en 1911. Elle est revenue.", pose: "base" },
    { texte: "Ton ELO a pris un petit drawdown. Rien de grave.", pose: "decu" },
    { texte: "Il a gagné le duel. Toi, mon respect. Un peu.", pose: "moqueur" },
    { texte: "Défaite. Ma machine volante aussi, au début. Et à la fin.", pose: "decu" },
    { texte: "Tu l’as laissé gagner, c’est ça ? Trop gentil.", pose: "moqueur" },
    { texte: "Note son pseudo. La vengeance se mange froide.", pose: "moqueur" },
  ],

  "duel-ecrase": [
    { texte: "Joueur 456, éliminé. Pas de deuxième jeu.", pose: "decu" },
    { texte: "5-0, comme l’Inter en finale. Douloureux.", pose: "moqueur" },
    { texte: "Même Lehman Brothers a tenu plus longtemps.", pose: "moqueur" },
    { texte: "C’est plus un duel, c’est une liquidation judiciaire.", pose: "decu" },
    { texte: "Même le Louvre a mieux défendu ses bijoux.", pose: "moqueur" },
    { texte: "Je lance la coffin dance ou t’es encore vivant ?", pose: "moqueur" },
    { texte: "YOU DIED. En lettres rouges, oui.", pose: "decu" },
    { texte: "Fatality. Sauf que c’est lui qui l’a faite.", pose: "moqueur" },
    { texte: "Il a vendu ton ELO à découvert. Et il a encaissé.", pose: "moqueur" },
    { texte: "C’était pas un duel. C’était un tuto… pour lui.", pose: "decu" },
    { texte: "Ah ouais ? Ah ouais. Il t’a pas raté.", pose: "etonne" },
    { texte: "On n’en parle plus jamais. Sauf moi, demain.", pose: "moqueur" },
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
    { texte: "Défi raté. Même Wordle t’aurait laissé six essais.", pose: "moqueur" },
    { texte: "Le défi a gagné aujourd’hui. Il fait la fête, là.", pose: "moqueur" },
    { texte: "Le défi a parié contre toi. Et il a eu raison.", pose: "moqueur" },
    { texte: "Rater un défi, c’est humain. Deux d’affilée, c’est une tendance.", pose: "decu" },
    { texte: "Défi : 1. Toi : 0. Le match retour, c’est demain.", pose: "base" },
    { texte: "On dira que c’était le défi d’hier.", pose: "moqueur" },
    { texte: "Daily quest échouée. Pas d’XP aujourd’hui.", pose: "decu" },
    { texte: "Mon cheval en bronze n’a jamais vu le jour. On s’en remet.", pose: "base" },
    { texte: "Le défi était coriace. Toi aussi, d’habitude.", pose: "moqueur" },
    { texte: "Raté. Le défi dormira mieux que toi ce soir.", pose: "decu" },
    { texte: "Défi raté. Ta série vient de faire un krach éclair.", pose: "decu" },
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
    { texte: "{notion}, ça résiste. La Joconde, j’ai mis seize ans. Toi, on a le temps.", pose: "base" },
    { texte: "{score}. {notion} te tient tête. Relis le chapitre, puis on y retourne.", pose: "base" },
    { texte: "{notion} : le marbre est dur. On taille quand même.", pose: "base" },
    { texte: "Un atelier, c’est fait pour salir ses mains. Là, elles sont bien sales.", pose: "moqueur" },
    { texte: "{notion}, c’est un drawdown. Pas une faillite.", pose: "decu" },
    { texte: "Même mes premiers croquis étaient bancals. Demain, {notion} encore.", pose: "base" },
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

  "sceau-gagne": [
    { texte: "Un sceau de plus. Je le rangerais dans mes carnets, mais ils sont pleins.", pose: "fier" },
    { texte: "Succès débloqué. Le petit bruit, tu l’as entendu dans ta tête.", pose: "etonne" },
    { texte: "Trophée PlayStation débloqué. Version papier, mais quand même.", pose: "fier" },
    { texte: "Les Médicis scellaient leurs lettres comme ça. T’es en bonne compagnie.", pose: "fier" },
    { texte: "Un sceau, ça ne s’efface pas. Contrairement à mes esquisses.", pose: "base" },
    { texte: "Pose-le sur ton profil. Qu’ils voient tous.", pose: "moqueur" },
  ],

  "retour": [
    { texte: "Tiens, un revenant. On te croyait perdu.", pose: "etonne" },
    { texte: "Ton retour était plus attendu que Silksong.", pose: "etonne" },
    { texte: "Comme Monte-Cristo : parti longtemps, revenu pour se venger ?", pose: "moqueur" },
    { texte: "J’ai mis des années à finir la Joconde. Ton absence, je pardonne.", pose: "base" },
    { texte: "Le marché a bougé pendant ton absence. Toi, non.", pose: "moqueur" },
    { texte: "Retraite spirituelle ou retraite anticipée ?", pose: "moqueur" },
    { texte: "Tes flashcards ont pleuré. J’ai dû les consoler.", pose: "decu" },
    { texte: "Le hibou de Duolingo m’a demandé de tes nouvelles.", pose: "moqueur" },
    { texte: "Respawn au dernier feu de camp. On reprend ?", pose: "base" },
    { texte: "Tes neurones ont pris des congés payés ?", pose: "moqueur" },
    { texte: "Pendant ton absence, la date de l’examen n’a pas bougé.", pose: "base" },
    { texte: "Te revoilà ! J’avais commencé ton portrait-robot.", pose: "etonne" },
  ],

  "tard": [
    { texte: "POV : minuit passé, et toi tu révises la duration.", pose: "moqueur" },
    { texte: "Tokyo va bientôt ouvrir. Toi, t’as jamais fermé.", pose: "moqueur" },
    { texte: "On dit que je dormais 20 minutes toutes les 4 heures. Faux. Dors.", pose: "base" },
    { texte: "Marché efficient : ton score intègre déjà ta fatigue.", pose: "moqueur" },
    { texte: "Après minuit, les flashcards se transforment en citrouilles.", pose: "moqueur" },
    { texte: "Même le Louvre est fermé. Ferme les yeux, toi aussi.", pose: "base" },
    { texte: "Session de nuit : risque overnight maximal.", pose: "moqueur" },
    { texte: "Insomnie ou ambition ? Les deux, je vois.", pose: "etonne" },
    { texte: "Tu révises comme un streamer en subathon. Sans les dons.", pose: "moqueur" },
    { texte: "Ton lit a lancé un avis de recherche.", pose: "base" },
    { texte: "Réviser la nuit, ça paie. Dormir aussi, et c’est gratuit.", pose: "base" },
    { texte: "Mode chauve-souris activé. Respect. Mais va dormir.", pose: "etonne" },
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
 */
export type EtapeTuto = Replique & { page: string; cible?: string; repli?: string; facultatif?: boolean };

export const TUTO: EtapeTuto[] = [
  { page: "/dashboard", texte: "Moi c’est Léonard. Oui, celui de la Joconde. Suis-moi, je te fais visiter : une minute, promis.", pose: "base" },
  { page: "/dashboard", cible: "anneau", texte: "Ton anneau du jour. Chaque question répondue, un trait. Tu le fermes avant minuit, t’es un génie.", pose: "fier" },
  { page: "/dashboard", cible: "defi", texte: "Le défi du jour : les mêmes questions pour tout le monde, résultats publics. Pas de pression. Si, un peu.", pose: "moqueur" },
  { page: "/reviser", cible: "fiches", texte: "Réviser. Les fiches, c’est comme mes carnets : en mieux rangées, et lisibles sans miroir.", pose: "fier" },
  { page: "/reviser", cible: "formats", texte: "Les flashcards et les cours complets, à lire ou à écouter. T’as plus aucune excuse.", pose: "base" },
  { page: "/entrainement", cible: "session", texte: "S’entraîner. Une session sur tes points faibles, et le défi du jour. Ça, c’est le quotidien.", pose: "fier" },
  { page: "/entrainement", cible: "contre", texte: "Examens blancs classés et duels : là, ça compte pour ton rang. Viens pas pleurer après.", pose: "moqueur" },
  { page: "/classement", cible: "rang", texte: "Ton rang, de Bronze à Grand Maître. En dessous, le classement et tes duels. Ici, on se mesure. Et on se chambre.", pose: "etonne" },
  { page: "/moi?onglet=reglages", cible: "reglages", texte: "Et si je te saoule, c’est ici qu’on me coupe. Tu le feras pas, hein ?", pose: "decu" },
  { page: "/dashboard", cible: "defi", texte: "Fin de la visite. Ton premier trait t’attend. Je repasse de temps en temps… surtout quand tu te trompes.", pose: "fier" },
];

/**
 * Les nouveautés d'une version (lib/presentation, VERSION_NOUVEAUTES) : une
 * visite courte, une fois par compte, pour ceux qui ont déjà fait la visite
 * d'accueil. Version 1 (octobre 2026) : points faibles et l'Atelier, carnet
 * par notion, profil (sceaux, Journal, saisons, Personnaliser), carte joueur
 * et tampons, « Du nouveau ».
 */
export const NOUVEAUTES: EtapeTuto[] = [
  { page: "/dashboard", texte: "Re. Pendant que tu dormais, j’ai fait des travaux. Je te montre les nouveautés : deux minutes, chrono.", pose: "fier" },
  { page: "/entrainement", cible: "points-faibles", repli: "session", texte: "Tes points faibles, notion par notion. Je sais exactement où tu coinces. Désolé, pas désolé.", pose: "moqueur" },
  { page: "/entrainement", cible: "atelier", facultatif: true, texte: "L’Atelier : 30 minutes sur tes trois notions les plus faibles. Rappel, tes ratures, du neuf, un calcul, et un bilan. Tu ressors réparé.", pose: "fier" },
  { page: "/moi?onglet=erreurs", cible: "carnet-notions", facultatif: true, texte: "Ton carnet de ratures se range aussi par notion. Pratique pour voir où ça saigne.", pose: "etonne" },
  { page: "/profil", cible: "sceaux-poses", texte: "Ton profil a pris du galon. Ici, tes trois plus beaux sceaux. Ou les trois que tu choisis : t’es chez toi.", pose: "fier" },
  { page: "/profil?onglet=sceaux", cible: "collection", texte: "La collection : encre, vermillon, dorure. Ceux en relief, tu les as pas encore. Au boulot.", pose: "moqueur" },
  { page: "/profil?onglet=journal", cible: "journal", texte: "Le Journal : ta courbe d’ELO, tes jours joués, tes exploits. Et chaque saison, ton pic est gravé pour toujours. Comme ma Joconde.", pose: "base" },
  { page: "/profil?onglet=journal", cible: "personnaliser", texte: "Personnaliser, direct sur la page. Ce qui est fixe est libre. Ce qui bouge ou qui brille, ça se gagne.", pose: "fier" },
  { page: "/classement", cible: "joueurs", texte: "Touche un joueur : sa carte s’ouvre. Défie-le, va voir son profil, laisse-lui un tampon. Bravo, Respect… ou Revanche ?", pose: "moqueur" },
  { page: "/dashboard", cible: "du-nouveau", facultatif: true, texte: "Et ici, les nouvelles de tes amis : qui est monté, qui t’a battu. Pour la rancune, c’est pratique.", pose: "moqueur" },
  { page: "/dashboard", cible: "anneau", texte: "C’est tout. Va faire un Atelier, je te regarde. Enfin, de loin.", pose: "fier" },
];
