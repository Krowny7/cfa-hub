-- ============================================================
-- MIGRATION : Questions officielles CFA Level I (150 questions)
-- 15 questions × 10 topics
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

  -- ══════════════════════════════════════════════
  -- TOPIC 1 : ÉTHIQUE ET STANDARDS PROFESSIONNELS
  -- ══════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Éthique et Standards Professionnels', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES
  (v_sid, 'Selon le Code d''Éthique du CFA Institute, lorsque les intérêts d''un client et ceux de l''employeur entrent en conflit, le membre doit :',
   _cfa_arr('["Favoriser les intérêts de l''employeur qui le rémunère", "Placer les intérêts du client avant ceux de son employeur", "Traiter les deux parties de manière identique", "Consulter le comité d''éthique avant toute décision"]'), 1,
   'Le Standard I(B) et III(A) exigent de placer l''intérêt des clients avant celui de l''employeur et avant ses propres intérêts personnels.', 1),

  (v_sid, 'Un analyste reçoit une information confidentielle provenant d''un dirigeant d''entreprise indiquant que les résultats trimestriels seront bien en dessous des attentes. Que doit-il faire selon le Standard II(A) ?',
   _cfa_arr('["Vendre immédiatement les actions concernées pour protéger ses clients", "S''abstenir de toute transaction et ne pas communiquer l''information", "Diffuser l''information à tous ses clients simultanément pour respecter la fair dealing", "Documenter l''information et attendre sa publication officielle avant d''agir"]'), 1,
   'Le Standard II(A) sur les informations privilégiées (Material Nonpublic Information) interdit d''agir ou d''inciter à agir sur la base d''une information significative non publique. L''analyste doit s''abstenir.', 2),

  (v_sid, 'La théorie de la « mosaïque » (mosaic theory) permet à un analyste de :',
   _cfa_arr('["Utiliser des informations non publiques si elles proviennent de plusieurs sources", "Combiner des informations publiques et des déductions légitimes pour formuler une recommandation d''investissement", "Partager des informations privilégiées avec d''autres analystes CFA", "Ignorer les informations qui contredisent sa thèse d''investissement"]'), 1,
   'La mosaic theory est une défense reconnue : un analyste peut combiner des informations publiques disparates et des déductions pour construire une recommandation, même si la conclusion finale n''est pas publique.', 3),

  (v_sid, 'Selon le Standard IV(A) sur les Obligations envers l''Employeur, un salarié souhaitant quitter son emploi peut, sans violer le standard :',
   _cfa_arr('["Copier les bases de données clients de son employeur avant son départ", "Contacter discrètement des clients pour les informer de son départ sans révéler sa destination", "Emporter des rapports de recherche propriétaires pour usage futur", "Recruter des collègues pendant ses heures de travail"]'), 1,
   'Il est acceptable d''informer des clients de son départ prochain, tant qu''on ne divulgue pas le nom du futur employeur et qu''on n''utilise pas de moyens déloyaux. Copier des données propriétaires est une violation.', 4),

  (v_sid, 'La conformité aux GIPS (Global Investment Performance Standards) s''applique à :',
   _cfa_arr('["Chaque analyste individuellement certifié CFA", "L''ensemble de la société de gestion (firm-wide)", "Uniquement les composites sélectionnés par la société", "Les fonds de pension dépassant 500 M€ d''actifs"]'), 1,
   'Les GIPS s''appliquent à l''ensemble de la firme (firm-wide compliance). Une société ne peut pas revendiquer la conformité GIPS pour certains composites seulement.', 5),

  (v_sid, 'Le Standard III(B) sur la « Fair Dealing » exige que les recommandations soient diffusées :',
   _cfa_arr('["En priorité aux clients institutionnels puis aux clients individuels", "D''abord aux clients les plus rentables pour la firme", "De manière équitable à tous les clients, sans favoritisme", "Uniquement après publication dans un rapport public gratuit"]'), 2,
   'La fair dealing n''exige pas une simultanéité absolue mais interdit de favoriser certains clients. Les clients peuvent être servis selon la taille du compte, mais aucun groupe ne doit recevoir l''information nettement plus tôt que les autres.', 6),

  (v_sid, 'Un gestionnaire de portefeuille reçoit régulièrement des billets de concert de la part d''un courtier qui exécute ses ordres. Cette pratique :',
   _cfa_arr('["Est toujours autorisée car elle ne constitue pas un paiement en espèces", "Est acceptable si la valeur est nominale et divulguée à l''employeur", "Est systématiquement interdite par le Code d''Éthique CFA", "Est autorisée à condition que le gestionnaire paie les impôts correspondants"]'), 1,
   'Le Standard I(B) sur l''Indépendance et l''Objectivité tolère les cadeaux de faible valeur s''ils sont divulgués et ne compromettent pas l''objectivité. Les avantages substantiels peuvent créer un conflit d''intérêts.', 7),

  (v_sid, 'Selon le Standard V(A), la « base raisonnable » pour une recommandation implique que l''analyste doit :',
   _cfa_arr('["Disposer d''au moins trois sources d''information indépendantes", "Avoir effectué une analyse approfondie et disposer de fondements suffisants pour justifier sa recommandation", "Obtenir la validation d''un comité d''investissement avant toute publication", "Avoir au moins 5 ans d''expérience dans le secteur analysé"]'), 1,
   'Le Standard V(A) requiert que les recommandations reposent sur une analyse sérieuse. La quantité de recherche requise dépend du contexte : quantitative et qualitative, suffisante pour justifier la conclusion.', 8),

  (v_sid, 'Le Standard VI(B) sur la Priorité des Transactions exige que l''ordre de priorité soit :',
   _cfa_arr('["Employeur > Clients > Personnel du membre", "Personnel du membre > Clients > Employeur", "Clients > Employeur > Personnel du membre", "Clients = Employeur > Personnel du membre"]'), 2,
   'Les clients passent en premier, puis les transactions de l''employeur, et seulement ensuite les transactions personnelles du membre. Cela prévient le front-running sur les comptes personnels.', 9),

  (v_sid, 'Un analyste publie un rapport positif sur une action en omettant volontairement de mentionner qu''il en détient personnellement. Il viole principalement :',
   _cfa_arr('["Standard I(A) : Connaissance des règles", "Standard VI(A) : Divulgation des conflits d''intérêts", "Standard II(B) : Manipulation de marché", "Standard III(C) : Suitability"]'), 1,
   'Le Standard VI(A) exige la divulgation de toute détention personnelle susceptible de créer un conflit d''intérêts avec les clients ou employeurs, notamment lors de la publication de recommandations.', 10),

  (v_sid, 'Le Standard I(C) sur la Tromperie interdit explicitement :',
   _cfa_arr('["L''utilisation de modèles d''évaluation quantitatifs non testés", "Toute déclaration fausse, trompeuse ou omission susceptible d''induire en erreur", "La communication de prévisions incertaines aux clients", "L''utilisation d''hypothèses optimistes dans les valorisations"]'), 1,
   'Le Standard I(C) couvre les mensonges, la tromperie et les omissions significatives dans les communications professionnelles, les rapports d''investissement et les communications avec clients.', 11),

  (v_sid, 'Selon les GIPS, une société de gestion doit inclure dans chaque composite :',
   _cfa_arr('["Uniquement les meilleurs portefeuilles de la stratégie", "Tous les portefeuilles gérés selon cette stratégie (y compris les plus mauvaises performances)", "Les portefeuilles dépassant un seuil minimal d''actifs fixé librement", "Uniquement les portefeuilles clients institutionnels"]'), 1,
   'Les GIPS exigent l''inclusion de tous les portefeuilles réels (discrétionnaires) gérés selon la stratégie du composite. L''exclusion sélective des mauvaises performances est une violation.', 12),

  (v_sid, 'Le Standard VII(B) sur la Référence aux Titres CFA interdit :',
   _cfa_arr('["De mentionner que l''on est candidat au niveau III du CFA", "D''utiliser le titre CFA de manière à le présenter comme supérieur à d''autres certifications financières", "D''afficher le logo CFA Institute sur une carte de visite", "D''indiquer l''année d''obtention du titre CFA"]'), 1,
   'Le Standard VII(B) interdit toute déclaration qui implique que le titre CFA confère une supériorité absolue sur d''autres certifications ou des capacités spéciales non liées au programme CFA.', 13),

  (v_sid, 'Un membre CFA découvre que son collègue manipule les cours d''actions via des ordres fictifs. Il doit :',
   _cfa_arr('["Alerter son manager hiérarchique et, si nécessaire, les autorités de régulation compétentes", "Ignorer la situation car elle ne le concerne pas directement", "Attendre de réunir des preuves irréfutables avant d''agir", "Informer uniquement le département juridique interne"]'), 0,
   'Le Standard I(A) sur la Connaissance des Règles impose de prendre des mesures raisonnables face à des violations. Selon les circonstances, cela peut inclure une communication aux autorités réglementaires.', 14),

  (v_sid, 'Le Standard III(E) sur la Préservation de la Confidentialité impose de garder secrètes les informations clients SAUF si :',
   _cfa_arr('["Un autre client demande cette information", "La loi ou la réglementation impose la divulgation, ou le client donne son accord", "Un partenaire commercial de la firme en a besoin", "L''information concerne des activités légales du client"]'), 1,
   'La confidentialité est la règle, mais elle cède devant les obligations légales (injonctions, autorités de régulation) et lorsque le client a explicitement autorisé la divulgation.', 15);

  -- ══════════════════════════════════════════════
  -- TOPIC 2 : MÉTHODES QUANTITATIVES
  -- ══════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Méthodes Quantitatives', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES
  (v_sid, 'Un investisseur place 1 000 € à un taux d''intérêt annuel effectif de 10 %. Quelle est la valeur future après 3 ans ?',
   _cfa_arr('["1 300 €", "1 310 €", "1 330 €", "1 331 €"]'), 3,
   'FV = PV × (1 + r)^n = 1 000 × (1,10)^3 = 1 000 × 1,331 = 1 331 €. L''intérêt composé génère des intérêts sur les intérêts.', 1),

  (v_sid, 'La différence entre le taux annuel effectif (EAR) et le taux nominal annuel (stated rate) est due à :',
   _cfa_arr('["L''inflation anticipée", "La fréquence de capitalisation infra-annuelle", "La fiscalité des revenus d''intérêts", "La durée de l''investissement"]'), 1,
   'EAR = (1 + r_nominal/m)^m - 1. Plus la fréquence de capitalisation m est élevée, plus l''EAR dépasse le taux nominal. Un taux de 12% capitalisé mensuellement donne un EAR de 12,68%.', 2),

  (v_sid, 'Les rendements annuels d''un actif sur 4 ans sont : +10 %, -5 %, +20 %, +15 %. Quelle est la moyenne arithmétique ?',
   _cfa_arr('["8,0 %", "9,0 %", "10,0 %", "11,5 %"]'), 2,
   'Moyenne arithmétique = (10 + (-5) + 20 + 15) / 4 = 40 / 4 = 10 %. La moyenne arithmétique surestime le rendement composé sur plusieurs périodes.', 3),

  (v_sid, 'Le taux de rendement pondéré dans le temps (TWRR) est préféré au MWRR pour évaluer un gestionnaire car il :',
   _cfa_arr('["Tient compte des décisions d''allocation du gestionnaire", "Élimine l''impact des flux de trésorerie hors du contrôle du gestionnaire", "Est plus simple à calculer que le MWRR", "Reflète mieux le rendement réellement perçu par l''investisseur"]'), 1,
   'Le TWRR divise la période en sous-périodes à chaque flux externe et les enchaîne géométriquement. Il neutralise ainsi les entrées/sorties de capital que le gestionnaire ne décide pas.', 4),

  (v_sid, 'Dans une distribution normale, environ quel pourcentage des observations se trouve à ±1 écart-type de la moyenne ?',
   _cfa_arr('["50 %", "68 %", "90 %", "95 %"]'), 1,
   'Règle empirique 68-95-99,7 : ±1σ ≈ 68 %, ±2σ ≈ 95 %, ±3σ ≈ 99,7 % des observations pour une distribution normale.', 5),

  (v_sid, 'Un test d''hypothèse bilatéral au seuil de 5 % rejette l''hypothèse nulle si la statistique z est :',
   _cfa_arr('["Supérieure à 1,645", "Supérieure à 1,960 ou inférieure à -1,960", "Supérieure à 2,326", "Supérieure à 1,282"]'), 1,
   'Pour un test bilatéral à 5 %, on partage α en deux queues de 2,5 % chacune. Les valeurs critiques z sont ±1,96. Si |z| > 1,96 on rejette H₀.', 6),

  (v_sid, 'La covariance entre X et Y est 0,012 ; σX = 0,15 ; σY = 0,20. Quel est le coefficient de corrélation ?',
   _cfa_arr('["0,20", "0,30", "0,40", "0,60"]'), 2,
   'ρ(X,Y) = Cov(X,Y) / (σX × σY) = 0,012 / (0,15 × 0,20) = 0,012 / 0,030 = 0,40. La corrélation est bornée entre -1 et +1.', 7),

  (v_sid, 'Dans une régression linéaire, le R² mesure :',
   _cfa_arr('["La pente de la droite de régression", "La proportion de la variance de Y expliquée par X", "L''erreur standard de la régression", "Le nombre de degrés de liberté"]'), 1,
   'R² = SSR/SST = 1 - SSE/SST. Il représente la fraction de la variabilité totale de la variable dépendante expliquée par le modèle de régression.', 8),

  (v_sid, 'Une distribution présentant une asymétrie positive (positive skewness) a :',
   _cfa_arr('["Une médiane supérieure à la moyenne", "Une queue droite plus longue et une moyenne supérieure à la médiane", "Une forme plus pointue qu''une distribution normale", "Une queue gauche plus étalée"]'), 1,
   'Avec une skewness positive : Mode < Médiane < Moyenne. La queue droite est allongée par quelques valeurs extrêmes positives qui tirent la moyenne vers la droite.', 9),

  (v_sid, 'Le théorème central limite stipule que, pour n ≥ 30, la distribution des moyennes d''échantillon :',
   _cfa_arr('["Suit une loi de Student quelle que soit la taille", "Suit approximativement une loi normale quelle que soit la distribution de la population", "A un écart-type égal à la variance de la population", "Dépend de la kurtosis de la distribution mère"]'), 1,
   'Le TCL est fondamental : la moyenne d''échantillon X̄ suit approximativement N(μ, σ²/n) pour n suffisamment grand, même si la population de départ n''est pas normale.', 10),

  (v_sid, 'La formule de Bayes est utilisée pour :',
   _cfa_arr('["Calculer la valeur actuelle d''une annuité", "Mettre à jour une probabilité a priori à l''aide d''une nouvelle information", "Déterminer la corrélation entre deux variables", "Estimer la variance d''un portefeuille"]'), 1,
   'P(A|B) = P(B|A) × P(A) / P(B). La formule de Bayes permet de réviser une probabilité initiale (prior) en y incorporant de nouvelles observations pour obtenir une probabilité a posteriori.', 11),

  (v_sid, 'La valeur actuelle d''une rente perpétuelle versant un coupon C par période, avec un taux d''actualisation r, est :',
   _cfa_arr('["C × r", "C / r", "C × (1 + r)", "C / (1 + r)"]'), 1,
   'PV (perpétuité) = C / r. C''est la limite de la somme géométrique infinie PV = C/(1+r) + C/(1+r)² + ... = C/r lorsque les flux sont constants et infinis.', 12),

  (v_sid, 'La kurtosis excédentaire (excess kurtosis) d''une distribution normale est :',
   _cfa_arr('["3", "1", "0", "-1"]'), 2,
   'La kurtosis d''une distribution normale est 3. L''excess kurtosis = kurtosis - 3 = 0. Une leptokurtose (kurtosis > 3) indique des queues plus épaisses que la normale.', 13),

  (v_sid, 'Un portefeuille affiche un rendement espéré de 8 % et un écart-type de 12 %. Son coefficient de variation (CV) est :',
   _cfa_arr('["0,67", "1,50", "0,96", "4,00"]'), 1,
   'CV = σ / E(R) = 12 % / 8 % = 1,50. Le CV mesure le risque par unité de rendement espéré. Plus il est bas, plus l''actif est efficace en termes risque/rendement.', 14),

  (v_sid, 'Dans un test d''hypothèse, une erreur de type I correspond à :',
   _cfa_arr('["Ne pas rejeter une hypothèse nulle fausse", "Rejeter une hypothèse nulle vraie", "Surestimer la variance de la population", "Utiliser un échantillon biaisé"]'), 1,
   'Erreur de type I (faux positif) : rejeter H₀ alors qu''elle est vraie. Sa probabilité est α (niveau de signification). Erreur de type II : ne pas rejeter H₀ fausse (probabilité β).', 15);

  -- ══════════════════════════════════════════════
  -- TOPIC 3 : ÉCONOMIE
  -- ══════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Économie', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES
  (v_sid, 'Dans un marché en concurrence parfaite, à long terme, le bénéfice économique des entreprises tend vers :',
   _cfa_arr('["Un maximum stable", "Zéro", "Le coût d''opportunité du capital", "Le taux de rendement moyen de l''industrie"]'), 1,
   'En concurrence parfaite, les profits économiques positifs attirent de nouveaux entrants. Cela augmente l''offre, fait baisser les prix jusqu''à ce que le profit économique = 0 (toutes les ressources sont rémunérées à leur coût d''opportunité).', 1),

  (v_sid, 'Face à une inflation galopante, la banque centrale devra généralement :',
   _cfa_arr('["Abaisser ses taux directeurs", "Augmenter ses taux directeurs", "Réduire les réserves obligatoires", "Accroître les rachats d''actifs (QE)"]'), 1,
   'Une politique monétaire restrictive (hausse des taux) renchérit le crédit, réduit la demande agrégée et freine l''inflation. C''est la réponse conventionnelle d''une banque centrale à l''inflation.', 2),

  (v_sid, 'Le multiplicateur budgétaire keynésien est d''autant plus élevé que la propension marginale à consommer (MPC) est :',
   _cfa_arr('["Faible", "Élevée", "Égale à 1", "Nulle"]'), 1,
   'Multiplicateur = 1 / (1 - MPC) = 1 / MPS. Si MPC = 0,8 → multiplicateur = 5. Si MPC = 0,5 → multiplicateur = 2. Plus la MPC est élevée, plus la relance se propage dans l''économie.', 3),

  (v_sid, 'Selon la théorie de la parité des taux d''intérêt couverte (Covered IRP), si les taux d''intérêt américains dépassent les taux de la zone euro, le dollar en change à terme devrait :',
   _cfa_arr('["S''apprécier vis-à-vis de l''euro", "Se déprécier vis-à-vis de l''euro", "Rester strictement stable", "Suivre uniquement les différentiels d''inflation"]'), 1,
   'La CIP stipule que la devise à taux élevé se négocie à terme avec une décote (forward discount) pour éliminer tout arbitrage. Plus les taux US sont élevés, plus le dollar est déprécié à terme.', 4),

  (v_sid, 'Un oligopole se caractérise par :',
   _cfa_arr('["Un seul vendeur avec un pouvoir de marché absolu", "De nombreux vendeurs offrant des produits identiques", "Quelques grands vendeurs dont les décisions sont mutuellement interdépendantes", "De nombreux vendeurs avec des produits légèrement différenciés"]'), 2,
   'Dans un oligopole, chaque acteur surveille les décisions des concurrents (guerre des prix, cartels, dilemme du prisonnier). Exemples : industrie automobile, pétrole (OPEP), télécommunications.', 5),

  (v_sid, 'En phase de récession du cycle économique, on observe généralement :',
   _cfa_arr('["Une hausse de l''emploi et de la consommation", "Une baisse du PIB réel pendant au moins deux trimestres consécutifs et une hausse du chômage", "Une accélération de l''inflation et des taux d''intérêt", "Une augmentation des profits des secteurs cycliques"]'), 1,
   'La récession se définit techniquement par deux trimestres consécutifs de contraction du PIB réel. Elle s''accompagne d''une hausse du chômage, d''une baisse de la consommation et de l''investissement.', 6),

  (v_sid, 'L''effet d''éviction (crowding out) d''une politique budgétaire expansionniste se produit car :',
   _cfa_arr('["Elle réduit la confiance des ménages", "Elle provoque une hausse des taux d''intérêt qui décourage l''investissement privé", "Elle entraîne une dépréciation de la monnaie nationale", "Elle augmente les importations nettes"]'), 1,
   'L''État emprunte davantage sur les marchés → la demande de fonds prêtables augmente → les taux d''intérêt montent → l''investissement privé diminue. Cet effet peut partiellement annuler la relance.', 7),

  (v_sid, 'L''effet Fisher stipule que le taux d''intérêt nominal est approximativement égal à :',
   _cfa_arr('["Le taux réel moins l''inflation anticipée", "Le taux réel plus l''inflation anticipée", "L''inflation divisée par le taux réel", "Le taux réel multiplié par (1 + inflation)"]'), 1,
   'Approximation de Fisher : i ≈ r + π. Version exacte : (1+i) = (1+r)(1+π). Cette relation implique que les taux nominaux incorporent les anticipations d''inflation des marchés.', 8),

  (v_sid, 'Selon la théorie quantitative de la monnaie (MV = PQ), si V et Q sont constants, une hausse de M de 5 % entraîne :',
   _cfa_arr('["Une hausse de Q de 5 %", "Une hausse de P de 5 %", "Une baisse des taux d''intérêt de 5 %", "Une appréciation de la monnaie de 5 %"]'), 1,
   'MV = PQ. Si V et Q sont fixes, toute variation de M se répercute intégralement sur P (niveau des prix). C''est le fondement monétariste : l''inflation est un phénomène monétaire.', 9),

  (v_sid, 'Lequel des éléments suivants N''est PAS l''une des trois approches de mesure du PIB ?',
   _cfa_arr('["L''approche par les dépenses (C + I + G + NX)", "L''approche par les revenus (salaires + profits + rentes)", "L''approche par la valeur ajoutée (production)", "L''approche par les exportations nettes uniquement"]'), 3,
   'Les trois approches équivalentes sont : dépenses, revenus et production (valeur ajoutée). Elles donnent théoriquement le même résultat. Il n''existe pas d''approche par les seules exportations nettes.', 10),

  (v_sid, 'L''avantage comparatif dans le commerce international implique qu''un pays doit se spécialiser dans la production où :',
   _cfa_arr('["Il a le coût absolu le plus bas", "Son coût d''opportunité relatif est le plus faible", "Sa productivité du travail est la plus élevée", "Il dispose de ressources naturelles abondantes"]'), 1,
   'L''avantage comparatif (Ricardo) se fonde sur le coût d''opportunité : même un pays moins efficace dans tout peut avoir intérêt à se spécialiser et à échanger là où son désavantage est le plus faible.', 11),

  (v_sid, 'La stagflation désigne la coexistence de :',
   _cfa_arr('["Forte croissance et faible inflation", "Inflation élevée et stagnation économique (faible croissance ou récession)", "Déflation et chômage faible", "Stagnation de la masse monétaire et croissance forte"]'), 1,
   'La stagflation des années 1970 (choc pétrolier) a montré qu''inflation et récession pouvaient coexister, contredisant la courbe de Phillips traditionnelle. Elle pose un dilemme majeur aux banques centrales.', 12),

  (v_sid, 'Un régime de taux de change fixe implique que la banque centrale doit :',
   _cfa_arr('["Laisser le marché déterminer librement le taux de change", "Intervenir activement pour maintenir la parité en achetant ou vendant des réserves de change", "Adopter la monnaie d''un autre pays", "Indexer sa monnaie sur l''or uniquement"]'), 1,
   'En régime fixe, la banque centrale est engagée à défendre une parité. Si sa monnaie subit une pression à la baisse, elle doit vendre des réserves en devises étrangères (ou monter les taux) pour la soutenir.', 13),

  (v_sid, 'Lequel de ces secteurs est le plus sensible au cycle économique (le plus cyclique) ?',
   _cfa_arr('["Services publics (utilities)", "Consommation de base (alimentation, pharmacie)", "Industrie lourde et matériaux", "Santé"]'), 2,
   'Les secteurs cycliques (industrie, matériaux, consommation discrétionnaire) voient leurs profits fortement impactés par les phases du cycle. Les secteurs défensifs (utilities, alimentation, santé) sont beaucoup moins sensibles.', 14),

  (v_sid, 'La politique monétaire non conventionnelle d''assouplissement quantitatif (QE) consiste à :',
   _cfa_arr('["Baisser le taux directeur en dessous de zéro", "Acheter des actifs financiers à grande échelle pour injecter de la liquidité dans l''économie", "Augmenter les dépenses gouvernementales", "Réduire les réserves obligatoires des banques"]'), 1,
   'Le QE est utilisé lorsque les taux directeurs sont proches de zéro (zero lower bound). La banque centrale achète des obligations d''État ou des actifs privés pour augmenter la base monétaire et stimuler le crédit.', 15);

  -- ══════════════════════════════════════════════
  -- TOPIC 4 : ANALYSE DES ÉTATS FINANCIERS
  -- ══════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Analyse des États Financiers', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES
  (v_sid, 'En période d''inflation, quelle méthode d''évaluation des stocks génère le bénéfice brut le plus élevé ?',
   _cfa_arr('["LIFO (Dernier entré, premier sorti)", "FIFO (Premier entré, premier sorti)", "Coût moyen pondéré", "Méthode du coût spécifique"]'), 1,
   'Avec FIFO en inflation, les coûts les plus anciens (moins chers) sont comptabilisés en coût des ventes, laissant les stocks récents (plus chers) à l''actif. Résultat : coût des ventes plus bas → bénéfice brut plus élevé.', 1),

  (v_sid, 'L''équation comptable fondamentale est :',
   _cfa_arr('["Actif = Passif − Capitaux propres", "Actif = Passif + Capitaux propres", "Actif + Passif = Capitaux propres", "Capitaux propres = Actif × Passif"]'), 1,
   'Cette équation est le fondement de la comptabilité en partie double : chaque actif est financé soit par des dettes (passif), soit par les apports et profits accumulés des actionnaires (capitaux propres).', 2),

  (v_sid, 'Le flux de trésorerie opérationnel (CFO) selon la méthode indirecte commence par :',
   _cfa_arr('["Le chiffre d''affaires de la période", "Le résultat net, auquel on ajoute les charges non monétaires et ajuste les variations du BFR", "Les encaissements clients bruts", "L''EBITDA directement"]'), 1,
   'La méthode indirecte part du résultat net et le réconcilie avec les flux réels : on rajoute les amortissements (non cash), on ajuste les variations de stocks, créances clients et dettes fournisseurs (BFR).', 3),

  (v_sid, 'Un lease « finance » (finance lease) selon IFRS 16 se distingue d''un lease opérationnel car il :',
   _cfa_arr('["N''apparaît pas au bilan du preneur", "Transfère substantiellement tous les risques et avantages de la propriété au preneur", "Génère des charges linéaires et constantes sur toute sa durée", "N''affecte pas les ratios d''endettement du preneur"]'), 1,
   'IFRS 16 impose la comptabilisation au bilan de pratiquement tous les contrats de location. Un finance lease est reconnu comme un actif de droit d''utilisation avec une dette associée.', 4),

  (v_sid, 'Le BPA dilué (bénéfice par action dilué) tient compte :',
   _cfa_arr('["Uniquement des actions ordinaires en circulation", "De toutes les émissions potentielles d''actions : options, obligations convertibles, warrants", "Des dividendes versés aux actionnaires privilégiés", "Des actions propres uniquement"]'), 1,
   'Le BPA dilué suppose que toutes les dilutions potentielles se réalisent (options dans la monnaie, convertibles, warrants). Il est toujours inférieur ou égal au BPA de base et représente le « worst case ».', 5),

  (v_sid, 'Un actif d''impôt différé (DTA) apparaît dans le bilan lorsque :',
   _cfa_arr('["Le bénéfice comptable dépasse le bénéfice fiscal imposable", "Les impôts effectivement payés dépassent la charge fiscale comptable, ou en cas de déficits fiscaux reportables", "L''entreprise applique un taux d''imposition réduit", "Les amortissements fiscaux sont inférieurs aux amortissements comptables"]'), 1,
   'Un DTA naît d''une différence temporaire déductible : on paie plus d''impôts aujourd''hui que ce que la comptabilité reconnaît, créant un avantage fiscal futur. Les déficits reportables génèrent aussi des DTA.', 6),

  (v_sid, 'Le ratio de rotation des stocks (Inventory Turnover) se calcule comme :',
   _cfa_arr('["Chiffre d''affaires / Stocks moyens", "Coût des ventes / Stocks moyens", "Stocks moyens / Coût des ventes", "Résultat net / Stocks"]'), 1,
   'Inventory Turnover = COGS / Average Inventory. On utilise le COGS (coût des ventes) et non le CA car les stocks sont comptabilisés au coût, pas au prix de vente. Plus le ratio est élevé, plus la gestion des stocks est efficace.', 7),

  (v_sid, 'L''analyse DuPont à 3 facteurs décompose le ROE en :',
   _cfa_arr('["Marge nette × Rotation des actifs", "Marge nette × Rotation des actifs × Levier financier (actif total / capitaux propres)", "ROA × Marge nette × Taux de croissance", "Marge brute × Rotation des capitaux × Taux d''imposition"]'), 1,
   'ROE = (Résultat net / CA) × (CA / Actif total) × (Actif total / Capitaux propres) = Marge nette × Rotation × Levier. Cette décomposition identifie les leviers d''amélioration de la rentabilité.', 8),

  (v_sid, 'Le « free cash flow to equity » (FCFE) est défini comme :',
   _cfa_arr('["CFO uniquement", "CFO − Investissements en capital (Capex) + Emprunts nets (nouvelles dettes − remboursements)", "Résultat net + Amortissements", "EBITDA − Impôts − Variations du BFR"]'), 1,
   'FCFE = CFO - Capex + Net Borrowing. Il représente les flux disponibles pour les actionnaires après financement des investissements et des remboursements de dette.', 9),

  (v_sid, 'Sous IFRS, les marques, brevets et fonds de commerce créés en interne sont généralement :',
   _cfa_arr('["Capitalisés et amortis sur leur durée d''utilité", "Comptabilisés à la juste valeur annuellement", "Non capitalisés et passés en charges", "Reconnus uniquement après 3 ans d''existence"]'), 2,
   'IAS 38 interdit généralement la capitalisation des incorporels générés en interne (marque, clientèle, goodwill interne) car leur coût et leur valeur sont trop incertains.', 10),

  (v_sid, 'Le ratio Quick (acid-test) exclut des actifs courants :',
   _cfa_arr('["La trésorerie et équivalents", "Les créances clients", "Les stocks et les charges constatées d''avance", "Les placements à court terme"]'), 2,
   'Quick Ratio = (Trésorerie + Équivalents + Créances) / Passif courant. On retire les stocks (moins liquides) et les charges constatées d''avance. Il mesure la capacité à couvrir les dettes court terme sans vendre les stocks.', 11),

  (v_sid, 'Selon IFRS, les dividendes reçus par une entreprise dans son état des flux de trésorerie peuvent être classés en :',
   _cfa_arr('["Uniquement CFO (activités opérationnelles)", "CFO ou CFI (activités d''investissement) au choix de l''entreprise", "Uniquement CFI", "CFO ou CFF (activités de financement) au choix"]'), 1,
   'IFRS offre le choix : dividendes reçus en CFO ou CFI. US GAAP impose CFO. De même pour les intérêts reçus. Cette flexibilité IFRS rend les comparaisons inter-entreprises plus complexes.', 12),

  (v_sid, 'La méthode d''amortissement dégressif, comparée à la méthode linéaire, génère dans les premières années :',
   _cfa_arr('["Un bénéfice net plus élevé et des actifs nets plus élevés", "Un bénéfice net plus faible et une valeur comptable nette plus faible", "Des flux de trésorerie opérationnels plus faibles", "Aucune différence sur le bilan"]'), 1,
   'L''amortissement dégressif enregistre davantage de charges en début de vie → bénéfice net plus faible. La valeur comptable nette de l''actif est aussi plus faible. Les flux de trésorerie réels ne sont pas affectés (non-cash).', 13),

  (v_sid, 'Les « warning signs » de faible qualité des résultats (earnings quality) incluent :',
   _cfa_arr('["Des amortissements plus rapides que la durée économique des actifs", "Une croissance des revenus nettement supérieure à la croissance du CFO", "Une provision pour créances douteuses conservatrice", "Des audits réalisés par un des Big Four"]'), 1,
   'Quand les revenus croissent bien plus vite que le CFO, c''est souvent le signe d''une reconnaissance de revenus agressive, de créances fictives ou d''un allongement des délais de paiement clients.', 14),

  (v_sid, 'Le ratio de couverture des intérêts (Interest Coverage Ratio) est calculé comme :',
   _cfa_arr('["Résultat net / Charges d''intérêts", "EBIT / Charges d''intérêts", "EBITDA / Dettes totales", "CFO / Charges d''intérêts"]'), 1,
   'ICR = EBIT / Intérêts nets. Il mesure combien de fois l''entreprise peut couvrir ses intérêts avec son bénéfice opérationnel. Un ratio < 1,5× signale un risque de détresse financière.', 15);

  -- ══════════════════════════════════════════════
  -- TOPIC 5 : FINANCE D'ENTREPRISE
  -- ══════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Finance d''Entreprise', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES
  (v_sid, 'Le WACC (Coût Moyen Pondéré du Capital) représente :',
   _cfa_arr('["Le coût de la dette après impôts uniquement", "Le taux de rendement minimum exigé pour créer de la valeur, pondéré par la structure financière", "Le dividende moyen versé par action", "Le taux d''actualisation des obligations de l''entreprise"]'), 1,
   'WACC = (E/V) × Ke + (D/V) × Kd × (1-T). Il reflète le coût des ressources financières de l''entreprise. Tout projet dont le TRI dépasse le WACC crée de la valeur pour les actionnaires.', 1),

  (v_sid, 'Selon Modigliani-Miller sans impôts (Proposition I), la valeur de l''entreprise est :',
   _cfa_arr('["Maximisée à 100 % de dette", "Maximisée à 100 % de capitaux propres", "Indépendante de la structure de financement", "Toujours maximisée avec un ratio D/E = 1"]'), 2,
   'M&M sans impôts : dans un monde parfait (pas de coûts de faillite, pas d''impôts, marchés parfaits), la valeur de l''entreprise est indépendante de la façon dont elle est financée.', 2),

  (v_sid, 'Selon le CAPM, le coût des capitaux propres est estimé par :',
   _cfa_arr('["Rf + prime de marché", "Rf + β × (Rm - Rf)", "β × Rm", "Rm − prime de risque"]'), 1,
   'CAPM : Ke = Rf + β × (Rm - Rf), où Rf est le taux sans risque, β le bêta de l''action et (Rm - Rf) la prime de risque du marché. Cette formule est la composante standard du calcul du WACC.', 3),

  (v_sid, 'Un projet d''investissement a une VAN positive si :',
   _cfa_arr('["Son délai de récupération est inférieur à 3 ans", "Son TRI est supérieur au WACC de l''entreprise", "Ses flux de trésorerie totaux dépassent l''investissement initial", "Son indice de profitabilité est inférieur à 1"]'), 1,
   'VAN > 0 ⟺ TRI > taux d''actualisation (WACC). La VAN mesure la création de valeur nette en euros ; le TRI est le taux implicite du projet. Un TRI > WACC indique une création de valeur actionnaire.', 4),

  (v_sid, 'La « trade-off theory » de la structure du capital identifie la structure optimale d''endettement comme le point où :',
   _cfa_arr('["La dette est maximisée pour optimiser l''avantage fiscal", "L''avantage fiscal de la déduction des intérêts est exactement compensé par les coûts de détresse financière", "L''entreprise est financée à 100 % par fonds propres", "Le coût de la dette égale le coût des capitaux propres"]'), 1,
   'L''avantage fiscal de la dette (bouclier fiscal = T × D) pousse vers plus d''endettement. Mais les coûts de détresse financière augmentent avec le levier. L''optimum est à leur intersection.', 5),

  (v_sid, 'La « pecking order theory » prédit que les entreprises préfèrent se financer dans l''ordre suivant :',
   _cfa_arr('["Actions nouvelles > Dettes > Autofinancement", "Autofinancement > Dettes > Émission d''actions nouvelles", "Dettes > Actions > Autofinancement", "Émissions d''obligations > Emprunts bancaires > Fonds propres"]'), 1,
   'La pecking order (Myers & Majluf) repose sur l''asymétrie d''information : l''autofinancement ne génère pas de signal au marché, la dette peu, les nouvelles actions beaucoup (signal négatif sur la valorisation actuelle).', 6),

  (v_sid, 'Le coût de la dette (après impôts) utilisé dans le WACC est calculé à partir de :',
   _cfa_arr('["Le taux du coupon historique × (1 - T)", "Le rendement à l''échéance (YTM) actuel × (1 - T)", "Le taux directeur de la banque centrale × (1 - T)", "Le taux sans risque × (1 - T)"]'), 1,
   'On utilise le YTM actuel (taux de marché), pas le coupon historique. L''ajustement (1-T) reflète la déductibilité fiscale des intérêts, réduisant le coût effectif de la dette pour l''entreprise.', 7),

  (v_sid, 'Dans l''évaluation d''un projet, les coûts irrécupérables (sunk costs) doivent être :',
   _cfa_arr('["Inclus dans le calcul du NPV car ils représentent un investissement passé", "Exclus car ils ont déjà été engagés et ne sont pas différentiels", "Amortis sur la durée du projet", "Comptabilisés en charges exceptionnelles"]'), 1,
   'Les sunk costs sont des dépenses passées, irréversibles, identiques quelle que soit la décision prise. Ils ne doivent jamais influencer une décision prospective. Seuls les flux différentiels futurs comptent.', 8),

  (v_sid, 'Le problème de « principal-agent » en gouvernance d''entreprise désigne :',
   _cfa_arr('["Le conflit entre banques créancières et actionnaires", "La divergence d''intérêts entre dirigeants (agents) et actionnaires (principaux)", "Le problème de coordination entre actionnaires majoritaires et minoritaires", "L''asymétrie d''information entre l''entreprise et ses clients"]'), 1,
   'Les dirigeants peuvent maximiser leur rémunération, réputation ou pouvoir au détriment des actionnaires. Des mécanismes (bonus indexés, conseil d''administration indépendant) cherchent à aligner leurs intérêts.', 9),

  (v_sid, 'En gestion du besoin en fonds de roulement (BFR), l''allongement du délai de paiement fournisseurs :',
   _cfa_arr('["Augmente le BFR", "Diminue le BFR", "Augmente les créances clients", "N''affecte pas le BFR"]'), 1,
   'BFR = Stocks + Créances clients – Dettes fournisseurs. Allonger les délais fournisseurs → augmentation des dettes → BFR réduit. C''est un levier courant d''optimisation du cash.', 10),

  (v_sid, 'Le modèle de Gordon (Dividend Discount Model à croissance constante) valorise une action par :',
   _cfa_arr('["P = D0 / r", "P = D1 / (r − g)", "P = D1 / (r + g)", "P = EPS × (1 − g)"]'), 1,
   'P = D1 / (r - g) où D1 = D0 × (1+g). Il faut impérativement que r > g. Le modèle est très sensible au choix de g : une légère variation change radicalement la valorisation.', 11),

  (v_sid, 'L''ESG (Environnemental, Social, Gouvernance) est intégré dans l''analyse financière car :',
   _cfa_arr('["Il est imposé par toutes les réglementations mondiales", "Il permet d''identifier des risques et opportunités non reflétés dans les données financières traditionnelles", "Il maximise toujours la performance à court terme", "Il remplace l''analyse fondamentale classique"]'), 1,
   'L''analyse ESG identifie des risques matériels (risque climatique, risques de réputation, gouvernance défaillante) qui peuvent affecter la performance à long terme mais n''apparaissent pas toujours dans les états financiers.', 12),

  (v_sid, 'Un investisseur activiste prend une participation de 15 % dans une société et exige le remplacement du PDG. C''est un mécanisme de gouvernance :',
   _cfa_arr('["Interne (internal governance mechanism)", "Externe (external governance mechanism)", "Réglementaire imposé par la loi", "Contractuel entre actionnaires"]'), 1,
   'La pression des actionnaires activistes est un mécanisme de gouvernance externe. Les mécanismes internes incluent le conseil d''administration, les comités d''audit et les systèmes de rémunération.', 13),

  (v_sid, 'Le délai de récupération actualisé (Discounted Payback Period) se distingue du délai de récupération simple car il :',
   _cfa_arr('["Prend en compte uniquement les flux positifs", "Actualise les flux de trésorerie à la valeur temporelle de l''argent", "Ignore les flux au-delà du point de récupération", "Est toujours supérieur au délai de récupération simple"]'), 3,
   'Le Discounted Payback actualise chaque flux au WACC avant de les cumuler. Il est toujours plus long que le payback simple car les flux actualisés sont plus faibles.', 14),

  (v_sid, 'Une entreprise peut avoir des flux de trésorerie opérationnels positifs et un résultat net négatif principalement à cause de :',
   _cfa_arr('["La dépréciation des actifs incorporels (goodwill)", "Des charges non monétaires élevées comme les amortissements", "D''une forte croissance des ventes", "D''une politique de dividendes généreuse"]'), 1,
   'Les amortissements sont des charges comptables non monétaires. Ils réduisent le résultat net mais n''affectent pas directement le CFO (on les rajoute dans la méthode indirecte).', 15);

  -- ══════════════════════════════════════════════
  -- TOPIC 6 : ACTIONS
  -- ══════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Investissements en Actions', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES
  (v_sid, 'Dans la forme forte de l''efficience des marchés (strong form EMH), les cours reflètent :',
   _cfa_arr('["Uniquement les données historiques de prix", "Toutes les informations publiques disponibles", "Toutes les informations publiques ET privées (insider information)", "Uniquement les prévisions des analystes"]'), 2,
   'La forme forte est la plus stricte : même les insiders ne peuvent battre le marché systématiquement. La forme semi-forte couvre toutes les informations publiques. La forme faible couvre seulement les données historiques de prix.', 1),

  (v_sid, 'En utilisant le DDM à croissance constante avec D0 = 2 €, g = 5 %, r = 10 %, la valeur intrinsèque de l''action est :',
   _cfa_arr('["20,00 €", "40,00 €", "42,00 €", "38,10 €"]'), 2,
   'V = D1 / (r − g) = D0 × (1+g) / (r−g) = 2 × 1,05 / (0,10 − 0,05) = 2,10 / 0,05 = 42,00 €. Attention : on utilise D1 (prochain dividende), pas D0.', 2),

  (v_sid, 'Un indice pondéré par les prix (price-weighted index) comme le Dow Jones accorde une pondération plus élevée aux :',
   _cfa_arr('["Sociétés à plus grande capitalisation boursière", "Actions avec le prix unitaire le plus élevé", "Sociétés avec le plus grand volume d''échanges", "Sociétés avec la plus forte croissance des bénéfices"]'), 1,
   'Dans un indice price-weighted, une action à 200 € a deux fois plus de poids qu''une action à 100 €, quel que soit le nombre d''actions en circulation.', 3),

  (v_sid, 'L''analyse technique est considérée inefficace dans le cadre de la forme faible de l''EMH car :',
   _cfa_arr('["Elle est trop complexe pour les investisseurs ordinaires", "Tous les patterns historiques de prix sont déjà intégrés dans les cours actuels", "Elle requiert des données en temps réel inaccessibles", "Les graphiques ne fournissent pas suffisamment d''information"]'), 1,
   'Si les prix reflètent déjà toute l''information contenue dans les séries historiques (forme faible), aucune analyse technique basée sur ces historiques ne peut générer de surperformance consistante.', 4),

  (v_sid, 'Le ratio P/E « trailing » (P/E historique) est calculé en divisant le cours par :',
   _cfa_arr('["Les bénéfices prévus pour les 12 prochains mois (forward P/E)", "Les bénéfices réels des 12 derniers mois", "La moyenne des BPA sur 5 ans", "Les bénéfices normalisés du cycle économique (Shiller CAPE)"]'), 1,
   'Le trailing P/E utilise les bénéfices passés (connus), donc plus fiables. Le forward P/E utilise les prévisions des analystes (incertaines mais plus pertinentes pour l''évaluation prospective).', 5),

  (v_sid, 'La valeur d''entreprise (Enterprise Value, EV) est calculée comme :',
   _cfa_arr('["Capitalisation boursière uniquement", "Capitalisation boursière + Dettes totales − Trésorerie", "Actif total − Passif courant", "Capitaux propres + Goodwill au bilan"]'), 1,
   'EV = Capitalisation boursière + Dette financière nette (dettes − cash). L''EV représente le coût de rachat de la totalité de l''entreprise (fonds propres ET dettes).', 6),

  (v_sid, 'Qu''est-ce qu''une vente à découvert (short sale) ?',
   _cfa_arr('["Vendre en urgence des actions dont on est déjà propriétaire", "Emprunter des actions, les vendre, puis les racheter plus tard à un prix espéré inférieur", "Vendre des options d''achat (calls) sur un titre", "Vendre des obligations avant leur maturité"]'), 1,
   'Le short seller emprunte des actions, les vend sur le marché, et espère les racheter moins cher pour les restituer. Son gain maximal est limité à 100 % (si le titre tombe à 0) mais sa perte est théoriquement illimitée.', 7),

  (v_sid, 'Parmi les 5 forces de Porter, laquelle N''est PAS l''une d''entre elles ?',
   _cfa_arr('["Le pouvoir de négociation des fournisseurs", "La menace de produits de substitution", "La capacité d''innovation technologique de l''industrie", "L''intensité de la concurrence entre acteurs existants"]'), 2,
   'Les 5 forces de Porter sont : (1) Concurrence intra-sectorielle, (2) Nouveaux entrants, (3) Produits de substitution, (4) Pouvoir des fournisseurs, (5) Pouvoir des acheteurs. L''innovation n''est pas une force en soi.', 8),

  (v_sid, 'Un ratio Book-to-Market élevé est caractéristique des :',
   _cfa_arr('["Actions de croissance (growth stocks)", "Actions de valeur (value stocks)", "Grandes capitalisations technologiques", "Actions à fort dividende uniquement"]'), 1,
   'B/M = Valeur comptable / Capitalisation boursière. Élevé = P/B bas → action « bon marché » relative à sa valeur comptable → value stock. Les growth stocks ont un P/B élevé (B/M faible).', 9),

  (v_sid, 'Un « marché primaire » est celui où :',
   _cfa_arr('["Les titres existants s''échangent entre investisseurs (bourse)", "De nouveaux titres sont émis pour la première fois par les émetteurs (IPO, augmentation de capital)", "Seules les grandes capitalisations sont cotées", "Les dérivés sur actions sont négociés"]'), 1,
   'Marché primaire : émission de nouveaux titres (l''argent va à l''émetteur). Marché secondaire : échange de titres existants entre investisseurs. La liquidité du secondaire facilite les levées sur le primaire.', 10),

  (v_sid, 'Un ADR (American Depositary Receipt) permet principalement :',
   _cfa_arr('["À des entreprises américaines de lever des fonds à l''étranger", "À des investisseurs américains d''investir dans des sociétés étrangères via un titre coté sur une bourse américaine", "Aux entreprises étrangères d''émettre des obligations en dollars", "Aux fonds américains d''être cotés sur des bourses européennes"]'), 1,
   'Un ADR est un certificat émis par une banque américaine représentant des actions d''une entreprise étrangère. Il simplifie l''investissement transfrontalier pour les investisseurs américains.', 11),

  (v_sid, 'Le ratio EV/EBITDA est préféré au P/E pour comparer des entreprises car il :',
   _cfa_arr('["Est toujours plus faible que le P/E", "Est indépendant de la structure du capital et des politiques d''amortissement et de fiscalité", "Utilise uniquement les flux de trésorerie réels", "Exclut le goodwill de l''analyse"]'), 1,
   'EV/EBITDA neutralise les effets du levier financier (EV inclut la dette), des amortissements (EBITDA les exclut) et de la fiscalité (avant impôts). Idéal pour des comparaisons sectorielles ou inter-pays.', 12),

  (v_sid, 'Un ordre à cours limité (limit order) garantit :',
   _cfa_arr('["L''exécution de l''ordre mais pas le prix", "Le prix d''exécution mais pas l''exécution elle-même", "L''exécution au meilleur prix du marché", "Une exécution partielle uniquement"]'), 1,
   'Un limit order fixe le prix maximum (achat) ou minimum (vente) acceptable. L''ordre n''est exécuté que si ce prix est disponible. Un market order garantit l''exécution mais pas le prix (risque de slippage).', 13),

  (v_sid, 'Le DDM à 3 stades est approprié pour évaluer des entreprises qui :',
   _cfa_arr('["Ont un taux de croissance des dividendes constant à perpétuité", "Traversent successivement des phases de croissance élevée, de transition et de croissance stable", "Ne versent pas de dividendes", "Sont en phase de liquidation"]'), 1,
   'Le modèle à 3 stades est adapté aux entreprises en phase de croissance qui atteindront un régime permanent. Il est plus flexible que le modèle Gordon.', 14),

  (v_sid, 'Dans un indice pondéré par la capitalisation boursière, quel est le principal risque ?',
   _cfa_arr('["Sur-représentation des petites capitalisations", "Concentration excessive dans les titres devenus les plus chers (momentum bias)", "Biais vers les secteurs défensifs", "Impossibilité de répliquer l''indice par des ETF"]'), 1,
   'Un indice cap-weighted s''auto-renforce : les titres qui montent deviennent plus lourds. Lors d''une bulle, l''indice surpondère les actifs surévalués. C''est le principal reproche fait aux indices standard.', 15);

  -- ══════════════════════════════════════════════
  -- TOPIC 7 : DÉRIVÉS
  -- ══════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Instruments Dérivés', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES
  (v_sid, 'Un contrat forward (de gré à gré) se distingue d''un contrat futures car il :',
   _cfa_arr('["Est standardisé et négocié sur une bourse organisée", "Est un accord personnalisé entre deux parties, sans chambre de compensation", "Garantit la livraison physique de l''actif", "Ne peut pas être résilié avant l''échéance"]'), 1,
   'Un forward est OTC (over-the-counter) : personnalisé, sans chambre de compensation, avec risque de contrepartie. Un futures est standardisé, coté en bourse, avec appels de marge quotidiens.', 1),

  (v_sid, 'La valeur initiale d''un contrat forward à la date de mise en place est :',
   _cfa_arr('["Positive pour l''acheteur", "Positive pour le vendeur", "Nulle pour les deux parties", "Égale à la valeur actuelle de l''actif sous-jacent"]'), 2,
   'Le prix forward est fixé de telle sorte que la valeur initiale du contrat est zéro. Aucune des parties ne paie l''autre au départ (contrairement aux options).', 2),

  (v_sid, 'Pour une option d''achat (call) européenne, une hausse de la volatilité implicite du sous-jacent :',
   _cfa_arr('["Réduit la valeur du call", "Augmente la valeur du call", "N''a aucun effet sur la valeur du call", "N''affecte que les calls profondément dans la monnaie"]'), 1,
   'La volatilité augmente la valeur DES DEUX types d''options (call ET put). Plus la volatilité est élevée, plus il est probable que l''option finisse dans la monnaie. Le « vega » mesure cette sensibilité.', 3),

  (v_sid, 'La parité put-call pour des options européennes est :',
   _cfa_arr('["Call + PV(Strike) = Put + Spot", "Call - Put = Spot - PV(Strike)", "Put - Call = Spot + PV(Strike)", "A et B sont équivalentes"]'), 3,
   'C − P = S₀ − PV(X) est la même relation que C + PV(X) = P + S₀. Ces deux formulations sont identiques. Cette relation d''arbitrage lie le prix du call, du put, du spot et du taux sans risque.', 4),

  (v_sid, 'Un « bull call spread » consiste à :',
   _cfa_arr('["Acheter un call de strike bas et vendre un call de strike plus élevé", "Vendre un call de strike bas et acheter un call de strike plus élevé", "Acheter un call et un put de même strike", "Vendre deux calls de strikes différents"]'), 0,
   'Bull call spread : achat du call K₁ (bas) + vente du call K₂ (haut). Coût net = prime K₁ − prime K₂ > 0. Gain max = K₂ − K₁ − coût net. Stratégie haussière à risque limité et gain limité.', 5),

  (v_sid, 'Dans un swap de taux d''intérêt (IRS) où une partie paie le taux fixe et reçoit le taux variable, elle bénéficie si :',
   _cfa_arr('["Les taux d''intérêt baissent", "Les taux d''intérêt montent", "Le spread de crédit s''écarte", "La courbe des taux s''aplatit"]'), 1,
   'Si les taux montent, le taux variable reçu augmente (SOFR + spread), mais le paiement fixe reste constant. Résultat net positif pour le payeur fixe. C''est équivalent à une position longue sur les taux.', 6),

  (v_sid, 'Le « delta » (Δ) d''une option mesure :',
   _cfa_arr('["La sensibilité du prix de l''option aux variations du taux sans risque", "La variation du prix de l''option pour une variation unitaire du prix du sous-jacent", "La sensibilité du prix aux variations de la volatilité", "La décroissance temporelle de la valeur de l''option"]'), 1,
   'Delta ≈ ΔC / ΔS. Pour un call, delta ∈ [0, 1] ; pour un put, delta ∈ [-1, 0]. Un delta de 0,6 signifie que si l''action monte de 1 €, le call monte d''environ 0,60 €.', 7),

  (v_sid, 'Un contrat futures se distingue d''un forward par :',
   _cfa_arr('["L''absence de tout engagement d''achat ou de vente", "L''ajustement quotidien des gains et pertes (mark-to-market) et les appels de marge", "Son utilisation exclusive pour les matières premières", "L''impossibilité de dénouer la position avant l''échéance"]'), 1,
   'Le mark-to-market quotidien des futures élimine l''accumulation du risque de contrepartie. Chaque jour, les pertes/gains sont débités/crédités du compte de marge.', 8),

  (v_sid, 'Un « protective put » consiste à :',
   _cfa_arr('["Vendre un put pour compléter une position longue en actions", "Acheter un put pour protéger une position longue en actions contre une baisse", "Acheter simultanément un call et un put de même strike", "Vendre un call contre une position longue en actions (covered call)"]'), 1,
   'Le protective put = portefeuille assuré. Coût = prime du put. Cette stratégie plafonne la perte. C''est économiquement équivalent à un call synthétique (parité put-call).', 9),

  (v_sid, 'Le « gamma » (Γ) d''une option est maximal lorsque l''option est :',
   _cfa_arr('["Profondément dans la monnaie (deep ITM)", "Profondément hors de la monnaie (deep OTM)", "À la monnaie (ATM) et proche de l''échéance", "Dans le cas d''une option européenne uniquement"]'), 2,
   'Le gamma mesure la variation du delta par rapport au prix du sous-jacent. Il est maximal pour les options ATM proches de l''expiration car le delta peut passer rapidement de 0 à 1 avec un faible mouvement du sous-jacent.', 10),

  (v_sid, 'Le prix forward théorique d''un actif ne versant pas de revenus est :',
   _cfa_arr('["F₀ = S₀ / (1+r)^T", "F₀ = S₀ × (1+r)^T", "F₀ = S₀ × e^(-rT)", "F₀ = S₀ + r × T"]'), 1,
   'F₀ = S₀ × (1+r)^T (capitalisation discrète). C''est le coût de portage : si vous achetez l''actif maintenant et le portez jusqu''en T, le coût est S₀ × (1+r)^T. Tout prix forward différent crée un arbitrage cash-and-carry.', 11),

  (v_sid, 'Le « basis risk » dans une couverture par futures est défini comme :',
   _cfa_arr('["La différence entre le prix futures et le prix forward", "La différence entre le prix spot de l''actif à couvrir et le prix futures utilisé pour la couverture", "Le risque que la chambre de compensation fasse défaut", "La marge initiale déposée pour ouvrir une position"]'), 1,
   'Basis = Prix spot − Prix futures. Le basis risk survient quand les variations du spot et du futures ne sont pas parfaitement corrélées. Une couverture parfaite est rare en pratique.', 12),

  (v_sid, 'Pour un Credit Default Swap (CDS), l''acheteur de protection :',
   _cfa_arr('["Reçoit des primes périodiques et paie en cas de défaut de l''entité de référence", "Paie des primes périodiques et reçoit un paiement en cas d''événement de crédit", "Prend une exposition longue au risque de crédit", "Bénéficie si la qualité de crédit de l''entité s''améliore"]'), 1,
   'L''acheteur de CDS paie le « spread » CDS périodiquement (comme une prime d''assurance) et reçoit en cas d''événement de crédit (défaut, restructuration). C''est une protection contre le risque de défaut.', 13),

  (v_sid, 'La valeur temps (time value) d''une option est toujours :',
   _cfa_arr('["Positive ou nulle tant que l''option n''a pas expiré", "Négative pour les options hors de la monnaie", "Maximale pour les options profondément dans la monnaie", "Égale à la valeur intrinsèque"]'), 0,
   'Prix de l''option = Valeur intrinsèque + Valeur temps. La valeur temps est toujours ≥ 0 car les options ne se vendent jamais en dessous de leur valeur intrinsèque. Elle est maximale pour les options ATM et décroît avec le temps (theta).', 14),

  (v_sid, 'Un investisseur achète un straddle (achat call + achat put de même strike). Sa stratégie est profitable si :',
   _cfa_arr('["Le sous-jacent reste proche du strike", "Le sous-jacent s''éloigne significativement du strike dans l''une ou l''autre direction", "La volatilité implicite diminue fortement", "Les taux d''intérêt baissent"]'), 1,
   'Le straddle coûte la somme des deux primes. Il est profitable si |S_T - K| > prime totale payée. C''est un pari sur la volatilité réalisée : l''investisseur ne sait pas dans quelle direction le marché évoluera, mais parie qu''il bougera beaucoup.', 15);

  -- ══════════════════════════════════════════════
  -- TOPIC 8 : REVENU FIXE
  -- ══════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Revenu Fixe', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES
  (v_sid, 'La relation entre le prix d''une obligation et son rendement exigé (YTM) est :',
   _cfa_arr('["Linéaire et positive", "Inverse et convexe", "Linéaire et négative", "Indépendante pour les obligations à taux variable"]'), 1,
   'Quand le YTM monte, la valeur actuelle des flux futurs diminue → le prix baisse. Cette relation est convexe : les prix baissent moins vite qu''ils ne montent pour un même mouvement de taux.', 1),

  (v_sid, 'Une obligation se négocie « au-dessus du pair » (above par, à premium) quand :',
   _cfa_arr('["Taux de coupon < YTM", "Taux de coupon > YTM", "Taux de coupon = YTM", "Le YTM est négatif"]'), 1,
   'Si le coupon de l''obligation est supérieur au rendement exigé par le marché, les investisseurs sont prêts à payer plus que le pair pour obtenir ce flux avantageux. Elle se négocie donc à prime.', 2),

  (v_sid, 'La duration de Macaulay d''une obligation mesure :',
   _cfa_arr('["La sensibilité du prix aux variations de taux", "La durée de vie moyenne pondérée des flux de trésorerie actualisés", "Le temps nécessaire pour récupérer l''investissement initial", "Le risque de défaut de l''émetteur"]'), 1,
   'Macaulay Duration = Σ[t × PV(CFt)] / Prix. Elle représente le « centre de gravité » des flux de trésorerie dans le temps. La duration modifiée = Macaulay Duration / (1 + YTM) mesure la sensibilité au prix.', 3),

  (v_sid, 'La convexité d''une obligation est utilisée pour :',
   _cfa_arr('["Calculer le YTM exact par itération", "Améliorer l''approximation de la duration pour les grandes variations de taux", "Mesurer le risque de défaut de l''émetteur", "Calculer les intérêts courus depuis le dernier coupon"]'), 1,
   'ΔP/P ≈ −D_mod × Δy + (1/2) × Convexité × (Δy)². La correction de convexité est faible pour les petits Δy mais devient significative pour les grands mouvements.', 4),

  (v_sid, 'Le YTM (Yield to Maturity) est le taux qui égalise :',
   _cfa_arr('["La valeur nominale et le prix de marché", "La valeur actuelle de tous les flux futurs (coupons + remboursement) et le prix de marché", "Le rendement courant et le rendement actuariel", "Le taux du coupon et le taux sans risque"]'), 1,
   'Le YTM est le TRI de l''obligation : le taux unique qui actualise tous les flux futurs pour obtenir exactement le prix de marché. Il suppose que tous les coupons sont réinvestis au même taux.', 5),

  (v_sid, 'Une courbe des taux normale (ascendante) signifie que :',
   _cfa_arr('["Les taux courts sont supérieurs aux taux longs", "Les taux courts sont inférieurs aux taux longs", "Les taux sont identiques quelle que soit la maturité (courbe plate)", "Les taux montent puis redescendent (courbe en bosse)"]'), 1,
   'Une courbe normale reflète une prime de terme positive : les investisseurs exigent un rendement supplémentaire pour immobiliser leur capital plus longtemps. Elle signale généralement une expansion économique attendue.', 6),

  (v_sid, 'Un « callable bond » donne à l''émetteur le droit de :',
   _cfa_arr('["Convertir l''obligation en actions à tout moment", "Rembourser l''obligation par anticipation à un prix de rachat prédéfini", "Modifier le taux du coupon en cours de vie", "Suspendre le paiement des coupons en cas de difficultés"]'), 1,
   'L''émetteur utilise ce droit quand les taux baissent : il rembourse le callable bond et se refinance moins cher. Conséquence : le callable bond a un prix plafonné et offre un YTM plus élevé que l''obligation ordinaire équivalente.', 7),

  (v_sid, 'Le « dirty price » d''une obligation est égal à :',
   _cfa_arr('["La valeur nominale plus les intérêts courus", "Le prix « clean » (prix coté) plus les intérêts courus depuis le dernier coupon", "La valeur actuelle des flux sans les intérêts courus", "Le prix de rachat par l''émetteur"]'), 1,
   'Dirty price = Clean price + Intérêts courus. Le clean price est coté en bourse. Le dirty price est le montant réellement payé. À la date de coupon, dirty = clean.', 8),

  (v_sid, 'Parmi les facteurs suivants, lequel RÉDUIT la duration d''une obligation ?',
   _cfa_arr('["Une maturité plus longue", "Un taux de coupon plus faible", "Un taux de coupon plus élevé", "Un YTM plus faible"]'), 2,
   'Un coupon plus élevé ramène davantage de flux en début de vie → le « centre de gravité » des flux se rapproche → duration réduite. À l''inverse, une maturité longue, un coupon faible et un YTM faible augmentent la duration.', 9),

  (v_sid, 'Le risque de réinvestissement est le plus élevé pour les obligations :',
   _cfa_arr('["Zéro-coupon", "À fort coupon", "À taux variable (floating rate)", "De courte maturité"]'), 1,
   'Les obligations à fort coupon versent beaucoup de cash qui doit être réinvesti. Si les taux baissent, ces réinvestissements se font à un taux inférieur au YTM initial. Les zéro-coupons n''ont pas ce risque.', 10),

  (v_sid, 'Le « spread » de crédit d''une obligation corporate représente :',
   _cfa_arr('["La différence entre son taux de coupon et son YTM", "La différence entre son YTM et le YTM d''une obligation d''État de même maturité", "La différence entre son prix et sa valeur nominale", "La différence entre son rating actuel et son rating historique"]'), 1,
   'Credit spread = YTM corporate − YTM OAT (même maturité). Il rémunère l''investisseur pour le risque de défaut, la liquidité moindre et d''autres facteurs. Un élargissement du spread signale une dégradation de la qualité de crédit perçue.', 11),

  (v_sid, 'Pour une obligation à taux variable (floating rate note), si le SOFR passe de 3 % à 5 %, le coupon :',
   _cfa_arr('["Reste constant à 3 %", "Augmente en proportion de la hausse du SOFR", "Diminue car les taux ont monté", "Reste constant mais le prix de l''obligation baisse"]'), 1,
   'Le coupon d''une FRN = SOFR + spread fixe. Si le SOFR monte, le coupon augmente. Le prix d''une FRN reste proche du pair car le coupon s''ajuste aux nouvelles conditions de marché.', 12),

  (v_sid, 'Les bons du Trésor à court terme (T-bills) appartiennent au :',
   _cfa_arr('["Marché obligataire (marché des capitaux)", "Marché monétaire", "Marché des dérivés de taux", "Marché hypothécaire"]'), 1,
   'Le marché monétaire couvre les instruments de maturité inférieure à 1 an : T-bills, commercial paper, certificats de dépôt, repos. Le marché des capitaux couvre les maturités supérieures à 1 an.', 13),

  (v_sid, 'La duration modifiée d''une obligation est calculée comme :',
   _cfa_arr('["Duration de Macaulay + (1 + YTM)", "Duration de Macaulay / (1 + YTM)", "Duration de Macaulay × (1 + YTM)", "Duration de Macaulay × YTM"]'), 1,
   'D_mod = D_Macaulay / (1 + YTM). Elle s''utilise directement pour estimer la variation de prix : ΔP/P ≈ −D_mod × Δy. La duration de Macaulay est exprimée en années.', 14),

  (v_sid, 'La théorie des anticipations pures de la structure par terme prédit que :',
   _cfa_arr('["Les taux longs incorporent une prime de terme croissante", "Les taux longs reflètent uniquement les anticipations de taux courts futurs, sans prime de terme", "Les investisseurs préfèrent les maturités courtes quelle que soit la prime", "La courbe des taux est toujours ascendante à long terme"]'), 1,
   'Selon la théorie des anticipations pures, le taux long = moyenne géométrique des taux courts futurs anticipés. Aucune prime de terme n''est exigée : les investisseurs sont indifférents entre maturités pour un même rendement espéré.', 15);

  -- ══════════════════════════════════════════════
  -- TOPIC 9 : INVESTISSEMENTS ALTERNATIFS
  -- ══════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Investissements Alternatifs', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES
  (v_sid, 'Un LBO (Leveraged Buyout) consiste à acquérir une entreprise en utilisant :',
   _cfa_arr('["Uniquement les capitaux propres des investisseurs", "Une combinaison de dette importante (60-80 %) et de capitaux propres (20-40 %)", "Des obligations convertibles émises par la cible", "Des actifs de la cible mis en garantie sans apport de dette"]'), 1,
   'Dans un LBO, la dette représente généralement 60 à 80 % du prix d''acquisition. Elle est remboursée grâce aux flux de trésorerie de la cible. Le levier amplifie le TRI des investisseurs mais augmente aussi le risque.', 1),

  (v_sid, 'La performance d''un hedge fund est généralement mesurée en termes de :',
   _cfa_arr('["Surperformance par rapport à un indice boursier", "Rendement absolu (objectif de performance positive quel que soit le marché)", "Rendement relatif à un benchmark obligataire", "Rendement par unité de risque systématique uniquement"]'), 1,
   'Les hedge funds visent un rendement absolu (absolute return), souvent non corrélé aux marchés traditionnels. Contrairement aux fonds classiques, ils ne sont pas évalués relativement à un indice de référence.', 2),

  (v_sid, 'Le « carried interest » dans un fonds de private equity représente :',
   _cfa_arr('["Les frais de gestion annuels (typiquement 2 % des actifs)", "La part des plus-values attribuée au gestionnaire (General Partner), typiquement 20 %", "Les frais de structuration payés lors du closing du fonds", "Les intérêts sur la dette du LBO remboursée par la société cible"]'), 1,
   'Structure classique « 2 et 20 » : 2 % de management fee annuel + 20 % de carried interest (partage des profits au-delà du hurdle rate). Le carried interest aligne les intérêts du GP avec ceux des LPs.', 3),

  (v_sid, 'Le taux de capitalisation (cap rate) en immobilier est calculé comme :',
   _cfa_arr('["Prix d''acquisition / Loyers bruts annuels", "Revenus nets d''exploitation (NOI) / Valeur de l''actif", "Valeur de l''actif / NOI", "Loyers mensuels × 12 / Valeur d''acquisition"]'), 1,
   'Cap rate = NOI / Valeur. Si le cap rate monte (valeur baisse pour un NOI constant), l''actif immobilier se déprécie. Le cap rate est l''équivalent du taux de rendement espéré pour un actif immobilier sans dette.', 4),

  (v_sid, 'La « J-curve » en private equity décrit :',
   _cfa_arr('["La courbe des taux d''intérêt selon les maturités", "La tendance des fonds à afficher des performances négatives en début de vie (frais, investissements), puis positives", "L''évolution en J de la croissance d''un secteur technologique", "La courbe de prix d''une matière première cyclique"]'), 1,
   'En début de vie, un fonds PE paie des frais et investit à des valorisations marquées au coût. Les retours ne viennent que plus tard (cessions). La J-curve illustre cette séquence : TRI négatif puis croissant avec le temps.', 5),

  (v_sid, 'Quelle stratégie de hedge fund cherche à exploiter des écarts de valorisation entre titres similaires ?',
   _cfa_arr('["Long/short equity", "Global macro", "Relative value (arbitrage de valeur relative)", "Distressed securities"]'), 2,
   'La stratégie relative value cherche à profiter des anomalies de prix entre titres liés (paires d''actions, obligations convertibles vs actions). Le risque de marché est souvent couvert, laissant un risque « spread » résiduel.', 6),

  (v_sid, 'La liquidité des investissements en private equity est caractérisée par :',
   _cfa_arr('["Une liquidité quotidienne avec des cotations en bourse", "Des périodes de blocage (lock-up) de 7 à 12 ans avec très peu de liquidité intermédiaire", "Une liquidité similaire aux actions cotées de moyenne capitalisation", "Une garantie de rachat à tout moment par le gestionnaire"]'), 1,
   'Les fonds de PE ont une durée de vie fixe (typiquement 10 ans = 5 ans d''investissement + 5 ans de cession). Les LPs ne peuvent pas demander le rachat de leurs parts.', 7),

  (v_sid, 'Un REIT (Real Estate Investment Trust) permet aux investisseurs de :',
   _cfa_arr('["Détenir directement des propriétés individuelles en copropriété", "Accéder à l''immobilier via un titre coté en bourse, sans gestion directe de biens", "Bénéficier d''un effet de levier immobilier sans endettement personnel", "Éviter tout impôt sur les revenus locatifs perçus"]'), 1,
   'Les REITs cotés offrent liquidité, diversification et revenus réguliers (obligation de distribuer ≥ 90 % des bénéfices). Ils se distinguent des investissements immobiliers directs par leur liquidité et leur accessibilité.', 8),

  (v_sid, 'Les matières premières (commodities) présentent une corrélation avec les actions qui est généralement :',
   _cfa_arr('["Forte et positive", "Faible ou modérément positive, parfois négative, ce qui en fait un diversificateur", "Nulle avec toutes les classes d''actifs sans exception", "Identique à celle de l''or uniquement"]'), 1,
   'La faible corrélation des commodities avec les actions les rend utiles pour la diversification. En outre, elles offrent une protection contre l''inflation.', 9),

  (v_sid, 'Le « hurdle rate » dans un fonds de private equity est :',
   _cfa_arr('["Le taux de rendement minimum que le fonds doit atteindre avant que le GP perçoive le carried interest", "Le taux de frais de gestion annuel appliqué aux actifs sous gestion", "Le coût moyen pondéré de la dette utilisée dans les LBO du fonds", "Le taux de rendement interne (TRI) cible communiqué aux investisseurs"]'), 0,
   'Le hurdle rate (preferred return) est typiquement de 8 %. En dessous, tous les flux vont aux LPs. Au-delà, le GP participe via le carried interest (20 % des profits après récupération du capital et du hurdle).', 10),

  (v_sid, 'La technologie sous-jacente aux crypto-actifs présentée dans le programme CFA est principalement :',
   _cfa_arr('["Les bases de données relationnelles centralisées (SQL)", "La Distributed Ledger Technology (DLT) / blockchain", "Les algorithmes de trading haute fréquence (HFT)", "Les protocoles de messagerie chiffrée de bout en bout"]'), 1,
   'Une blockchain est un type de DLT : un registre distribué, immuable, maintenu par consensus entre nœuds. Elle permet des transactions sans intermédiaire central de confiance.', 11),

  (v_sid, 'La stratégie « distressed debt » consiste à :',
   _cfa_arr('["Vendre à découvert des obligations d''entreprises solides en anticipant une dégradation", "Investir dans des titres d''entreprises en difficulté financière ou en faillite, en espérant une restructuration favorable", "Acheter uniquement des obligations à court terme pour minimiser le risque de crédit", "Utiliser des CDS pour se protéger d''un portefeuille obligataire existant"]'), 1,
   'Les fonds distressed achètent des obligations au rabais (30-50 cents sur le dollar) d''entreprises en difficulté. Si la restructuration est favorable, la récupération peut être bien supérieure au prix d''achat.', 12),

  (v_sid, 'Le TVPI (Total Value to Paid-In capital) d''un fonds de private equity mesure :',
   _cfa_arr('["Uniquement les distributions déjà reçues par les LPs", "Le ratio (distributions reçues + valeur résiduelle du portefeuille) / capital investi", "Le TRI annualisé depuis le lancement du fonds", "Le ratio de levier moyen des sociétés en portefeuille"]'), 1,
   'TVPI = (DPI + RVPI) / 1, où DPI = Distributions to Paid-In et RVPI = Residual Value to Paid-In. Un TVPI > 1 signifie que le fonds a créé de la valeur.', 13),

  (v_sid, 'L''infrastructure comme classe d''actifs se caractérise principalement par :',
   _cfa_arr('["Une forte liquidité et une haute sensibilité au cycle économique", "Des flux de trésorerie stables et prévisibles à long terme, souvent sous régime de concession ou monopole naturel", "Une corrélation élevée avec les marchés actions à court terme", "L''absence totale de barrières à l''entrée"]'), 1,
   'Les actifs d''infrastructure (autoroutes, aéroports, réseaux d''eau, énergie) ont des flux quasi-contractuels, une demande inélastique et une longue durée de vie. Leur faible corrélation avec les marchés financiers les rend attractifs.', 14),

  (v_sid, 'Un « fund of funds » (FoF) en private equity présente comme principal inconvénient :',
   _cfa_arr('["Un accès plus difficile aux meilleurs gestionnaires", "Une double couche de frais (frais du FoF + frais des fonds sous-jacents) qui pèse sur la performance nette", "Une trop grande concentration dans un seul secteur d''activité", "Une transparence insuffisante sur la stratégie globale"]'), 1,
   'Les FoF facturent des frais supplémentaires (1 % + 5-10 % de carried interest) en plus des frais des fonds sous-jacents (2 % + 20 %). Cette double couche peut réduire le TRI net de 2 à 3 % par an.', 15);

  -- ══════════════════════════════════════════════
  -- TOPIC 10 : GESTION DE PORTEFEUILLE
  -- ══════════════════════════════════════════════
  INSERT INTO quiz_sets (title, owner_id, is_official, official_published)
  VALUES ('Gestion de Portefeuille', v_uid, true, true)
  RETURNING id INTO v_sid;

  INSERT INTO quiz_questions (set_id, prompt, choices, correct_index, explanation, position) VALUES
  (v_sid, 'La frontière efficiente de Markowitz représente :',
   _cfa_arr('["L''ensemble des portefeuilles qui maximisent le rendement quel que soit le risque", "L''ensemble des portefeuilles offrant le rendement espéré maximum pour chaque niveau de risque donné", "Les portefeuilles ayant uniquement le risque minimal", "Les portefeuilles avec le ratio de Sharpe le plus élevé uniquement"]'), 1,
   'La frontière efficiente est la partie supérieure de la frontière minimale-variance. Elle domine tous les autres portefeuilles réalisables en rendement/risque.', 1),

  (v_sid, 'La Capital Market Line (CML) représente les combinaisons de :',
   _cfa_arr('["Deux actifs risqués corrélés entre eux", "L''actif sans risque et le portefeuille de marché (tangent portfolio)", "Des actions et des obligations de rating identique", "Des actifs domestiques et internationaux"]'), 1,
   'La CML est la droite partant du taux sans risque et tangente à la frontière efficiente au point appelé « portefeuille de marché ». Tous les portefeuilles efficients pour un investisseur avec accès à l''actif sans risque se situent sur cette droite.', 2),

  (v_sid, 'Selon le CAPM, le rendement espéré d''un actif est uniquement déterminé par :',
   _cfa_arr('["Son risque total (écart-type)", "Son risque systématique (bêta) relatif au marché", "Sa corrélation avec tous les autres actifs du marché", "Son rendement historique des 5 dernières années"]'), 1,
   'Le CAPM : E(Ri) = Rf + βi × (Rm - Rf). Seul le risque systématique (non diversifiable) est rémunéré car le risque idiosyncratique peut être éliminé par la diversification.', 3),

  (v_sid, 'Une action avec un bêta de 1,5 devrait, si le marché monte de 10 %, progresser de :',
   _cfa_arr('["10 %", "1,5 %", "15 %", "6,67 %"]'), 2,
   'ΔRi ≈ βi × ΔRm = 1,5 × 10 % = 15 %. Le bêta amplifie les mouvements du marché. Un titre défensif (β < 1) amplifie moins ; un titre agressif (β > 1) amplifie plus.', 4),

  (v_sid, 'Le ratio de Sharpe mesure :',
   _cfa_arr('["Le rendement excédentaire par unité de risque systématique (bêta)", "Le rendement excédentaire par unité de risque total (écart-type du portefeuille)", "La surperformance ajustée pour la taille du portefeuille", "Le rendement par rapport à un benchmark spécifique"]'), 1,
   'Sharpe = (Rp − Rf) / σp. Il est utile pour comparer des portefeuilles totaux. Le Treynor utilise β au lieu de σ et est plus adapté aux portefeuilles pleinement diversifiés.', 5),

  (v_sid, 'La Security Market Line (SML) trace la relation entre :',
   _cfa_arr('["Le rendement espéré et l''écart-type total (σ)", "Le rendement espéré et le bêta", "Le prix d''un actif et son rendement historique", "La corrélation entre deux actifs et leur rendement espéré"]'), 1,
   'La SML est la représentation graphique du CAPM : E(R) = Rf + β × (Rm - Rf). Tous les actifs correctement valorisés se trouvent sur la SML. Un actif au-dessus est sous-évalué (alpha > 0).', 6),

  (v_sid, 'Un titre situé au-dessus de la Security Market Line (SML) est :',
   _cfa_arr('["Surévalué (son rendement espéré est trop faible)", "Sous-évalué (son rendement espéré dépasse le rendement exigé par le CAPM)", "Correctement valorisé par le marché", "Exempt de risque systématique"]'), 1,
   'Si E(Ri) > Rf + βi × (Rm-Rf), le titre génère un alpha positif. Les investisseurs rationnels l''achèteront, faisant monter son prix jusqu''à ce qu''il rejoigne la SML.', 7),

  (v_sid, 'Un Investment Policy Statement (IPS) doit obligatoirement définir :',
   _cfa_arr('["Uniquement le rendement cible du portefeuille", "Les objectifs de rendement ET les contraintes (liquidité, horizon de placement, réglementation, fiscalité, préférences personnelles)", "La liste des titres à acheter et à vendre", "La méthode d''évaluation de la performance du gérant uniquement"]'), 1,
   'L''IPS est le « cahier des charges » de la gestion. Il documente les objectifs (rendement, risque) et les contraintes LLTLU (Liquidity, Liabilities, Time horizon, Taxes, Legal, Unique).', 8),

  (v_sid, 'Le biais de « disponibilité » (availability bias) se manifeste lorsqu''un investisseur :',
   _cfa_arr('["Maintient des positions perdantes trop longtemps pour éviter de réaliser une perte", "Surpondère les événements récents ou facilement mémorables dans ses décisions", "Fait confiance excessivement à ses propres prévisions", "Imite les décisions des autres investisseurs (comportement moutonnier)"]'), 1,
   'L''availability bias amène à surestimer la probabilité d''événements récents ou médiatisés. C''est un biais cognitif étudié par Tversky et Kahneman.', 9),

  (v_sid, 'Un portefeuille composé de 60 % d''actions (E(R) = 12 %) et 40 % d''obligations (E(R) = 5 %) a un rendement espéré de :',
   _cfa_arr('["8,5 %", "8,8 %", "9,2 %", "10,4 %"]'), 2,
   'E(Rp) = 0,60 × 12 % + 0,40 × 5 % = 7,2 % + 2,0 % = 9,2 %. Le rendement espéré d''un portefeuille est la somme pondérée des rendements espérés de ses composants.', 10),

  (v_sid, 'La Value at Risk (VaR) à 95 % sur 1 jour d''un portefeuille est de 20 000 €. Cela signifie :',
   _cfa_arr('["Le portefeuille ne perdra jamais plus de 20 000 € en 1 jour", "Il y a 5 % de probabilité que la perte dépasse 20 000 € sur 1 jour", "La perte espérée est de 20 000 € sur 1 jour", "La perte maximale possible est de 20 000 €"]'), 1,
   'La VaR est un quantile de la distribution des pertes : il y a (1-95 %) = 5 % de chance que la perte dépasse 20 000 €. La VaR ne dit rien sur l''ampleur des pertes au-delà du seuil.', 11),

  (v_sid, 'L''allocation stratégique d''actifs (SAA) consiste à :',
   _cfa_arr('["Ajuster le portefeuille quotidiennement selon les opportunités de marché", "Définir une allocation cible à long terme alignée sur les objectifs et la tolérance au risque de l''investisseur", "Sélectionner les meilleures actions dans chaque secteur (stock picking)", "Investir uniquement en actifs sans risque lors des phases de volatilité"]'), 1,
   'La SAA est la décision d''allocation « structurelle » : combien en actions, obligations, alternatifs... Elle est revue périodiquement mais reste stable. La gestion tactique (TAA) s''en écarte à court terme.', 12),

  (v_sid, 'Le Treynor ratio est plus adapté que le ratio de Sharpe pour évaluer :',
   _cfa_arr('["Des portefeuilles non diversifiés avec beaucoup de risque idiosyncratique", "Des portefeuilles pleinement diversifiés où le risque non systématique est quasi-nul", "Des fonds alternatifs avec des distributions non normales", "Des obligations à duration très élevée"]'), 1,
   'Treynor = (Rp − Rf) / βp. Si le portefeuille est un sous-portefeuille d''un plus grand ensemble diversifié, seul le risque systématique (β) compte. Le Sharpe est préféré pour évaluer un portefeuille total.', 13),

  (v_sid, 'Le biais de « recency » en finance comportementale conduit les investisseurs à :',
   _cfa_arr('["Surpondérer les performances passées très récentes au détriment de la performance historique longue", "Sous-estimer les probabilités d''événements rares", "Refuser systématiquement toute perte", "Copier les décisions des investisseurs à succès"]'), 0,
   'Le recency bias amène les investisseurs à extrapoler les tendances récentes (ex : acheter après une hausse prolongée, vendre après une baisse récente). C''est l''une des causes des cycles de « buy high, sell low » comportementaux.', 14),

  (v_sid, 'La diversification internationale réduit le risque de portefeuille car :',
   _cfa_arr('["Elle élimine totalement le risque de change", "Elle permet d''inclure des actifs dont les corrélations avec le portefeuille domestique sont inférieures à 1", "Elle garantit un rendement supérieur sur longue période", "Elle élimine le risque systématique mondial"]'), 1,
   'La réduction du risque par diversification dépend de la corrélation entre actifs. Des actifs internationaux dont ρ < 1 avec le portefeuille domestique réduisent la variance globale. En revanche, lors des crises, les corrélations tendent à augmenter.', 15);

END $$;

-- Nettoyage du helper temporaire
DROP FUNCTION IF EXISTS _cfa_arr(text);
