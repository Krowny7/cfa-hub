# Le Codex — la bible

> Le carnet de Léonard qui dit, à tout moment, **quoi faire maintenant** et **pourquoi**, de la première question jusqu'au jour J.

Le contenu vit dans `lib/codex/catalogue.ts`, la grammaire dans `lib/codex/types.ts`. Ce document dit le *pourquoi* et les règles ; en cas de doute, les données font foi.

---

## 1. Principes

1. **Une seule prochaine quête.** Le Codex peut contenir 230 quêtes, le joueur n'en voit qu'une mise en avant : la plus utile maintenant (§10).
2. **Rien de révision n'est verrouillé, jamais.** Les quêtes récompensent ; elles n'ouvrent pas l'accès. Au début, on *range* (dévoilement), on ne *ferme* pas : un lien direct marche toujours.
3. **Récompenser l'apprentissage, pas le volume.** Pas de « 500 questions » : « 15 séances à ≥ 70 % », « 20 ratures rayées », « une matière remontée de 10 points », « 50 questions revues 7 jours plus tard ».
4. **Le Codex est généré depuis le contenu.** Une matière, une fiche, un drill, un cours ajoutés au catalogue ajoutent leurs étapes tout seuls. Une matière sans drill n'a pas d'étape drill.
5. **Ce qui a été fait compte.** Les objectifs se lisent dans l'historique ; les prérequis ordonnent l'affichage et la récompense, pas l'effort. Une quête dont l'objectif est déjà rempli se valide dès que ses prérequis tombent (en cascade).
6. **Récompenses : XP et cosmétique, rien d'autre.** XP plafonnée (une quête ne fait jamais sauter un niveau), cosmétiques qui *bougent* et titres (« ce qui est fixe est libre, ce qui brille se gagne »).
7. **Calé sur le jour J.** Les contrats et la recommandation changent de priorités selon la phase (fondations → consolidation → répétition générale → veillée).
8. **Léger mais présent.** Florence, la bottega, Léonard qui taquine. Une réplique à l'ouverture et à la clôture de chaque acte ; le reste se tait.

## 2. Les quatre familles

| Famille | Ce que c'est | Durée | Visibilité |
|---|---|---|---|
| **Trame** | 8 actes, de la porte de la bottega au jour J | la préparation entière | visible, acte par acte |
| **Branches de matière** | une branche par matière, de « premier pas » à « Maître de… » | semaines | visibles (le chemin se voit, verrouillé) |
| **Au long cours** | 15 chaînes à paliers (couverture, maîtrise, mémoire, examens, régularité, méthode, compétition) | semaines à mois | palier courant + suivant |
| **Exploits** | les 22 sceaux (connus) + 16 exploits cachés | au hasard des séances | cachés (certains avec une énigme) |

Plus les **contrats** : 3 par jour (modèles personnalisés) et 3 de la semaine.

