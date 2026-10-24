// Seed script — flashcards "Système" Ethical and Professional Standards.
// 4 paquets de 15 cartes (60), à réviser en une nuit avec le one-pager Ethics :
// Code et Standards I à VII, cas concrets « violation ou pas ? », GIPS.
// Format « trois cases » : À retenir (≤ 12 mots, ==surligné==) / En clair / Piège.
// Chaque carte se comprend seule (cartes mélangées). Phrases en français,
// termes techniques en anglais (curriculum CFA). Vérifié sur Schweser Book 4
// (R89 à R93). Formules au format KaTeX, rendues par components/RichText.tsx.
// Usage: node scripts/seed-flashcards-ethics.mjs
import { pathToFileURL } from "node:url";
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Ethical and Professional Standards (Système)";

export const SETS = [
  {
    title: "Ethics — Flashcards 1/4 (Confiance, Code et Professionalism)",
    cards: [
      [
        "En Ethics (CFA), qu'est-ce que l'ethical conduct ?",
        "Ethical conduct : équilibrer ==self-interest et impact sur les autres==\nEn clair : ethics = croyances partagées sur le bien et le mal. Agir éthiquement, c'est peser l'effet de ses actes sur clients, coworkers, employer et la profession.",
      ],
      [
        "Selon le curriculum CFA, qu'est-ce qui distingue une profession d'un simple métier ?",
        "Profession = savoir expert + ==code of ethics== suivi par les membres\nEn clair : s'y ajoutent un organe qui contrôle les membres, le client d'abord et la continuing education. Le code crée la confiance (trust), sans la garantir.\nPiège : un code fixe un minimum acceptable, pas les best practices.",
      ],
      [
        "Pourquoi la confiance (trust) compte-t-elle plus en investment management que dans la plupart des autres métiers ?",
        "Confiance cruciale : conseil et gestion sont des ==produits intangibles==\nEn clair : durs à évaluer, donc on doit faire confiance. Sans elle : moins de capitaux confiés, cost of capital plus élevé, capital mal alloué, moins de croissance.",
      ],
      [
        "Suitability standard vs fiduciary standard : lequel est le plus exigeant, et que demande chacun ?",
        "Plus exigeant : le ==fiduciary standard==, agir au best interest du client\nEn clair : le suitability standard, moins exigeant, demande seulement que les titres recommandés collent au profil du client (return requirements, risk tolerance).",
      ],
      [
        "Selon le curriculum CFA, qu'est-ce qui pèse le plus sur un comportement non éthique : les traits personnels ou les situational influences ?",
        "Les ==situational influences== pèsent plus que les traits personnels\nEn clair : social pressure, loyauté envers l'employeur, argent, prestige, court terme. Et chacun surestime sa propre éthique (overconfidence).\nPiège : une compliance purement rules-based fait demander « que puis-je faire ? », pas « que dois-je faire ? ».",
      ],
      [
        "Ethics vs law : une action illégale peut-elle être éthique, et une action légale peut-elle être non éthique ?",
        "==Oui, dans les deux sens== : ethics et law ne coïncident pas\nEn clair : illégal mais éthique : whistle-blowing, civil disobedience. Légal mais non éthique : recommander la société d'un proche sans le dire. L'éthique vise plus haut que la loi.",
      ],
      [
        "Quelles sont les 4 étapes de l'ethical decision-making framework du curriculum CFA ?",
        "==Identify · Consider · Decide and act · Reflect==\nEn clair : identifier faits, stakeholders, devoirs, conflicts of interest ; peser situational influences, avis extérieurs, alternatives ; agir ; juger le résultat.\nPiège : l'ethical decision-making framework réduit les conséquences imprévues, sans les supprimer.",
      ],
      [
        "Qu'est-ce qui peut déclencher une enquête du Professional Conduct Program (PCP) de CFA Institute ?",
        "==Self-disclosure== · plainte écrite · médias · proctor · copies d'examen et réseaux sociaux\nEn clair : self-disclosure sur le PCS (Professional Conduct Statement) annuel. Le Board of Governors supervise le PCP ; son Disciplinary Review Committee applique le Code and Standards.",
      ],
      [
        "Quelles sont les issues possibles d'une enquête du Professional Conduct Program (PCP), et que se passe-t-il si le membre refuse la sanction ?",
        "Rien, cautionary letter ou sanction ; refus → ==hearing devant un panel==\nEn clair : PCP fondé sur fairness et confidentiality. Sanctions : public censure, suspension ou revocation de la CFA designation, suspension d'un candidat.\nPiège : pas de suspension pendant l'enquête (explications écrites, entretiens, documents).",
      ],
      [
        "Quelles sont les 6 composantes du CFA Institute Code of Ethics ?",
        "Code of Ethics : integrity, ==clients d'abord==, judgment, pratique pro, marchés, competence\nEn clair : 1 integrity, competence, diligence, respect ; 2 profession et clients avant soi ; 3 reasonable care, independent judgment ; 4 pratique éthique ; 5 marchés intègres ; 6 competence de tous.\nPiège : « distinguish fact from opinion » = Standard V(B).",
      ],
      [
        "Quels sont les 7 Standards of Professional Conduct, de I à VII ?",
        "I à VII : ==Professionalism, Markets, Clients, Employers, Analysis, Conflicts, CFA==\nEn clair : I Professionalism ; II Integrity of Capital Markets ; III Duties to Clients ; IV Duties to Employers ; V Investment Analysis ; VI Conflicts of Interest ; VII CFA Institute Member or Candidate.",
      ],
      [
        "En Ethics, un bon motif (« c'était pour aider le client ») peut-il éviter la violation d'un Standard ?",
        "==Non== : si un Standard interdit l'acte, le motif ne change rien\nEn clair : exception : les Standards où l'intention fait la règle, comme II(B) Market Manipulation (intent to mislead). Une même action peut violer plusieurs Standards.",
      ],
      [
        "Standard I(A) Knowledge of the Law : un membre vit dans un pays et travaille dans un autre. Si ces deux lois et le Code and Standards divergent, quelle règle suit-il ?",
        "I(A) : appliquer ==la règle la plus stricte== des trois\nEn clair : loi du pays de résidence, loi du pays d'activité, Code and Standards. Si la loi est moins stricte que le Code (pas de loi sur l'insider trading), le Code s'applique.\nPiège : imiter la signature d'un client, même « pour gagner du temps », viole aussi I(A).",
      ],
      [
        "Standard I(A) Knowledge of the Law : un membre découvre qu'un collègue viole la loi. Que doit-il faire, et doit-il le dénoncer à CFA Institute ?",
        "I(A) : signaler en interne, sinon ==se dissocier== ; dénoncer n'est pas exigé\nEn clair : d'abord supervisor ou compliance ; démission en dernier recours. Autorités : seulement si la loi l'impose ; PCP (Professional Conduct Program) : « strongly encouraged ».\nPiège : rester passif n'est pas se dissocier ; garder une trace écrite.",
      ],
      [
        "Standard I(B) Independence and Objectivity : cadeau d'un client vs cadeau d'un broker ou d'un émetteur, que faut-il faire ?",
        "I(B) : client → ==disclose à l'employeur== ; broker, émetteur → rien qui compromette l'objectivité\nEn clair : cadeau client : déclaré avant si possible, sinon après. Entertainment normal = OK, « lavish » = violation.\nPiège : « token items (valeur symbolique) seulement » = politique recommandée aux firmes, pas la règle.",
      ],
    ],
  },
  {
    title: "Ethics — Flashcards 2/4 (Professionalism, marchés, loyauté client)",
    cards: [
      [
        "Standard I(B) Independence and Objectivity : un analyste peut-il rédiger de l'issuer-paid research (recherche payée par la société étudiée) ?",
        "Oui, si ==flat fee non lié aux conclusions== et paiement disclosed\nEn clair : I(B) est violé si la rémunération dépend de la recommendation ou de l'effet sur le cours, ou si le paiement par l'émetteur est caché.\nPiège : céder à la pression de l'investment banking pour changer une recommendation viole aussi I(B).",
      ],
      [
        "Standard I(B) : un gérant fait un don à la campagne d'un élu pour décrocher la gestion d'un fonds de pension public. Violation ?",
        "==Violation de I(B)== Independence and Objectivity\nEn clair : I(B) interdit d'offrir, de solliciter ou d'accepter un avantage qui peut compromettre l'objectivité, la sienne ou celle d'autrui (ici l'élu qui attribue le mandat).",
      ],
      [
        "Standard I(C) Misrepresentation : faut-il citer la source d'un tableau de taux tiré du site du U.S. Treasury ? Et le rapport d'un autre analyste ?",
        "Treasury : ==pas besoin de citer==. Autre analyste : citer, sinon plagiarism\nEn clair : sous I(C), une donnée factuelle d'une source statistique reconnue n'a pas à être citée ; analyses, modèles ou graphiques d'autrui, si, même résumés.\nPiège : modèle d'un collègue parti : on peut omettre son nom, sans se dire seul auteur.",
      ],
      [
        "Standard I(C) : un gérant écrit « notre modèle battra le S&P 500 de 2 à 4 % par an », car il l'a fait 3 ans de suite. Est-ce permis ?",
        "==Non== : garantie de rendement implicite, donc misrepresentation (I(C))\nEn clair : on ne garantit un rendement que s'il existe une vraie garantie (État, institution financière). Aussi interdit sous I(C) : un benchmark non comparable à la stratégie.",
      ],
      [
        "Standard I(C) Misrepresentation : pendant un appel d'offres, un gérant clé cité dans la proposition quitte la firme. Que doit faire le membre ?",
        "==Prévenir le prospect== : se taire serait une misrepresentation par omission\nEn clair : I(C) Misrepresentation couvre aussi l'omission d'une information utile et les données sélectives présentées pour tromper.",
      ],
      [
        "Standard I(D) Misconduct : un analyste est arrêté lors d'une action de civil disobedience pour défendre ses convictions. Viole-t-il I(D) ?",
        "==Pas forcément== : l'acte ne ternit ni son honnêteté ni sa competence\nEn clair : I(D) vise dishonesty, fraud, deceit au travail, et les actes, même privés, qui ternissent honnêteté, intégrité ou competence. Négliger sa due diligence = misconduct.\nPiège : I(D) ne sert pas à régler un conflit personnel ou politique.",
      ],
      [
        "Standard I(E) Competence : un analyste accepte un poste de superviseur sans se former à ce nouveau rôle. Violation ?",
        "==Violation de I(E)== : un nouveau rôle exige d'en acquérir les compétences\nEn clair : I(E) Competence = avoir et garder les compétences du poste. La continuing education est recommandée, pas exigée.\nPiège : un mauvais résultat ne prouve pas l'incompétence.",
      ],
      [
        "Standard II(A) Material Nonpublic Information : quand une information est-elle « material » et quand est-elle « nonpublic » ?",
        "Material : ==ferait bouger le cours==. Nonpublic : pas encore diffusée au marché\nEn clair : material = effet sur le prix, ou un investisseur raisonnable la voudrait. II(A) : ni agir ni faire agir, y compris via fonds, options ou swaps.\nPiège : un analyst conference call ne rend pas l'info publique (selective disclosure).",
      ],
      [
        "Qu'est-ce que la mosaic theory (Standard II(A) Material Nonpublic Information) ?",
        "Mosaic theory : infos publiques + ==nonpublic non material== → pas de violation\nEn clair : conclure par une analyse fine de ces infos est permis sous II(A), même si la conclusion a une grande valeur.\nPiège : une seule info material nonpublic dans le lot suffit à violer II(A).",
      ],
      [
        "Standard II(A) : un analyste surprend l'appel téléphonique d'un ami et en déduit une takeover offer imminente sur une société. Peut-il acheter ?",
        "==Non== : info material nonpublic, acheter violerait II(A)\nEn clair : peu importe comment l'info a été obtenue. Bonne réaction : ne pas agir, ne pas faire agir proches ou clients, en parler à la compliance.\nPiège : une info reçue pour une mission (ex. investment banking) ne sert qu'à cette mission.",
      ],
      [
        "Standard II(A) : quelles procédures une firme met-elle en place pour éviter l'usage de material nonpublic information ?",
        "Un ==firewall==, avec watch, restricted et rumor lists\nEn clair : sous II(A), la compliance filtre les échanges entre services et revoit les trades du personnel ; le proprietary trading est surveillé.\nPiège : pas de gel total du proprietary trading (signal) ; seulement la contrepartie des unsolicited customer trades.",
      ],
      [
        "Standard II(B) Market Manipulation : qu'est-ce qui est interdit, et une grosse transaction qui fait bouger le cours est-elle une violation ?",
        "II(B) exige l'==intent to mislead== ; sans intention, pas de violation\nEn clair : interdit : fausser prix ou volumes, ex. fausses rumeurs, pump and dump, deux filiales qui s'échangent des titres pour simuler de la liquidité.\nPiège : acheter une action et vendre des puts dessus (arbitrage) n'est pas une manipulation.",
      ],
      [
        "Standard III(A) Loyalty, Prudence, and Care : envers qui le gérant d'un pension fund a-t-il son devoir de loyauté ?",
        "Envers ==les bénéficiaires du pension fund==, pas la direction qui l'a mandaté\nEn clair : sous III(A), le client est celui dont on gère l'argent (les bénéficiaires), pas le sponsor. Client avant employeur et soi ; prudence d'un pro avisé. Relevés au moins trimestriels.",
      ],
      [
        "Standard III(A) Loyalty, Prudence, and Care : à qui appartiennent les soft dollars (client brokerage), et à quoi le gérant peut-il les utiliser ?",
        "Soft dollars : ==propriété du client==, pour de la recherche utile au client\nEn clair : sous III(A), le client brokerage ne paie que de la recherche qui sert les décisions d'investissement du client. Payer avec lui loyer, salaires ou bureau de la firme est une violation.",
      ],
      [
        "Standard III(A) Loyalty, Prudence, and Care : un gérant doit-il voter tous les proxies des actions qu'il gère pour ses clients ?",
        "==Non== : il vote quand c'est utile au client, après analyse cost-benefit\nEn clair : sous III(A), les proxies ont une valeur économique pour le client. Best practice : une proxy voting policy écrite, communiquée aux clients.",
      ],
    ],
  },
  {
    title: "Ethics — Flashcards 3/4 (Devoirs envers clients et employeur)",
    cards: [
      [
        "Standard III(A) : une firme ajoute dans ses contrats une clause qui dispense ses conseillers d'agir au mieux du client. Est-ce permis ?",
        "==Non== : pas d'opt-out des Standards, violation de III(A)\nEn clair : III(A) Loyalty, Prudence, and Care. On peut annoncer des limites réelles du service (ne proposer que les produits maison), pas renoncer au devoir de loyauté.",
      ],
      [
        "Standard III(A) Loyalty, Prudence, and Care : un gérant reste un week-end de plus lors d'un voyage pour un client ; le vol moins cher baisse le coût total malgré l'hôtel. Peut-il tout facturer au client ?",
        "==Oui== : coût total plus bas, donc pas de violation de III(A)\nEn clair : III(A) Loyalty, Prudence, and Care est violé si on facture au client des frais qui servent d'autres clients ou ses loisirs personnels.",
      ],
      [
        "Standard III(B) Fair Dealing : traiter les clients « fairly » veut-il dire les traiter « equally » ?",
        "Non : ==fairly ≠ equally==, mais aucun client n'est désavantagé\nEn clair : III(B) : recommendation diffusée en même temps à tous les clients concernés ; service premium permis s'il est disclosed et ouvert à tous ceux qui paient.\nPiège : la firme qui trade pour elle avant que les clients aient pu agir viole III(B).",
      ],
      [
        "Standard III(B) : une firme obtient 6 000 actions d'une IPO (initial public offering) sursouscrite. Ses clients A, B et C en demandent 6 000, 3 000 et 3 000 ; le gérant 1 000 pour lui. Allocation ?",
        "==Pro rata 50 %== : A 3000, B 1500, C 1500, gérant 0\nEn clair : demandes des clients = 12 000, donc 6 000 / 12 000 = 50 %. Se servir dans une IPO sursouscrite viole III(B) Fair Dealing et I(B).",
      ],
      [
        "Standard III(C) Suitability : que doit faire un conseiller avant de recommander un investissement à un client ?",
        "Une ==reasonable inquiry==, consignée dans un IPS écrit et mis à jour\nEn clair : III(C) : expérience, objectifs de risque et rendement, contraintes ; IPS = investment policy statement. Juger sur le portefeuille total.\nPiège : un gérant de fonds à mandat (index, style) suit le mandat, pas le profil de chaque porteur.",
      ],
      [
        "Standard III(C) Suitability : un client demande un achat inadapté à son IPS (investment policy statement). Le gérant doit-il refuser ou exécuter ?",
        "D'abord ==expliquer au client== pourquoi le trade est inadapté\nEn clair : III(C). Impact faible : suivre la politique de la firme, le client confirme avoir compris. Impact material : mettre à jour l'IPS, sinon compte séparé client-directed.",
      ],
      [
        "Standard III(D) Performance Presentation : quelles pratiques de présentation de performance sont des violations ?",
        "III(D) : tout ce qui n'est pas ==fair, accurate, complete==\nEn clair : ex. : meilleur compte seul, comptes fermés exclus, suggérer qu'on refera le passé. Best practices : GIPS (Global Investment Performance Standards), gross ou net of fees précisé.\nPiège : présentation brève permise si elle se dit limitée, détail fourni sur demande.",
      ],
      [
        "Standard III(D) : un fonds lancé l'an dernier présente un track record de 10 ans tiré de comptes séparés gérés avant sa création. Violation ?",
        "==Violation de III(D)== : le fonds paraît plus ancien qu'il n'est\nEn clair : III(D) Performance Presentation exige une performance fair, accurate, complete : vraies dates et nature réelle des comptes utilisés.",
      ],
      [
        "Standard III(E) Preservation of Confidentiality : quels clients sont protégés, et quelles sont les exceptions ?",
        "Clients ==actuels, anciens et prospects== ; sauf illégalité, loi ou accord client\nEn clair : sous III(E), coopérer avec une enquête du PCP (Professional Conduct Program) est permis ; copier des données clients sur un ordinateur perso mal protégé est une violation.\nPiège : activité illégale du client : n'informer que les autorités compétentes, aucun tiers.",
      ],
      [
        "Standard IV(A) Loyalty (envers l'employeur) : qu'est-ce qui est interdit et permis quand on prépare son départ vers un concurrent ?",
        "Préparer son départ : permis. ==Démarcher ou copier les clients : interdit==\nEn clair : IV(A) court jusqu'au départ effectif : préparer hors du temps et des moyens de l'employeur. Records = propriété de la firme ; l'expérience se réutilise.\nPiège : parti, recontacter ses ex-clients (mémoire, infos publiques) : permis, sauf non-compete agreement.",
      ],
      [
        "Standard IV(A) Loyalty : un membre veut gérer bénévolement le pension fund de sa ville, avec une place de parking gratuite en échange. Que doit-il faire ?",
        "Décrire l'activité à l'employeur et ==obtenir son accord écrit avant==\nEn clair : IV(A) Loyalty : nature, durée, rémunération. Même bénévole, une activité qui concurrence l'employeur et rapporte un avantage (le parking) exige ce consentement.",
      ],
      [
        "Standard IV(A) Loyalty : un membre copie des dossiers clients pour prouver au régulateur que sa firme vend des produits abusifs. Viole-t-il son devoir envers l'employeur ?",
        "==Non== : protéger les clients, sans gain personnel, est permis\nEn clair : IV(A) Loyalty cède quand on agit pour les clients ou l'intégrité du marché, sans profit perso (whistleblowing).",
      ],
      [
        "Standard IV(B) Additional Compensation Arrangements : un client offre un bonus si son compte bat l'indice l'an prochain. Que faire ?",
        "Obtenir le ==consentement écrit de toutes les parties== avant d'accepter\nEn clair : IV(B) vise le bonus lié à la performance future ; un e-mail de l'employeur suffit comme accord écrit.\nPiège : un bonus pour la performance passée est un cadeau : simple disclosure à l'employeur (I(B)).",
      ],
      [
        "Standard IV(C) Responsibilities of Supervisors : que doit faire un superviseur si le système de compliance de sa firme est inadéquat ?",
        "==Décliner par écrit la supervision== tant que la compliance reste inadéquate\nEn clair : IV(C) : efforts raisonnables pour prévenir et détecter les violations. Il alerte la direction ; bonnes procédures = écrites, compliance officer, formation.",
      ],
      [
        "Standard IV(C) Responsibilities of Supervisors : un superviseur découvre qu'un employé enfreint les règles. Un simple avertissement suffit-il ?",
        "==Non== : enquêter vite et restreindre ou surveiller l'employé fautif\nEn clair : IV(C) exige d'empêcher la récidive pendant l'enquête. Déléguer la supervision ne retire pas la responsabilité.\nPiège : accepter le titre de CCO (chief compliance officer) sans pouvoir d'agir viole IV(C) : il fallait refuser.",
      ],
    ],
  },
  {
    title: "Ethics — Flashcards 4/4 (Analyse, conflits, titre CFA et GIPS)",
    cards: [
      [
        "Standard V(A) Diligence and Reasonable Basis : que doit vérifier un analyste qui utilise de la third-party research ?",
        "V(A) : vérifier qu'elle est ==sound== (fiable), c'est exigé\nEn clair : critères : hypothèses, rigueur, timeliness (fraîcheur), objectivité et indépendance. Une politique de revue périodique de la recherche externe est seulement recommandée.",
      ],
      [
        "Standard V(A) : un analyste recommande une action sans analyse sérieuse, et une collègue reprend sa recommendation dans son propre rapport. Qui viole V(A) ?",
        "==Les deux== violent V(A) : aucune reasonable and adequate basis\nEn clair : reprendre l'analyse bâclée d'un collègue ne crée pas de base. Rumeur ou tuyau d'un proche ne sont pas une reasonable basis non plus.",
      ],
      [
        "Standard V(B) Communication with Clients and Prospective Clients : que faut-il divulguer aux clients et prospects ?",
        "Services et coûts · process et ses changements · ==limites et risques==\nEn clair : V(B) : risques comme liquidity et capacity, limites des modèles quantitatifs. Il faut aussi séparer fact et opinion : une projection n'est pas un fait.\nPiège : présenter des scénarios tous dans le sens de sa thèse viole V(B).",
      ],
      [
        "Standard V(C) Record Retention : à qui appartiennent les records, et combien de temps les garder sans règle locale ?",
        "Records : ==propriété de la firme== ; 7 ans minimum sans autre règle\nEn clair : V(C) : e-mails et SMS clients = records ; tenir à jour les profils clients écrits. 7 ans = recommandation, sans loi ni politique interne.\nPiège : nouvel employeur : refaire la base d'une recherche via sources publiques, ni de mémoire ni d'anciennes copies.",
      ],
      [
        "Standard VI(A) Avoid or Disclose Conflicts : comment traiter un conflit d'intérêts, et quels sont les cas typiques ?",
        "==Éviter== le conflit, sinon le divulguer : prominent et en plain language\nEn clair : VI(A), envers clients, prospects, employeur. Cas typiques : actions détenues, mandat d'administrateur, market making, bonus ou commissions.\nPiège : des actions en trust, invendables mais avec droit de vote = beneficial ownership à divulguer.",
      ],
      [
        "Standard VI(B) Priority of Transactions : dans quel ordre passent les transactions, et un trade personnel contraire à la recommendation est-il permis ?",
        "VI(B) : ==clients, puis employeur, puis soi==\nEn clair : VI(B) interdit le front running et de prévenir des proches avant un gros ordre. Compte d'un proche client = client normal. Firme : blackout, preclearance, duplicate confirmations.\nPiège : un trade perso contraire à sa recommendation est permis s'il ne lèse aucun client.",
      ],
      [
        "Standard VI(B) : un gérant alloue ses block trades après la clôture, les gagnants à son compte perso, les perdants aux gros comptes clients. Violation ?",
        "==Violation de VI(B)==, et aussi de III(B) Fair Dealing\nEn clair : VI(B) Priority of Transactions : le gérant se sert avant ses clients. Bonne pratique : même prix d'exécution pour tous les comptes du block trade, partiels au pro rata.",
      ],
      [
        "Standard VI(C) Referral Fees : que faut-il divulguer quand on reçoit ou verse une contrepartie pour recommander un service ?",
        "Divulguer ==toute contrepartie== à l'employeur, aux clients et aux prospects\nEn clair : VI(C) : argent, recherche, cadeaux, reçus ou versés, divulgués avant l'entrée en relation : le client juge le vrai coût et la partialité possible.\nPiège : récompenser ses clients apporteurs (fêtes, remises, cartes cadeaux) = referral fees à divulguer.",
      ],
      [
        "Standard VII(A) Conduct as Participants in CFA Institute Programs : un candidat peut-il écrire en ligne que l'examen n'avait aucune question d'Alternative Investments ?",
        "==Non== : révéler les topics testés ou non viole VII(A)\nEn clair : permis : critiquer CFA Institute ou dire que l'examen était difficile. Interdit aussi : tricher, enfreindre les règles d'examen, mentir sur le PCS (Professional Conduct Statement).",
      ],
      [
        "Standard VII(B) : un charterholder écrit « J'ai réussi les 3 niveaux du premier coup, mes clients auront donc de meilleures performances ». Violation ?",
        "Réussite du premier coup : permis ; ==promettre mieux grâce au titre== : violation\nEn clair : VII(B) interdit aussi de parler de « CFA partiel ». Garder le titre : PCS (Professional Conduct Statement) et cotisation chaque année.\nPiège : « CFA » est un adjectif : CFA charterholder, jamais « a CFA ».",
      ],
      [
        "Pourquoi les GIPS (Global Investment Performance Standards) existent-ils, et qui peut s'en réclamer ?",
        "Comparer sans ==cherry-picking== ; seules les firmes gérant des actifs pour autrui\nEn clair : utiles aux clients, prospects, investisseurs, oversight bodies. Volontaires, tout ou rien, firmwide ; firm = entité présentée aux clients, toutes implantations.\nPiège : un éditeur de logiciel peut seulement « endorse » les GIPS, pas claim compliance.",
      ],
      [
        "Quelles sont les 8 sections des GIPS (Global Investment Performance Standards) for Firms ?",
        "Fundamentals · Input Data · Composites · ==4 rapports de return== · Advertising\nEn clair : 1 Fundamentals of Compliance ; 2 Input Data and Calculation Methodology ; 3 Composite and Pooled Fund Maintenance ; sections 4 à 7 : rapports time-weighted et money-weighted ; 8 Advertising.",
      ],
      [
        "GIPS (Global Investment Performance Standards) : qu'est-ce qu'un composite, et quels portefeuilles doit-il contenir ?",
        "Composite : portefeuilles discretionary de ==même stratégie==, actuels et passés\nEn clair : tout portefeuille fee-paying discretionary va dans au moins un composite, choisi ex ante (avant sa performance).\nPiège : restrictions client bloquant la stratégie : la firme peut classer le portefeuille nondiscretionary, hors composite.",
      ],
      [
        "GIPS (Global Investment Performance Standards) : un composite contient A (USD 80 millions en début de période, return 10 %) et B (USD 20 millions, return 5 %). Quel est le return du composite ?",
        "==9 %==, asset-weighted (pas la moyenne simple de 7,5 %)\nEn clair : $R = \\sum_i w_i R_i$, où $w_i$ = poids en market value de début de période : 0,8 × 10 % + 0,2 × 5 % = 8 % + 1 % = 9 %.",
      ],
      [
        "GIPS (Global Investment Performance Standards) : la verification est-elle obligatoire, et sur quel périmètre porte-t-elle ?",
        "==Recommandée, pas obligatoire== ; si faite : tiers indépendant, toute la firme\nEn clair : le verifier atteste, sur toute la firme, que la construction des composites respecte les GIPS et que les process de calcul, de données et de présentation sont conformes.\nPiège : jamais de verification sur un seul composite.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "flashcards");
  console.log("Flashcards — Système Ethical and Professional Standards (4 sets × 15)...");
  const total = await seedFlashcardSets({ ownerId, folderId, sets: SETS, oldTitles: [] });
  console.log(`\n✅ Terminé. ${total} cartes ajoutées.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("❌ Erreur:", e);
    process.exit(1);
  });
}
