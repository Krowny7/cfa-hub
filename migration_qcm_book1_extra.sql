-- ============================================================
-- MIGRATION : Questions Book 1 CFA Level I — Révision approfondie
-- 25 questions × 3 topics (Quant, Économie, Finance d'Entreprise)
-- Exécuter dans Supabase > SQL Editor
-- ============================================================

-- Helper temporaire : convertit une chaîne JSON array → text[]
CREATE OR REPLACE FUNCTION _cfa_arr(j text) RETURNS text[]
LANGUAGE SQL STABLE AS
$f$ SELECT ARRAY(SELECT jsonb_array_elements_text(j::jsonb)) $f$;

DO $$
DECLARE
  v_uid  uuid;
  v_sid  uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users ORDER BY created_at LIMIT 1;

  -- ══════════════════════════════════════════════════════════
  -- SET 1 : MÉTHODES QUANTITATIVES — APPROFONDI (25 questions)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Méthodes Quantitatives — Approfondi', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES

  (v_sid, 'Un investisseur place 5 000 € à 6 % nominal capitalisé mensuellement. Quel est le taux annuel effectif (EAR) ?',
   _cfa_arr('["6,00 %", "6,17 %", "6,14 %", "6,09 %"]'), 1,
   'EAR = (1 + 0,06/12)^12 − 1 = (1,005)^12 − 1 ≈ 6,168 %. La capitalisation mensuelle génère plus d''intérêts que la capitalisation annuelle au même taux nominal.', 1),

  (v_sid, 'La règle de 72 permet d''estimer :',
   _cfa_arr('["Le nombre d''années pour que le capital triple", "Le nombre d''années pour que le capital double : 72 / taux annuel (%)", "Le taux nécessaire pour doubler en 10 ans", "La différence entre EAR et taux nominal"]'), 1,
   'Règle de 72 : Années ≈ 72 / r. À 8 % → ≈ 9 ans. À 6 % → 12 ans. C''est une approximation rapide de la formule exacte : n = ln(2) / ln(1+r) ≈ 0,693 / r.', 2),

  (v_sid, 'Un emprunt de 100 000 € sur 20 ans à 5 % annuel (remboursement mensuel constant) implique des mensualités de :',
   _cfa_arr('["416,67 €", "659,96 €", "733,55 €", "500,00 €"]'), 1,
   'PMT = PV × [r(1+r)^n] / [(1+r)^n − 1] avec r = 5%/12 = 0,4167% et n = 240 mois. PMT ≈ 659,96 €. La mensualité couvre à la fois le remboursement du capital et les intérêts.', 3),

  (v_sid, 'La différence entre la moyenne géométrique et la moyenne arithmétique des rendements est toujours :',
   _cfa_arr('["Positive (géométrique > arithmétique)", "Nulle pour les distributions symétriques", "Négative ou nulle (géométrique ≤ arithmétique)", "Dépendante du nombre de périodes uniquement"]'), 2,
   'La moyenne géométrique est toujours ≤ à la moyenne arithmétique (inégalité AM-GM). L''écart augmente avec la variance des rendements. La géométrique reflète le rendement composé réellement obtenu.', 4),

  (v_sid, 'Un analyste observe que le rendement annuel d''un actif sur 5 ans est : 10 %, 15 %, −5 %, 20 %, 8 %. Quel est le rendement géométrique moyen approximatif ?',
   _cfa_arr('["9,6 %", "9,3 %", "8,7 %", "10,0 %"]'), 1,
   'GR = [(1,10)(1,15)(0,95)(1,20)(1,08)]^(1/5) − 1 ≈ 9,3-9,8%. Approximation : GR ≈ AM − σ²/2. La géométrique est toujours inférieure à l''arithmétique (9,6 %) car elle tient compte de la volatilité.', 5),

  (v_sid, 'La loi de Student (t de Student) est utilisée à la place de la loi normale quand :',
   _cfa_arr('["L''échantillon est très grand (n > 100)", "La variance de la population est inconnue et l''échantillon est petit (n < 30)", "La distribution est asymétrique", "Le taux de réussite est inférieur à 5 %"]'), 1,
   'Quand σ² est inconnu, on utilise l''écart-type de l''échantillon s et la statistique t. La distribution t a des queues plus épaisses que la normale, reflétant l''incertitude sur σ. Elle converge vers N(0,1) pour n → ∞.', 6),

  (v_sid, 'Un intervalle de confiance à 95 % pour la moyenne d''une population signifie :',
   _cfa_arr('["95 % des observations de la population se trouvent dans cet intervalle", "Si l''on répète l''expérience de nombreuses fois, 95 % des intervalles calculés contiendront la vraie moyenne", "La probabilité que la vraie moyenne soit dans cet intervalle spécifique est de 95 %", "L''écart-type de la moyenne est de ±1,96"]'), 1,
   'L''interprétation fréquentiste correcte : la procédure capture la vraie valeur dans 95 % des cas à long terme. Pour un intervalle spécifique, soit la vraie valeur y est, soit elle n''y est pas.', 7),

  (v_sid, 'Le coefficient de corrélation de Spearman (rang) est préféré à celui de Pearson quand :',
   _cfa_arr('["Les données sont parfaitement normales", "Il y a des valeurs aberrantes ou les données ne suivent pas une relation linéaire", "L''échantillon dépasse 100 observations", "Les variables sont continues et sans outliers"]'), 1,
   'Spearman range les données avant de calculer la corrélation. Il est robuste aux outliers et détecte les relations monotones non linéaires. Pearson mesure uniquement la relation linéaire.', 8),

  (v_sid, 'Un test F est utilisé pour tester :',
   _cfa_arr('["La significativité d''un seul coefficient de régression", "L''égalité des variances ou la significativité globale d''une régression multiple", "Si la distribution est normale", "La différence entre deux moyennes"]'), 1,
   'Le test F en régression multiple teste H₀ : tous les coefficients β = 0 simultanément. C''est le « test global » de significativité du modèle. Il est aussi utilisé pour comparer des variances.', 9),

  (v_sid, 'La multicolinéarité dans une régression multiple est un problème car elle :',
   _cfa_arr('["Augmente le R² de la régression", "Rend les estimations des coefficients instables et les erreurs standard artificiellement élevées", "Provoque une hétéroscédasticité des résidus", "Empêche le calcul du F-test global"]'), 1,
   'La multicolinéarité (forte corrélation entre variables explicatives) ne biaise pas les estimations mais les rend imprécises. Les t-stats individuels peuvent être insignifiants même si le F-test global l''est.', 10),

  (v_sid, 'La valeur actuelle de 1 € reçu dans 10 ans à un taux de 8 % est :',
   _cfa_arr('["0,46 €", "0,54 €", "0,67 €", "0,37 €"]'), 0,
   'PV = 1 / (1,08)^10 = 1 / 2,159 ≈ 0,463 €. La notion centrale est la dépréciation de la valeur dans le temps : 1 € aujourd''hui vaut 2,16 € dans 10 ans à 8 %.', 11),

  (v_sid, 'L''hétéroscédasticité dans une régression se manifeste quand :',
   _cfa_arr('["Les résidus ne suivent pas une loi normale", "La variance des résidus varie systématiquement avec les valeurs des variables explicatives", "Il y a trop de variables explicatives", "Les observations sont corrélées dans le temps"]'), 1,
   'L''hétéroscédasticité viole l''hypothèse OLS de variance constante des erreurs. Les estimateurs restent non biaisés mais ne sont plus BLUE. Les erreurs standard sont biaisées → t-stats incorrects.', 12),

  (v_sid, 'Dans une analyse de sensibilité d''un modèle financier, un « stress test » consiste à :',
   _cfa_arr('["Modifier une variable à la fois autour de son cas de base", "Tester le modèle sous des scénarios extrêmes mais plausibles (crises, chocs macroéconomiques)", "Calculer la VaR à 99,9 % de confiance", "Comparer le modèle avec des prévisions d''autres analystes"]'), 1,
   'Un stress test évalue la résilience sous des conditions de marché extrêmes (crash de 2008, COVID-19). Il complète l''analyse de sensibilité classique (variations modérées) et la simulation Monte Carlo.', 13),

  (v_sid, 'La simulation Monte Carlo est utilisée pour :',
   _cfa_arr('["Résoudre analytiquement des équations différentielles", "Générer des distributions de résultats en simulant aléatoirement des milliers de scénarios", "Calculer exactement le prix des options européennes de type vanille", "Tester la stationnarité d''une série temporelle"]'), 1,
   'La Monte Carlo simule des milliers de trajectoires possibles avec des distributions hypothétiques pour les variables aléatoires. Très utilisée pour l''évaluation d''options complexes et la gestion des risques.', 14),

  (v_sid, 'Le ratio d''information (Information Ratio, IR) d''un fonds de gestion active est défini comme :',
   _cfa_arr('["Rendement total du fonds / Écart-type total", "(Rendement fonds − Rendement benchmark) / Tracking error", "Alpha de Jensen / Bêta du fonds", "Rendement excédentaire / Écart-type du marché"]'), 1,
   'IR = Alpha actif / Tracking error = (Rp − Rb) / σ(Rp − Rb). Il mesure la compétence d''un gérant actif : combien de rendement excédentaire il génère par unité de risque actif pris.', 15),

  (v_sid, 'L''autocorrélation des résidus dans une régression (détectée par le test de Durbin-Watson) est problématique car elle :',
   _cfa_arr('["Biaise les estimations des coefficients β", "Sous-estime les erreurs standard et surestime la significativité statistique des coefficients", "Augmente le R² artificiellement", "Indique une relation non linéaire entre X et Y"]'), 1,
   'L''autocorrélation (fréquente dans les séries temporelles) ne biaise pas les β mais rend les erreurs standard incorrectes. Les t-stats sont alors trop élevés, donnant l''illusion de significativité.', 16),

  (v_sid, 'La distribution de Poisson est appropriée pour modéliser :',
   _cfa_arr('["Le rendement d''une action sur 1 an", "Le nombre d''événements rares survenant dans un intervalle de temps fixé", "La différence entre deux moyennes d''échantillons", "La distribution des revenus d''une population"]'), 1,
   'La loi de Poisson modélise le nombre de fois qu''un événement rare se produit dans un intervalle fixe (défauts de crédit par trimestre, appels par heure). Paramètre unique : λ = moyenne = variance.', 17),

  (v_sid, 'La régression logistique (logit) est utilisée quand :',
   _cfa_arr('["La variable dépendante est continue et normalement distribuée", "La variable dépendante est binaire (0 ou 1) : défaut / non défaut, achat / non achat", "Il y a trop de variables explicatives quantitatives", "La relation entre X et Y est parfaitement linéaire"]'), 1,
   'La régression logistique modélise la probabilité d''un événement binaire via la fonction sigmoïde. Très utilisée pour le scoring de crédit (probabilité de défaut).', 18),

  (v_sid, 'Un analyste construit un modèle de régression avec 10 variables explicatives et 15 observations. Le principal risque est :',
   _cfa_arr('["La multicolinéarité entre les 10 variables", "Le surapprentissage (overfitting) : le modèle s''ajuste au bruit plutôt qu''au signal réel", "L''hétéroscédasticité des résidus", "La non-stationnarité de la variable dépendante"]'), 1,
   'Avec trop peu d''observations par variable, le modèle mémorise l''échantillon. Le R² en échantillon est élevé mais les prédictions hors échantillon sont mauvaises. Règle : au moins 10-20 observations par variable.', 19),

  (v_sid, 'Le coefficient de variation (CV) est particulièrement utile pour comparer des actifs ayant :',
   _cfa_arr('["Le même rendement espéré mais des risques différents", "Des rendements espérés différents (il normalise le risque par unité de rendement)", "La même volatilité mais des corrélations différentes", "Des distributions de rendements parfaitement normales"]'), 1,
   'CV = σ / E(R). Il permet de comparer des actifs avec des niveaux de rendement différents. Un fonds avec E(R) = 20 % et σ = 25 % (CV = 1,25) est plus risqué par unité de rendement qu''un autre avec CV = 1,00.', 20),

  (v_sid, 'La méthode des moindres carrés ordinaires (MCO / OLS) minimise :',
   _cfa_arr('["La somme des résidus (erreurs de prédiction)", "La somme des résidus au carré (SSE)", "La valeur absolue des résidus", "La variance des résidus multipliée par n"]'), 1,
   'OLS minimise Σ(Yi − Ŷi)². La minimisation des carrés pénalise davantage les erreurs importantes et produit des estimateurs BLUE si les hypothèses Gauss-Markov sont vérifiées.', 21),

  (v_sid, 'Pour tester si une distribution de données suit une loi normale, on peut utiliser :',
   _cfa_arr('["Le test de Durbin-Watson", "Le test de Jarque-Bera (qui combine skewness et kurtosis excédentaire)", "Le test de White (hétéroscédasticité)", "Le test de Granger (causalité)"]'), 1,
   'Le test de Jarque-Bera : JB = n/6 × (S² + (K−3)²/4) où S = skewness et K = kurtosis. Sous H₀ (normalité), JB suit approximativement un χ² à 2 degrés de liberté.', 22),

  (v_sid, 'Un portefeuille avec un rendement espéré de 15 % et un écart-type de 25 % présente une VaR paramétrique à 1 % sur 1 an d''environ :',
   _cfa_arr('["−43 %", "−25 %", "−15 %", "−58 %"]'), 0,
   'VaR 1 % = E(R) − z_{1%} × σ = 15 % − 2,326 × 25 % = 15 % − 58,15 % ≈ −43 %. Le z à 1 % unilatéral est 2,326. Une perte de 43 % ne devrait survenir que 1 % des années.', 23),

  (v_sid, 'Un portefeuille a un Sharpe ratio de 0,8. On y ajoute un actif non corrélé avec un Sharpe individuel de 0,6. Le Sharpe du nouveau portefeuille :',
   _cfa_arr('["Diminue à environ 0,7", "Augmente au-dessus de 0,8 grâce à la diversification", "Reste identique à 0,8", "Dépend uniquement du poids de l''actif ajouté"]'), 1,
   'Ajouter un actif non corrélé (ρ = 0) réduit le risque sans réduire le rendement espéré dans les mêmes proportions. Même avec un Sharpe individuel plus faible, l''actif améliore le Sharpe global.', 24),

  (v_sid, 'Le théorème de Bayes est fondamental en finance car il permet :',
   _cfa_arr('["De calculer des probabilités a priori sans données de marché", "De mettre à jour des probabilités de scénarios macroéconomiques à mesure que de nouvelles données arrivent", "De remplacer la simulation Monte Carlo pour les distributions complexes", "D''estimer directement la corrélation entre deux actifs"]'), 1,
   'P(A|B) = P(B|A) × P(A) / P(B). Exemple : P(récession|données récentes) mis à jour à partir de P(récession initiale). Fondement des modèles d''allocation bayésienne dynamique.', 25);

  -- ══════════════════════════════════════════════════════════
  -- SET 2 : ÉCONOMIE — APPROFONDI (25 questions)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Économie — Approfondi', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES

  (v_sid, 'La courbe de demande vue par une entreprise individuelle en concurrence parfaite est :',
   _cfa_arr('["Décroissante avec une pente négative", "Parfaitement élastique (horizontale) au prix du marché", "Parfaitement inélastique (verticale)", "Identique à la courbe de demande agrégée du marché"]'), 1,
   'En concurrence parfaite, chaque entreprise est « price taker » : elle peut vendre autant qu''elle veut au prix du marché sans l''affecter. Sa courbe de demande est donc horizontale à P = P_marché.', 1),

  (v_sid, 'La règle de maximisation du profit pour toute entreprise (concurrence parfaite comme monopole) est :',
   _cfa_arr('["Maximiser les revenus totaux", "Produire jusqu''à ce que Recette Marginale = Coût Marginal (MR = MC)", "Produire au point de coût moyen minimal", "Maximiser la part de marché"]'), 1,
   'MR = MC est la condition universelle de maximisation du profit. En concurrence parfaite, MR = P. Pour un monopole, MR < P car il doit baisser son prix pour vendre une unité supplémentaire.', 2),

  (v_sid, 'L''élasticité-prix de la demande est définie comme :',
   _cfa_arr('["La variation absolue de la quantité demandée suite à une variation de prix", "La variation proportionnelle de la quantité demandée divisée par la variation proportionnelle du prix", "La pente de la courbe de demande", "Le rapport entre l''offre et la demande à l''équilibre"]'), 1,
   'ε = (%ΔQ) / (%ΔP). Si |ε| > 1 : élastique (luxe, fort nombre de substituts). Si |ε| < 1 : inélastique (nécessités, essence). Si |ε| = 1 : élasticité unitaire.', 3),

  (v_sid, 'Le concept d''externalité négative justifie l''intervention de l''État car :',
   _cfa_arr('["Les entreprises produisent trop peu quand il y a des externalités négatives", "Le marché produit une quantité excessive car le coût social (privé + externe) dépasse le coût privé", "Les consommateurs ignorent les prix des biens concernés", "L''État peut toujours produire moins cher que le secteur privé"]'), 1,
   'La pollution est l''exemple classique : le producteur ne supporte pas le coût environnemental. Solution pigouvienne = taxe égale au coût externe → internaliser l''externalité → produire la quantité socialement optimale.', 4),

  (v_sid, 'Un bien de Giffen est caractérisé par :',
   _cfa_arr('["Une demande qui augmente quand le revenu augmente", "Une demande qui augmente quand le prix augmente (courbe de demande croissante)", "Une très forte élasticité-prix négative", "Une demande insensible aux variations de prix"]'), 1,
   'Le bien de Giffen est un bien inférieur dont l''effet revenu négatif l''emporte sur l''effet substitution. Très rares en pratique. Exemple historique : la pomme de terre en Irlande lors de la grande famine.', 5),

  (v_sid, 'Dans un modèle IS-LM keynésien, une expansion budgétaire (hausse des dépenses G) déplace :',
   _cfa_arr('["La courbe LM vers la droite", "La courbe IS vers la droite, ce qui augmente Y et r en économie fermée", "La courbe LM vers la gauche", "Les deux courbes simultanément vers la droite"]'), 1,
   'IS se déplace à droite (plus de G → plus de demande → plus de Y pour chaque niveau de r). La LM reste fixe (politique monétaire inchangée). Résultat : Y↑ et r↑ (éviction partielle).', 6),

  (v_sid, 'Le PIB nominal diffère du PIB réel car le PIB nominal :',
   _cfa_arr('["Exclut les importations du calcul", "N''est pas corrigé de l''inflation (évalué aux prix courants de l''année considérée)", "Inclut les échanges de l''économie informelle", "Est calculé avec les parités de pouvoir d''achat (PPA)"]'), 1,
   'PIB nominal = ΣPt × Qt. PIB réel = ΣP_base × Qt. La croissance du PIB nominal inclut croissance réelle + inflation. Le déflateur du PIB = (PIB nominal / PIB réel) × 100.', 7),

  (v_sid, 'La parité des pouvoirs d''achat (PPA) prédit que les taux de change s''ajustent pour :',
   _cfa_arr('["Égaliser les taux d''intérêt entre pays", "Égaliser le pouvoir d''achat (même panier de biens = même prix après conversion en une monnaie commune)", "Maximiser la croissance économique mondiale", "Éliminer les déficits commerciaux à court terme"]'), 1,
   'PPA relative : %ΔS ≈ π_domestique − π_étranger. Les devises à forte inflation se déprécient. La PPA tient sur longue période (10-20 ans) mais dévie significativement à court terme.', 8),

  (v_sid, 'La « trappe à liquidité » survient quand :',
   _cfa_arr('["Les agents refusent de consommer car ils anticipent de la déflation future", "Les taux d''intérêt sont si bas que la politique monétaire devient inefficace (les agents préfèrent thésauriser)", "La banque centrale manque de réserves de change pour défendre sa monnaie", "Le gouvernement ne peut plus emprunter sur les marchés obligataires"]'), 1,
   'Keynes : quand les taux sont proches de zéro, les agents thésaurisent plutôt qu''investir (anticipation de hausse future des taux = baisse des prix obligataires). La politique monétaire perd son efficacité.', 9),

  (v_sid, 'Un déficit du compte courant de la balance des paiements signifie que le pays :',
   _cfa_arr('["Exporte plus qu''il n''importe (solde commercial positif)", "Dépense plus qu''il ne produit et doit se financer par des entrées de capitaux étrangers", "A des réserves de change insuffisantes pour son commerce", "Connaît nécessairement une forte dépréciation de sa monnaie"]'), 1,
   'Compte courant = Épargne nationale − Investissement. Un déficit = excès d''investissement sur l''épargne nationale = importation d''épargne étrangère (déficit compensé par surplus du compte financier).', 10),

  (v_sid, 'Dans un marché en concurrence monopolistique, la différenciation produit permet aux firmes d''avoir :',
   _cfa_arr('["Une courbe de demande horizontale comme en concurrence parfaite", "Une courbe de demande décroissante et un certain pouvoir de fixation des prix (price maker)", "Un profit économique positif à long terme grâce aux barrières à l''entrée", "Un coût marginal nul grâce aux économies d''échelle"]'), 1,
   'La différenciation crée de la fidélité → courbe de demande décroissante → pouvoir de marché partiel. À long terme (entrée libre), les profits économiques tendent vers zéro mais la firme reste price maker.', 11),

  (v_sid, 'L''indice des prix à la consommation (IPC) a tendance à surestimer l''inflation réelle car :',
   _cfa_arr('["Il exclut les prix alimentaires et énergétiques (core inflation)", "Il ne tient pas compte de la substitution entre produits quand les prix relatifs changent", "Il inclut les prix des actifs financiers dans son calcul", "Il est calculé sur un échantillon trop réduit de biens et services"]'), 1,
   'Biais de substitution : on consomme moins du bien devenu plus cher. Biais qualité : amélioration des produits ignorée. Biais nouveaux produits. Ces biais surestiment l''inflation de 0,5 à 1 % par an.', 12),

  (v_sid, 'Le modèle de Solow de croissance économique explique la croissance à long terme par :',
   _cfa_arr('["L''accumulation de capital physique uniquement (loi des rendements croissants)", "Le progrès technologique exogène (TFP) — seul moteur d''une croissance durable du revenu par tête", "L''expansion du commerce international et la spécialisation", "La croissance de la population active uniquement"]'), 1,
   'Dans Solow, le capital a des rendements décroissants → l''accumulation seule mène à un état stationnaire. Seul le progrès technique (TFP, exogène dans le modèle) permet une croissance permanente du PIB par habitant.', 13),

  (v_sid, 'La courbe de Laffer illustre que :',
   _cfa_arr('["Une hausse de l''impôt augmente toujours les recettes fiscales de l''État", "Au-delà d''un certain taux optimal, une hausse du taux d''imposition réduit les recettes fiscales", "Les recettes fiscales sont proportionnelles aux taux d''imposition", "Les entreprises sont systématiquement plus sensibles aux impôts que les ménages"]'), 1,
   'La courbe de Laffer : à taux 0 % → recettes nulles. À taux 100 % → personne ne travaille → recettes nulles. Il existe un optimum. Le débat empirique porte sur où se situe cet optimum dans la pratique.', 14),

  (v_sid, 'Le taux de chômage naturel (NAIRU) est le taux pour lequel :',
   _cfa_arr('["Le chômage est nul dans l''économie", "Il n''y a que du chômage frictionnel et structurel, sans chômage cyclique", "L''économie est officiellement en récession", "L''inflation est nulle et stable"]'), 1,
   'Le NAIRU (Non-Accelerating Inflation Rate of Unemployment) = niveau où il n''y a pas de pression sur les salaires → inflation stable. En dessous → surchauffe. Au-dessus → déflation potentielle.', 15),

  (v_sid, 'L''appréciation de la monnaie nationale affecte la balance commerciale en :',
   _cfa_arr('["L''améliorant (les exportations deviennent plus compétitives en valeur)", "La dégradant (exportations plus chères pour les étrangers, importations moins chères pour les résidents)", "N''ayant aucun effet à court et long terme", "Affectant uniquement les importations de matières premières"]'), 1,
   'L''appréciation rend les exportations plus chères en devises étrangères (compétitivité réduite) et les importations moins chères en monnaie nationale. Le solde commercial se dégrade.', 16),

  (v_sid, 'Le « paradoxe de l''épargne » de Keynes stipule que :',
   _cfa_arr('["L''épargne individuelle est toujours bénéfique pour l''ensemble de l''économie", "Une hausse généralisée de l''épargne peut réduire le revenu national via la baisse de la demande agrégée", "L''épargne nationale est toujours supérieure à l''investissement en récession", "Les ménages ne peuvent pas augmenter leur épargne collectivement"]'), 1,
   'Si tous les agents augmentent leur épargne simultanément, la consommation baisse → la demande agrégée chute → le revenu national baisse → l''épargne totale ne change pas ou diminue. C''est une fallacie de composition.', 17),

  (v_sid, 'Le système de changes flottants est caractérisé par :',
   _cfa_arr('["Des interventions fréquentes de la banque centrale pour maintenir une parité fixe", "Des taux de change déterminés librement par l''offre et la demande sur le marché des changes", "Une convertibilité garantie à un taux officiel fixé", "Des restrictions sur les mouvements de capitaux transfrontaliers"]'), 1,
   'En régime flottant pur, le taux de change s''ajuste librement aux conditions de marché. La politique monétaire est autonome. En pratique, la plupart des pays ont des régimes de « managed float » (flottement dirigé).', 18),

  (v_sid, 'La théorie des jeux prédit que les cartels en oligopole sont difficiles à maintenir car :',
   _cfa_arr('["Les gouvernements les interdisent systématiquement et les sanctions sont sévères", "Chaque firme a une incitation à tricher (dilemme du prisonnier) en produisant au-delà de son quota", "Les coûts de production sont trop différents entre les firmes du cartel", "La demande est trop élastique pour permettre des prix de cartel élevés"]'), 1,
   'Dilemme du prisonnier : si A et B respectent le quota, tous gagnent plus. Mais si B respecte, A a intérêt à tricher pour gagner encore plus. Cette logique conduit à la désintégration des cartels.', 19),

  (v_sid, 'La règle de Taylor dans la politique monétaire suggère que la banque centrale doit :',
   _cfa_arr('["Maintenir un taux de change fixe vis-à-vis d''une monnaie ancre", "Ajuster son taux directeur en fonction de l''écart d''inflation et de l''output gap", "Cibler uniquement la croissance de la masse monétaire (M2)", "Ne jamais modifier ses taux pendant la durée d''un mandat entier"]'), 1,
   'Règle de Taylor : r = r* + 0,5 × (π − π*) + 0,5 × output gap. Elle lie le taux directeur à l''inflation observée et à l''écart de production. Elle décrit bien le comportement empirique des grandes banques centrales.', 20),

  (v_sid, 'Quand les taux d''intérêt américains augmentent significativement, l''effet sur les marchés émergents est généralement :',
   _cfa_arr('["Des entrées de capitaux plus importantes vers les marchés émergents", "Des sorties de capitaux vers les actifs sûrs américains et une dépréciation des monnaies émergentes", "Une appréciation des monnaies émergentes face au dollar", "Une accélération de la croissance des pays émergents"]'), 1,
   'La hausse des taux US attire les capitaux vers les actifs américains sans risque. Cela provoque des sorties de capitaux des émergents → dépréciation de leurs monnaies → potentiellement une crise de balance des paiements.', 21),

  (v_sid, 'Le multiplicateur budgétaire est inférieur en économie ouverte qu''en économie fermée car :',
   _cfa_arr('["Les taxes sont structurellement plus élevées dans les pays très ouverts", "Une partie du stimulus fiscal est absorbée par les importations (fuite via la propension marginale à importer)", "L''effet d''éviction est systématiquement plus fort en économie ouverte", "Les gouvernements dépensent structurellement moins en économie ouverte"]'), 1,
   'En économie ouverte : multiplicateur = 1 / (MPS + MPM). La propension à importer (MPM) constitue une « fuite » du circuit : chaque euro dépensé en importations ne stimule pas la demande intérieure.', 22),

  (v_sid, 'La distinction fondamentale entre PIB et PNB (Revenu National Brut) est que :',
   _cfa_arr('["Le PIB inclut la production des résidents d''un pays quel que soit le lieu de production", "Le PIB mesure la production sur le territoire national (quel que soit la nationalité des facteurs), le PNB mesure la production des résidents", "Le PNB est toujours supérieur au PIB dans les pays développés", "Le PIB exclut les services contrairement au PNB"]'), 1,
   'PIB = production sur le territoire. PNB = production des résidents (où qu''ils soient). Différence = revenus des facteurs étrangers. Important pour les pays exportateurs de travailleurs.', 23),

  (v_sid, 'La courbe de Phillips originale (années 1960) postulait une relation inverse entre :',
   _cfa_arr('["Inflation et croissance économique réelle", "Chômage et inflation (moins de chômage → plus d''inflation salariale)", "Taux d''intérêt nominal et croissance du PIB réel", "Épargne nationale et niveau de l''investissement"]'), 1,
   'Phillips observa empiriquement qu''une économie proche du plein emploi avait une inflation plus élevée. Ce trade-off apparent offrait un « menu » aux décideurs. La stagflation des années 70 a montré son instabilité.', 24),

  (v_sid, 'Dans le modèle Mundell-Fleming en changes fixes avec mobilité parfaite des capitaux, une expansion budgétaire est :',
   _cfa_arr('["Totalement efficace car aucun effet d''éviction ne se produit", "Totalement inefficace car l''effet d''éviction est complet via le taux de change", "Partiellement efficace avec un multiplicateur réduit de moitié", "Sans effet sur le PIB mais avec une forte hausse de l''inflation"]'), 0,
   'En change fixe + mobilité parfaite : G↑ → IS se déplace à droite → r tend à monter → entrées de capitaux → BC doit acheter des devises → LM se déplace à droite aussi → Y augmente. Le multiplicateur est maximal (pas d''éviction).', 25);

  -- ══════════════════════════════════════════════════════════
  -- SET 3 : FINANCE D'ENTREPRISE — APPROFONDI (25 questions)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Finance d''Entreprise — Approfondi', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES

  (v_sid, 'L''effet de levier financier amplifie :',
   _cfa_arr('["Uniquement les gains quand les taux d''intérêt sont bas", "Les gains et les pertes des actionnaires en proportion du niveau d''endettement", "Seulement le risque de liquidité de l''entreprise à court terme", "Le coût moyen pondéré du capital uniquement à la hausse"]'), 1,
   'Le levier financier amplifie le ROE : si l''actif génère 10 % et la dette coûte 5 %, l''excédent (5 %) revient aux actionnaires. Si l''actif génère 3 %, la perte est amplifiée symétriquement.', 1),

  (v_sid, 'Le free cash flow to the firm (FCFF) est calculé comme :',
   _cfa_arr('["CFO − Dividendes versés aux actionnaires", "EBIT × (1 − T) + Amortissements − ΔBesoin en Fonds de Roulement − Capex", "Résultat net + Amortissements uniquement", "CFO + CFI (activités d''investissement)"]'), 1,
   'FCFF = EBIT(1−T) + D&A − ΔNWC − Capex. C''est le cash disponible pour TOUS les apporteurs de capitaux (actionnaires ET créanciers) après investissements nécessaires à la continuité d''exploitation.', 2),

  (v_sid, 'La valeur théorique d''une action selon le DDM Gordon est très sensible au taux de croissance g car :',
   _cfa_arr('["g détermine uniquement les dividendes futurs des prochaines années", "g apparaît au dénominateur (r − g) : une faible variation de g change radicalement la valeur calculée", "g est généralement supérieur à r dans les marchés développés", "g est par définition toujours égal au taux d''actualisation r"]'), 1,
   'P = D1 / (r−g). Si r = 10 % et g = 8 % → dénominateur = 2 % → P très élevé. Si g = 6 % → dénominateur = 4 % → valeur divisée par 2. La sensibilité est extrême quand g s''approche de r.', 3),

  (v_sid, 'Lors d''une analyse de sensibilité d''une VAN, le « break-even » est le point auquel :',
   _cfa_arr('["Le projet dégage exactement le WACC de l''entreprise", "La VAN = 0 (la valeur actuelle des flux exactement = l''investissement initial)", "Le délai de récupération actualisé = durée totale du projet", "Le TRI = taux d''inflation anticipé"]'), 1,
   'Le break-even de la VAN identifie la valeur limite d''une variable (volume de ventes, prix de vente, coût variable...) en deçà de laquelle la VAN devient négative. C''est un test de robustesse de la décision.', 4),

  (v_sid, 'La proposition II de Modigliani-Miller (sans impôts) stipule que Ke :',
   _cfa_arr('["Reste constant quel que soit le niveau d''endettement", "Augmente linéairement avec le ratio D/E pour compenser le risque financier supplémentaire supporté", "Diminue avec la dette car la dette réduit le risque global de la firme", "Dépend uniquement du bêta de l''actif économique (bêta non endetté)"]'), 1,
   'M&M II : Ke = Ku + (Ku − Kd) × D/E. Ke monte avec D/E car les actionnaires supportent plus de risque financier. Mais Kd reste constant → le WACC reste inchangé (= Ku). La valeur de la firme est constante.', 5),

  (v_sid, 'L''analyse du seuil de rentabilité comptable (accounting break-even) identifie le niveau de production pour lequel :',
   _cfa_arr('["Le cash-flow opérationnel (CFO) est exactement nul", "Le résultat d''exploitation (EBIT) est nul : Revenus totaux = Coûts fixes + Coûts variables totaux", "La VAN du projet est nulle sur toute sa durée de vie", "La marge brute est exactement égale aux amortissements de la période"]'), 1,
   'Q_BE = Coûts fixes / (Prix − CV unitaire). En deçà de Q_BE, l''entreprise perd de l''argent comptablement. Le break-even financier (CFO = 0) est généralement plus bas car il exclut les amortissements.', 6),

  (v_sid, 'Une entreprise a un CA de 200 M€, des coûts variables de 120 M€ et des coûts fixes de 50 M€. Son levier d''exploitation (DOL) est :',
   _cfa_arr('["2,67", "4,00", "1,60", "3,33"]'), 0,
   'DOL = Contribution (CA − CV) / EBIT = (200 − 120) / (200 − 120 − 50) = 80 / 30 ≈ 2,67. Un DOL de 2,67 signifie : +1 % de CA → +2,67 % d''EBIT. Le levier amplifie la variabilité des bénéfices.', 7),

  (v_sid, 'Le WACC comme taux d''actualisation suppose notamment que :',
   _cfa_arr('["La structure de capital varie significativement d''un projet à l''autre au sein de la firme", "La structure de capital cible de la firme est maintenue constante dans le temps", "Seul le coût de la dette après impôts est pertinent pour actualiser les flux", "Les coûts de faillite attendus sont inclus explicitement dans le calcul du WACC"]'), 1,
   'Le WACC implique une structure de capital stable (même ratio D/E à chaque période). Pour des projets dont le risque ou la structure différent de la firme, il faut ajuster ou utiliser l''APV.', 8),

  (v_sid, 'L''APV (Adjusted Present Value) se distingue du WACC car il :',
   _cfa_arr('["Calcule la valeur de l''actif non endetté puis ajoute séparément la valeur des effets du financement (bouclier fiscal, etc.)", "Inclut toujours les coûts de détresse financière dans son calcul de base", "Utilise un taux d''actualisation ajusté pour l''inflation anticipée", "Est uniquement applicable aux projets d''investissement international"]'), 0,
   'APV = VAN_base (actif non endetté, actualisé au Ku) + PV(bouclier fiscal) + PV(autres effets de financement). Plus flexible que le WACC pour les projets avec une structure de dette variable ou complexe.', 9),

  (v_sid, 'La dilution d''une émission d''actions nouvelles affecte les actionnaires existants principalement via :',
   _cfa_arr('["Une réduction du taux de dividende par action uniquement", "Une réduction du BPA et potentiellement du cours si l''émission est faite à un prix inférieur à la valeur intrinsèque", "Une augmentation automatique et mécanique de la dette de l''entreprise", "Aucun effet réel si les fonds levés sont bien investis dans des projets à VAN positive"]'), 1,
   'La dilution du BPA est certaine (plus d''actions → même résultat réparti sur plus de titres). L''effet sur le cours dépend de l''usage des fonds : si ROE projet > Ke, la valeur par action peut rester stable malgré la dilution.', 10),

  (v_sid, 'La « real options analysis » reconnaît que les projets d''investissement ont une valeur supplémentaire car :',
   _cfa_arr('["La VAN simple surestime systématiquement la valeur de tout projet d''investissement", "Les décisions ont une valeur de flexibilité (option d''abandon, d''expansion, de report) non capturée par la VAN statique", "Les projets réels ne comportent aucune incertitude sur leurs flux futurs", "Le TRI est toujours supérieur à la VAN pour évaluer les projets réels"]'), 1,
   'Les real options ajoutent de la valeur : option d''attendre (call d''investissement), d''abandonner (put), d''expansion. La VAN statique peut sous-évaluer des projets offrant beaucoup de flexibilité opérationnelle.', 11),

  (v_sid, 'Le ratio dette nette / EBITDA est utilisé pour :',
   _cfa_arr('["Mesurer la rentabilité des capitaux propres des actionnaires", "Évaluer combien d''années d''EBITDA il faudrait théoriquement pour rembourser la dette nette", "Calculer le coût de la dette après avantage fiscal", "Estimer le taux de croissance future des bénéfices"]'), 1,
   'Levier net = (Dettes financières − Trésorerie) / EBITDA. Un ratio < 2× est conservateur. > 5× est élevé pour la plupart des secteurs. Très utilisé comme covenant de dette et par les agences de notation.', 12),

  (v_sid, 'La gestion du besoin en fonds de roulement (BFR) cherche à optimiser le cycle de conversion de trésorerie (CCC) en :',
   _cfa_arr('["Maximisant le délai de recouvrement des créances clients", "Minimisant le CCC = DSO + DIO − DPO pour libérer du cash opérationnel", "Augmentant les stocks pour éviter toute rupture d''approvisionnement", "Remboursant les fournisseurs le plus rapidement possible"]'), 1,
   'CCC = DSO (délai clients) + DIO (délai stocks) − DPO (délai fournisseurs). Réduire le CCC libère de la trésorerie. Amazon a un CCC négatif : il encaisse avant de payer ses fournisseurs.', 13),

  (v_sid, 'En émettant une obligation callable, l''entreprise émettrice :',
   _cfa_arr('["Paie un taux d''intérêt moins élevé car elle transfère l''option de remboursement à l''investisseur", "Paie un taux d''intérêt plus élevé car elle conserve pour elle l''option de remboursement anticipé", "N''a aucune flexibilité sur la durée effective de son emprunt obligataire", "Bénéficie systématiquement d''un prix d''émission supérieur au pair"]'), 1,
   'L''émetteur achète implicitement une option call sur sa propre dette. Cette option a une valeur positive pour l''émetteur → l''investisseur exige un coupon plus élevé pour compenser le risque de remboursement anticipé défavorable.', 14),

  (v_sid, 'Le ratio Price-to-Book (P/B) est inférieur à 1 pour une entreprise quand :',
   _cfa_arr('["L''entreprise est en forte phase de croissance avec de nombreuses opportunités d''investissement", "Le marché anticipe que le ROE futur sera inférieur au coût des capitaux propres (Ke)", "La valeur de marché des actifs est supérieure à leur valeur comptable nette", "L''entreprise verse des dividendes particulièrement élevés aux actionnaires"]'), 1,
   'P/B < 1 signifie que le marché valorise l''entreprise en dessous de la valeur comptable de ses actifs nets. Cela indique que le ROE anticipé < Ke, i.e., l''entreprise détruit de la valeur économique.', 15),

  (v_sid, 'Un rachat d''actions (share buyback) a généralement pour effet de :',
   _cfa_arr('["Diluer le BPA existant en augmentant le nombre d''actions en circulation", "Augmenter le BPA car le même résultat net se répartit sur un nombre d''actions plus faible", "Augmenter mécaniquement le nombre d''actions en circulation", "Réduire systématiquement le cours de l''action dans tous les cas"]'), 1,
   'Rachat → moins d''actions → même résultat net / moins d''actions → BPA↑. Alternativement : si le P/E reste constant, le cours monte. Le rachat est aussi fiscalement plus efficace que le dividende dans certains régimes fiscaux.', 16),

  (v_sid, 'La « franchise value » (ou PVGO) dans l''analyse actions représente :',
   _cfa_arr('["La valeur actualisée de tous les dividendes futurs prévus", "La valeur des opportunités de croissance futures à ROE > Ke (projets créateurs de valeur)", "La différence entre la capitalisation boursière et la valeur comptable de l''actif net", "Le prix payé pour acquérir une franchise commerciale ou une licence"]'), 1,
   'Valeur action = Valeur actifs en place (BPA/r) + PVGO (franchise value). Si ROE > Ke pour les futurs projets → valeur créée → cours > BPA/r. Si ROE < Ke, la croissance détruit de la valeur.', 17),

  (v_sid, 'Un covenant dans un contrat de dette (bond indenture) sert principalement à :',
   _cfa_arr('["Maximiser le coupon versé aux investisseurs obligataires", "Protéger les créanciers en limitant les actions des actionnaires pouvant augmenter le risque de défaut", "Fixer le taux de change pour les obligations émises en devises étrangères", "Déterminer précisément la date de remboursement final de l''obligation"]'), 1,
   'Covenants négatifs : interdisent certaines actions (nouvelle dette, cession d''actifs, dividendes excessifs). Covenants positifs : imposent des obligations (maintien de ratios). Ils réduisent le conflit actionnaires-créanciers.', 18),

  (v_sid, 'Le problème d''agence entre actionnaires et créanciers survient car :',
   _cfa_arr('["Les actionnaires supportent l''intégralité du risque de baisse sans limitation", "Les actionnaires peuvent prendre des décisions risquées qui leur bénéficient mais lèsent les créanciers (risk shifting / asset substitution)", "Les créanciers ont structurellement plus de droits de vote que les actionnaires", "L''asymétrie d''information avantage toujours les créanciers face aux actionnaires"]'), 1,
   'Asset substitution : les actionnaires ont une option call sur l''actif. Ils bénéficient du succès des projets risqués mais les pertes en cas d''échec sont partiellement absorbées par les créanciers. D''où le conflit d''intérêts.', 19),

  (v_sid, 'La méthode des comparables (approche par les multiples de marché) valorise une entreprise en :',
   _cfa_arr('["Actualisant ses flux de trésorerie futurs au WACC de la firme", "Appliquant les multiples P/E ou EV/EBITDA de sociétés similaires cotées à ses propres métriques financières", "Calculant la valeur de liquidation de ses actifs nets tangibles", "Estimant uniquement la prime de contrôle payée lors d''acquisitions comparables récentes"]'), 1,
   'L''approche par les comparables est rapide et ancrée dans les valorisations de marché actuelles. Limite : trouver des comparables vraiment similaires est difficile. Elle complète indispensablement le DCF.', 20),

  (v_sid, 'L''EBITDA est souvent critiqué comme mesure de la performance financière car il :',
   _cfa_arr('["Est trop complexe à calculer correctement pour les analystes financiers", "Ignore les besoins d''investissement récurrents (Capex) et les variations du BFR, surestimant le cash réellement disponible", "Sous-estime la rentabilité réelle des entreprises très capitalistiques", "Est influencé par les méthodes d''amortissement contrairement au résultat net après impôts"]'), 1,
   'Une entreprise industrielle avec 500 M€ d''EBITDA mais 600 M€ de Capex annuel de maintenance ne génère pas de free cash flow positif. L''EBITDA ignore l''intensité capitalistique, ce qui peut induire en erreur.', 21),

  (v_sid, 'L''analyse du cycle de vie de l''industrie distingue généralement les phases suivantes dans l''ordre :',
   _cfa_arr('["Lancement → Croissance → Maturité → Déclin", "Innovation → Expansion → Stabilité → Reprise cyclique", "Développement → Saturation → Récession → Rebond", "Lancement → Consolidation → Oligopole → Monopole naturel"]'), 0,
   'En phase de croissance : réinvestissement massif, dividendes faibles ou nuls. En maturité : flux stables, dividendes généreux. En déclin : retrait de cash, restructurations, rachats d''actions.', 22),

  (v_sid, 'Une prime de risque pays (Country Risk Premium) est ajoutée au CAPM pour valoriser une entreprise dans un marché émergent afin de tenir compte :',
   _cfa_arr('["Du risque de change uniquement entre la monnaie locale et le dollar", "Des risques politiques, de gouvernance, de liquidité et d''instabilité macroéconomique non capturés par le bêta seul", "Du différentiel de taux d''intérêt nominal entre le pays émergent et les États-Unis", "De l''inflation structurellement plus élevée dans les pays émergents"]'), 1,
   'CRP ≈ Spread obligations souveraines × (σ_actions_émergents / σ_obligations_souveraines). Elle est ajoutée à la prime de marché : E(R) = Rf + β × (RPm + CRP). Elle capture les risques spécifiques au pays.', 23),

  (v_sid, 'La couverture du risque de change avec des forwards est économiquement neutre à long terme car :',
   _cfa_arr('["Les banques ne font pas de profit sur les transactions de change à terme", "Le prix forward incorpore déjà le différentiel de taux d''intérêt (parité des taux d''intérêt couverte — CIP)", "Les taux de change suivent toujours parfaitement la parité des pouvoirs d''achat", "Les contrats forwards sont gratuits à mettre en place sans coût de transaction"]'), 1,
   'La CIP stipule que F₀ = S₀ × (1 + r_dom) / (1 + r_étr). Hedger transforme l''incertitude du taux spot futur en certitude du taux forward. Mais ce taux forward intègre déjà le différentiel de taux d''intérêt.', 24),

  (v_sid, 'La politique de dividende, selon la théorie de Modigliani-Miller appliquée aux dividendes, est :',
   _cfa_arr('["Toujours optimale à 100 % des bénéfices distribués", "Sans importance sur la valeur (irrelevance) dans un marché parfait sans impôts ni coûts de transaction", "Toujours optimale à 0 % pour maximiser la croissance interne", "Optimale à 50 % pour équilibrer croissance et rémunération des actionnaires"]'), 1,
   'M&M sur les dividendes : dans un marché parfait, les investisseurs peuvent créer des « dividendes maison » en vendant des actions. La politique de dividende est neutre sur la valeur. En réalité, impôts et signaux importent.', 25);

END $$;

-- Nettoyage du helper temporaire
DROP FUNCTION IF EXISTS _cfa_arr(text);