Le **graphe** : chaque quête a des prérequis (`quete`, `acte` clos, `toutesBranches` / `branches` à une étape, fenêtre `joursAvantExamen`, `unDe`). Nœuds de convergence : l'acte II se ferme quand **toutes** les branches ont fait leur premier pas ; l'acte V (« L'épreuve de la guilde ») s'ouvre quand **toutes** les branches ont passé leur séance ciblée (qui suit le drill quand la matière en a un).

## 3. La trame

Le joueur est apprenti dans la bottega de Léonard, à Florence. Le CFA est la « commande » qu'il prépare ; l'examen, l'épreuve de la guilde de Saint-Luc (où Léonard est entré en 1472).

| # | Acte | Ce qu'il apprend | S'ouvre | Clôture |
|---|---|---|---|---|
| 0 | **La porte de la bottega** | premier trait, jour J, 10 questions, une séance entière | dès l'inscription | 50 XP, titre *Apprenti* |
| I | **Broyer les couleurs** | chaque outil une fois : fiche + drill, 5 du jour, rature, Atelier, duel, calculs (cours en bonus) | après le premier trait (même séance) | 120 XP |
| II | **Les dix pigments** | premier pas dans les 10 matières, une séance ciblée à 70 %, 3 jours d'encre, un drill complet | prologue clos | 200 XP, bannière *Carnet de Léonard*, titre *Garzone* |
| III | **Les carnets** | 25 notions vues, 3 matières à 60 %, 20 ratures rayées, 20 rappels à 7 jours, 3 Ateliers | acte II clos | 250 XP |
| IV | **La première commande** | 1er examen blanc, 4 semaines à 4 jours d'encre, 5 « 30 du jour », 50 % de maîtrise, une matière remontée | acte III clos | 300 XP, cadre *Sanguine*, titre *Compagnon* |
| V | **L'épreuve de la guilde** | examen blanc à 60 %, programme à 60 %, 75 % des notions vues, < 50 ratures | acte IV clos **et** toutes les branches à « séance ciblée » | 400 XP, bannière *Florence à l'aube*, titre *Peintre de la guilde* |
| VI | **Le chef-d'œuvre** | programme à 70 %, 2 blancs à 70 %, 10 matières à 65 %, Éthique à 75 % | acte V clos | 600 XP, cadre *Laurier*, titre *Maître de bottega* |
| ∞ | **Le jour J** (épilogue) | blanc complet dans le dernier mois, < 20 ratures, 40 questions d'Éthique, la veille : 5 questions et dodo | **par la date** (J-30, J-21, J-14, J-1), quel que soit l'acte | 300 XP, titre *Prêt pour le jour J* |

Répliques (ouverture / clôture) — exemples, toutes dans `ACTES` :

- Prologue — « Entre. Ici, on broie des couleurs avant de peindre des Joconde. Toi, ce sera des questions avant le CFA. » / « Premier trait posé. Verrocchio a mis des années à me dire bravo. Moi je suis généreux : bravo. »
- Acte V — « Toutes tes branches ont tenu leur épreuve. La guilde t'attend. Tiens-toi droit, ils regardent les mains. » / « Admis à la guilde. J'y suis entré en 1472. Toi, aujourd'hui. On a presque le même parcours. »
- Épilogue — « Trente jours. On ne commence plus de fresque : on reprend les retouches. » / « Pose le pinceau. Dors. Même moi je dormais, parfois. Rarement, mais quand même. »

Ton : celui de `lib/leonard/repliques.ts` (finance + culture pop + Renaissance), une réplique par moment, jamais de tartine. Les consignes de quête restent sobres, à l'impératif.

## 4. La découverte progressive (nouveau compte)

On montre peu, puis tout, **dans la première séance**. Chaque dévoilement a trois filets : une quête du prologue, des minutes de présence, le 2ᵉ jour de visite — et le bouton **« Tout montrer »** (Codex et Réglages) qui dévoile tout d'un coup.

| Moment (≈) | Ce qui apparaît | Déclencheur (le premier rempli) |
|---|---|---|
| 0 min | Accueil (logo), **Codex** (le prologue seul), Moi | — |
| 1–2 min | **Réviser** ; les branches de matière dans le Codex | premier trait · 10 min · 2ᵉ visite |
| 5–10 min | **S'entraîner** | 10 questions · 15 min · 2ᵉ visite |
| 10–20 min | **Contrats du jour** ; **quêtes au long cours** | une séance entière · 20/30 min · 2ᵉ visite |
| 15–30 min | **Classement** (duels, examens blancs) | premier duel ou 5 du jour · 30 min · 2ᵉ visite |
| ≤ 45 min | **Exploits** — et donc tout | une séance entière · 45 min · 2ᵉ visite |

- Chaque dévoilement : un onglet qui s'encre (animation du trait) + une réplique de Léonard (`DECOUVERTE`).
- Ce qui est rangé reste joignable : liens directs, liens des quêtes, recherche.
- **Comptes existants** (inscrits avant la mise en ligne du Codex, ou ≥ 50 questions) : tout visible d'emblée, et la rétroactivité (§11).
- État gardé dans `user_metadata.rl_codex` (`devoile: string[] | "tout"`), comme `rl_visite`.

## 5. Les branches de matière

Générées par `genererBranches(contenuDuProgramme())`. Ids `branche:<matière>:<étape>`.

| Étape | Condition exacte | Prérequis | XP | Existe si |
|---|---|---|---|---|
| `entree` Premier pas | 10 réponses dans la matière | — | 30 | toujours |
| `cours` L'oreille du maître *(bonus)* | 30 min du cours écoutées | — | 40 | cours dans `lib/courses.ts` |
| `fiche` La fiche | une page de drill passée en entier | — | 40 | fiche **avec** drill |
| `fiche` *(bonus)* | fiche ouverte | — | 30 | fiche **sans** drill (Derivatives) |
| `drill` Le drill complet | toutes les pages de drill passées (0 restante) | fiche | 100 | drill |
| `flashcards` *(bonus)* | 40 cartes révisées | — | 30 | dossiers de flashcards |
| `ciblee` **La séance ciblée** (jalon) | session ciblée mono-matière ≥ 15 q à ≥ 70 % | drill s'il existe, sinon premier pas | 120 | toujours |
| `tour` Le tour de la matière | 100 % des notions de la matière vues (≥ 5 réponses chacune) | premier pas | 60 + 5/notion (≤ 150) | toujours |
| `maitrise60` Le pigment tient | maîtrise ≥ 60 (mesurée dès 40 questions) | séance ciblée | 180 | toujours |
| `maitrise75` La couleur juste | maîtrise ≥ 75 | 60 % | 260 | toujours |
| `maitre` **Maître de …** | maîtrise ≥ 85 **et** toutes les notions vues **et** ≤ 5 ratures ouvertes dans la matière | 75 % + tour | 400 + titre *Maître de …* | toujours |

Les étapes bonus ne bloquent jamais rien, et restent masquées tant que leur événement n'est pas suivi en base (§13). Aujourd'hui : 10 branches, 91 étapes (70 hors bonus). Le sceau de matière (60/75/90) continue après « Maître » : la dorure à 90 reste le sommet.

## 6. Les quêtes au long cours (le cœur)

Chaque chaîne sert un axe de la préparation ; chaque palier ouvre le suivant. Ids `longcours:<chaîne>:<palier>`.

| Chaîne | Axe | Paliers | Sommet |
|---|---|---|---|
| **La carte du programme** | couverture | notions vues : 10 · 25 · 50 · 75 · 100 % | bannière *Plan d'Imola* |
| **Le compas** | maîtrise | programme : 30 · 45 · 60 · 70 · 80 % | titre *Compas d'or* |
| **Le métier** | maîtrise | matières à ≥ 70 % : 1 · 3 · 5 · 8 | titre *Polymathe* |
| **La mémoire longue** | mémoire | bonnes réponses ≥ 7 j après la précédente : 10 · 50 · 150 · 400 · 1 000 | cadre *Sfumato* |
| **Le carnet propre** | mémoire | ≤ 100 ratures à 500 q · ≤ 60 à 1 000 · ≤ 30 à 2 000 | — |
| **Les commandes** | examens | blancs rendus 1 · 3 ; à ≥ 70 % 1 · 3 ; à ≥ 80 % 1 (ouvre après l'acte II) | titre *Commande honorée* |
| **L'encre fidèle** | régularité | semaines à ≥ 4 jours d'encre : 2 · 4 · 8 · 12 · 20 | cadre *Encre fidèle* |
| **La justesse** | méthode | séances ≥ 20 q à ≥ 70 % : 5 · 15 · 40 · 100 | — |
| **La remontée** | maîtrise | matières remontées de 10 pts (vs leurs 40 premières q) : 1 · 3 · 5 | — |
| **Le calcul juste** | méthode | types de calcul tenus (5 justes / 6 derniers) : 5 · 15 · 30 | — |
| **Les sources** | couverture | pages de drill à ≥ 80 % : 5 · 15 · 30 | — |
| **L'Atelier** | méthode | Ateliers qui rayent ≥ 1 rature : 3 · 10 · 25 | — |
| **La trentaine** | examens | 30 du jour à ≥ 60 % : 5 · 20 · 50 | — |
| **Le rythme** | régularité | semaines au rythme de l'objectif : 1 · 4 · 8 · 16 (après le jour J fixé) | — |
| **La joute** | compétition | duels joués 5 · 25 ; palier Or · Platine · Diamant (60 % de maîtrise exigés) | titre *Duelliste de la guilde* |

Pourquoi ces chaînes : elles couvrent ce qui fait réussir le CFA I — **tout voir** (carte, sources, tour), **maîtriser** (compas, métier, remontée), **retenir** (mémoire longue, carnet propre), **s'habituer à l'épreuve** (commandes, trentaine), **durer** (encre, rythme), **savoir calculer** (calcul juste), et une **compétition saine** dont les paliers hauts exigent la maîtrise.

## 7. Les exploits (unifiés avec les sceaux)

**Les 22 sceaux sont les exploits connus** — `lib/profil/sceaux.ts`, inchangés (paliers, cérémonies, cosmétiques). Le Codex les affiche dans sa page Exploits et donne 50 XP au premier palier (`exploit:sceau:<clé>`).

- Régularité : Assiduité (série 7/30/100 j), Copie pleine (500/2 500/10 000 q), Défi tenu (7/30/100 défis).
- Duels : Duelliste (1/25/100 victoires), Coup d'éclat (écart battu +1/+2/Top 10).
- Calculs : Calculateur (50/250/1 000). Examens : Examen blanc (1/3/10).
- Mentions : Remontada, Sans-faute, Éclair, Sang-froid (1/10/25). Ratures : Mise au propre (50/250/1 000).
- Matières : un sceau par matière (60/75/90 % de maîtrise).

**16 exploits nouveaux, cachés** (`exploit:<id>`), gardés dans la **même table `sceaux`** (clé `exploit:<id>`, palier 1) pour n'avoir qu'une Collection et qu'une cérémonie : La Joconde (100 % sur ≥ 20 q), La main sûre (15 bonnes d'affilée), Pas une tache (15/15 à une page), Le phénix (30 du jour < 50 % puis ≥ 80 % le lendemain), Retour de Milan (revenir après 14 j, 20 q), Uomo universale (10 matières dans la semaine), L'Homme de Vitruve (10 matières à 80 % → cadre *Vitruve*), La machine volante (5/5 en < 60 s → bannière animée), L'écriture en miroir (rayer une rature ratée 3 fois), Le repentir (rature de > 30 j), Entre amis, Premier sur l'échafaudage (1er aux 5 du jour), Vélin immaculé (0 rature à ≥ 1 000 q), Codex Atlanticus (100 quêtes → titre), L'aube sur le Duomo (10 q avant 7 h), Le calcul à la plume (20 calculs justes d'affilée). Neuf ont une **énigme** visible (`indice`), les autres sont totalement cachés.

## 8. Les contrats du jour

Trois par jour, un par **emplacement** ; le trio tient en **30 à 45 minutes**. 30 XP chacun, **+50 XP** quand les trois sont faits. Instance : `contrat:<modèle>:<AAAA-MM-JJ>`, tirée une fois par jour (gardée en base, stable toute la journée), seed = joueur + jour.

| Emplacement | Modèles (durée) |
|---|---|
| **Faiblesse** — ce qui coince, pondéré par le poids à l'examen | Atelier : {notion} — 8 bonnes réponses (15′) · Séance de {matière} 15 q ≥ 65 % (25′) · Une page de {fiche} ≥ 70 % (20′) · Une séance d'Atelier (30′) · Calculs de {matière} ×10 (10′) |
| **Entretien** — ne pas laisser filer | 5 ratures rayées (10′) · 3 ratures de > 7 j (10′) · 10 bonnes réponses revues ≥ 7 j après (15′) · {matière} pas travaillée depuis 10 j : 15 q (15′) · 20 min de cours *(à brancher)* · 30 flashcards *(à brancher)* |
| **Variété** — un format pas joué récemment | 5 du jour à 4/5 (5′) · 2 séries éclair à 4/5 (10′) · un duel (10′) · les 30 du jour (40′) |

Choix :
1. **Paramètres** : `notion` = le premier point faible (`lib/points-faibles.ts`) ; `matiere` = argmax de *poids × (1 − maîtrise)* (maîtrise inconnue = 0,2) ; `fiche` = la fiche de cette matière, page la plus faible ; « matière oubliée » = la plus lourde non touchée depuis 10 jours.
2. **Éligibilité** (`eligible`) : pas de contrat « ratures » sans 5 ratures ouvertes, pas de « 30 du jour » avant 100 questions, etc. Un modèle dont l'événement n'est pas suivi n'est jamais tiré.
3. **Tirage pondéré par la phase** (`poids`), sans répéter le modèle de la veille dans le même emplacement, en respectant le budget (≤ 45 min ; si « les 30 du jour » sort, les deux autres prennent leur variante la plus courte).
4. **Contrats de la semaine** (quêtes hebdomadaires) : 5 jours d'encre (120 XP), réponses justes dans 6 matières (100 XP), un examen blanc (150 XP, à partir de J-60).

Phases (`phaseDe`) : **fondations** (> J-90 ou pas de date), **consolidation** (J-90 → J-31), **répétition générale** (J-30 → J-8), **veillée** (J-7 → J-0). Chaque phase a sa réplique.

## 9. Barème d'XP et cosmétiques

Courbe (`lib/leveling.ts`) : 100 XP pour le niveau 1, +15 % par niveau (niv. 10 : 352 ; niv. 20 : 1 423 ; niv. 30 : 5 758). Une bonne réponse neuve rapporte 10 à 20 XP.

| Quête | XP visée | Tombe vers le niveau |
|---|---|---|
| Prologue, acte I | 20–50 | 1–6 |
| Contrat du jour / trio | 30 / +50 | tous |
| Premier pas, fiche, bonus | 30–40 | 3–10 |
| Drill complet, séance ciblée | 100–120 | 8–15 |
| Maîtrise 60 / 75 / Maître | 180 / 260 / 400 | 15–30 |
| Paliers au long cours | 50 → 500 | 5 → 30 |
| Clôture d'acte | 50 → 600 | 3 → 30 |
| Exploit | 50–300 | — |

**Garde-fou** : l'XP versée = `min(xp, plafondQuete(niveau))`, la moitié du niveau en cours → **aucune quête ne fait sauter un niveau**. L'XP du Codex entre dans `xp_events` avec la source `codex` (elle n'est **pas** multipliée par la série d'encre : le trigger ne touche que les sources de questions). Tout le catalogue rapporte ≈ 36 000 XP ; un joueur sérieux en prend la moitié, soit un tiers environ de son XP totale : les questions restent le moteur.

**Cosmétiques** (`COSMETIQUES_CODEX`) — que des pièces qui bougent et des titres :
- Bannières vivantes : *Carnet de Léonard* (acte II), *Florence à l'aube* (acte V), *Plan d'Imola* (carte entière), *Machine volante* (exploit).
- Cadres vivants : *Sanguine* (acte IV), *Sfumato* (mémoire longue), *Encre fidèle* (20 semaines), *Laurier* (acte VI), *Vitruve* (exploit).
- Titres (une ligne sous le pseudo, un seul porté) : Apprenti, Garzone, Compagnon, Peintre de la guilde, Maître de bottega, Prêt pour le jour J, Compas d'or, Polymathe, Commande honorée, Duelliste de la guilde, Codex Atlanticus, et *Maître de <matière>* ×10.
À brancher dans `lib/profil/catalogue.ts` avec une condition `{ k: "codex"; quete: string }` (même logique « Acquis » : ce qu'on possède se déduit de ce qu'on a fait).

## 10. La prochaine quête

1. Prologue pas fini → sa prochaine quête, dans l'ordre. C'est tout.
2. Sinon, candidats : quêtes **ouvertes** (prérequis remplis), non faites, suivies en base, non cachées, plus les contrats du jour restants.
3. **score = 100 × importance × faiblesse × urgence × continuité × durée**
   - *importance* = poids de la matière à l'examen ÷ 17,5 (Ethics = 1) ; sans matière : 0,6.
   - *faiblesse* = 1 − maîtrise/100 (inconnue : 0,8) ; pour une notion : son score de point faible ÷ 100 ; sans matière : 0,7.
   - *urgence* : chaînes → `RECOMMANDATION.urgence[phase][axe]` (ex. examens ×1,5 en répétition générale, couverture ×1,3 en fondations) ; quête de l'acte en cours ×1,2 ; branches : étapes jusqu'au jalon ×1,2 en fondations, maîtrises ×1,2 à partir de J-30.
   - *continuité* : entamée ×1,3, à moitié ×1,5 ; même matière que la dernière séance ×1,15.
   - *durée* : ≤ 45 min ×1, au-delà ×0,7.
4. Recalculée en fin de séance (pas à chaque page) : la recommandation ne clignote pas. Affichée avec **une ligne de pourquoi** (« FSA pèse 12,5 % et tu es à 48 % »).
5. Les exploits ne sont jamais recommandés.

## 11. La rétroactivité

Au lancement (et à la première lecture du Codex par un compte) : toutes les quêtes uniques sont évaluées sur l'historique, prérequis en cascade, actes compris.
- Validées avec `retro = true` et la date « avant le … » (comme les sceaux) — la vraie date quand un compteur la donne.
- **Cosmétiques et titres : tous donnés.**
- **XP : plafonnée à un niveau entier** (`plafondRetro(niveau)`), le reste affiché « pour l'honneur ».
- Pas de rétroactivité pour les contrats ni les quêtes à fenêtre `depuisOuverture` (épilogue) ; la semaine en cours compte pour les contrats hebdo.
- Une seule cérémonie : « Léonard a feuilleté ton carnet » (actes clos, titres, cosmétiques), pas 80 fanfares.

## 12. Extensibilité

- **Nouveau contenu** (matière, fiche, drill, cours) : rien à écrire, `genererBranches` le prend.
- **Nouvelle fonctionnalité** : (1) déclarer son événement dans `ChampsEvenement` + `EVENEMENTS` (source), ou sa mesure dans `TypeMesure` + `MESURES` ; (2) l'ajouter à la vue SQL (ou l'écrire dans `codex_evenements`) ; (3) poser ses quêtes : une quête de trame dans l'acte en cours *ou* un acte ajouté à la fin, une chaîne, un modèle de contrat, un exploit. Tant que `branche: false`, ses quêtes restent masquées.
- **Nouveau programme** (CFA II, Histoire…) : son `PROGRAMME`, son `ContenuMatiere[]` lu dans son catalogue, sa trame (actes à lui) ; branches, chaînes génériques et contrats se réutilisent. La progression est par programme.
- **Ids stables** : ne jamais renommer ni réutiliser un id publié ; pour enlever une quête, `retiree: true`. `verifierCatalogue()` contrôle ids, prérequis et cosmétiques.
- `ObjectifSpecial` (prédicat codé à la main) : à garder rare — 5 aujourd'hui (`SPECIAUX`).

## 13. Ce qui manque en base

| Besoin | Aujourd'hui | À faire |
|---|---|---|
| `cours_ecoute` | localStorage du lecteur audio | écrire des minutes dans `codex_evenements` |
| `flashcards_revues` | localStorage (`lib/srs.ts`) | idem, par séance de cartes |
| `fiche_ouverte` | rien | idem, à l'ouverture d'une fiche sans drill |
| `question_repondue.ecartJours` | dispersé | calculé dans la vue (fenêtre `lag` par joueur × question) |
| notion d'une réponse | `quiz_questions.notion` (questions de banque) | les autres sources se rattachent par `question_id` quand c'est possible, sinon notion nulle |

Les quêtes qui en dépendent sont toutes **bonus** ou **contrats** : rien n'est bloqué en attendant.

## 14. Le moteur (implémenté)

| Pièce | Fichier | Rôle |
|---|---|---|
| Base | `migration_codex.sql` | journal d'événements (`codex_journal`), comptage et mesures (`codex_lire`), progression (`codex_progression`), contrats du jour (`codex_contrats`), récompenses uniques (`codex_ecrire`), événements non suivis ailleurs (`codex_evenements` + `codex_noter`) |
| Moteur | `lib/codex/moteur.ts` | pur : `planifier` (compteurs à demander) → `evaluer` (cascade des prérequis, rétroactivité, lot à écrire) ; `recommander` ; `tirerContrats` ; `devoiler` |
| Vue | `lib/codex/vue.ts` | `construireVue` : ce que l'écran affiche, dans l'ordre décidé |
| Serveur | `lib/codex/serveur.ts` | lit, évalue, écrit, repli sans migration (`VUE_INDISPONIBLE`) |
| Actions | `lib/codex/actions.ts` | gestes du joueur (synchroniser, réclamer, changer un contrat, fanfares, « Tout montrer », noter) |
| Tests | `scripts/codex/test-moteur.ts` + banc PGlite `sim-codex.mjs` | moteur pur / SQL |

Règles de mise en œuvre :
- **Le catalogue n'est pas en base.** Le site envoie ses objectifs à `codex_lire` (compteurs filtrés par événement, fenêtre, distinct, somme ; il récupère la date où le seuil est franchi) et lit les mesures que la base sait faire. Les mesures qui demandent le catalogue ou les rangs (maîtrise du programme, notions vues, palier, niveau, rythme de l'objectif) sont calculées dans le moteur.
- **Récompense versée automatiquement et UNE fois** : quand l'objectif est rempli, `codex_ecrire` passe la ligne à « récompensée », insère l'XP dans `xp_events` (source `codex`, non multipliée par la série d'encre) et dans `profiles.xp_total`, dans la même transaction. Un index unique sur `xp_events` double la sécurité. « Réclamer » est un filet explicite et idempotent.
- **Rétroactivité** : au premier calcul d'un compte, ou pour une quête dont la date d'atteinte précède le dernier calcul (prérequis tombés après coup, nouvelle quête sur une vieille histoire). Les contrats et les fenêtres « depuis l'ouverture » ne le sont jamais. XP prise sur un budget d'un niveau, cosmétiques et titres tous donnés, une seule cérémonie (`codex_joueur.retro`).
- **Mesures** : la maîtrise d'une matière ne compte qu'à partir de 40 questions de sessions ciblées mono-matière (comme les sceaux) ; la maîtrise du programme est la moyenne des matières du catalogue, les non mesurées à 0 ; le palier atteint tient compte du verrou de maîtrise (Diamant 60 %…).
- **Contrats** : tirés côté site (graine joueur + jour, budget 45 min, pas le modèle de la veille, phase du jour J), gardés par la base (le premier tirage de la journée gagne), un changement par jour et pas sur un contrat rempli.
- **Dévoilement** : `user_metadata.rl_codex {devoile, jours}` ; compte ancien (inscrit avant `LANCEMENT_CODEX` de `lib/codex/moteur.ts`, ou ≥ 50 questions) : tout visible. Les « minutes de présence » sont les minutes depuis l'inscription (filet 45 min ou 2ᵉ jour).
