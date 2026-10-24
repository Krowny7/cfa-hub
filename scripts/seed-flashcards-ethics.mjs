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
        "Ethical conduct : équilibrer ==self-interest et impact sur les autres==\nEn clair : Ethics désigne des croyances partagées sur le bien et le mal. Agir éthiquement, c'est peser l'effet de ses actes sur les stakeholders : clients, coworkers, employer, profession.",
      ],
      [
        "Selon le curriculum CFA, qu'est-ce qui distingue une profession d'un simple métier ?",
        "Profession = savoir expert + ==code of ethics== suivi par les membres\nEn clair : Une profession a aussi un organe qui contrôle ses membres, place le client d'abord et encourage la continuing education. Son code crée la confiance (trust), sans la garantir.\nPiège : un code fixe un minimum acceptable, pas les best practices.",
      ],
      [
        "Pourquoi la confiance (trust) compte-t-elle plus en investment management que dans la plupart des autres métiers ?",
        "Confiance cruciale : conseil et gestion sont des ==produits intangibles==\nEn clair : Leur qualité est difficile à juger, le client doit donc faire confiance. Sans elle, on confie moins de capitaux, le cost of capital monte et le capital est mal alloué.",
      ],
      [
        "Suitability standard vs fiduciary standard : lequel est le plus exigeant, et que demande chacun ?",
        "Suitability : ==titres adaptés au profil== · Fiduciary : ==best interest==, plus exigeant\nEn clair : Le suitability standard vérifie que les titres recommandés collent aux return requirements et à la risk tolerance du client. Le fiduciary standard impose d'agir au best interest du client.",
      ],
      [
        "Selon le curriculum CFA, qu'est-ce qui pèse le plus sur un comportement non éthique : les traits personnels ou les situational influences ?",
        "Les ==situational influences== pèsent plus que les traits personnels\nEn clair : Social pressure, loyauté à l'employeur, argent, prestige et court terme poussent à mal agir. Chacun surestime aussi sa propre éthique.\nPiège : une compliance purement rules-based fait demander « que puis-je faire ? », pas « que dois-je faire ? ».",
      ],
      [
        "Ethics vs law : une action illégale peut-elle être éthique, et une action légale peut-elle être non éthique ?",
        "Illégal mais éthique : ==possible== · Légal mais non éthique : ==possible==\nEn clair : Le whistle-blowing ou la civil disobedience peuvent être illégaux mais éthiques. Recommander la société d'un proche sans le dire peut être légal mais non éthique.\nPiège : l'éthique vise plus haut que la loi et demande plus de jugement.",
      ],
      [
        "Quelles sont les 4 étapes de l'ethical decision-making framework du curriculum CFA ?",
        "==Identify== · ==Consider== · ==Decide and act== · ==Reflect==\nEn clair : On identifie faits, stakeholders, devoirs et conflicts of interest. On pèse situational influences, avis extérieurs et alternatives, on agit, puis on juge le résultat.\nPiège : le framework réduit les conséquences imprévues, sans les supprimer.",
      ],
      [
        "Qu'est-ce qui peut déclencher une enquête du Professional Conduct Program (PCP) de CFA Institute ?",
        "==Self-disclosure== · ==Plainte écrite== · ==Médias== · Signalement du ==proctor== · ==Copies d'examen et social media==\nEn clair : La self-disclosure se fait sur le PCS (Professional Conduct Statement) annuel. Le Board of Governors supervise le PCP et son Disciplinary Review Committee fait appliquer le Code and Standards.",
      ],
      [
        "Quelles sont les issues possibles d'une enquête du Professional Conduct Program (PCP), et que se passe-t-il si le membre refuse la sanction ?",
        "Issues : ==rien, cautionary letter, sanction== · Refus : ==hearing devant un panel==\nEn clair : Le PCP repose sur fairness et confidentiality. Sanctions possibles : public censure, suspension ou revocation de la CFA designation.\nPiège : pas d'amende (fine) chez CFA Institute, mais refuser de coopérer peut valoir une suspension.",
      ],
      [
        "Quelles sont les 6 composantes du CFA Institute Code of Ethics ?",
        "Code of Ethics : integrity, ==clients d'abord==, judgment, pratique pro, marchés, competence\nEn clair : Le Code demande integrity, clients et profession avant soi, independent judgment, pratique éthique, marchés intègres et competence de tous.\nPiège : « distinguish fact from opinion » est le Standard V(B), pas le Code.",
      ],
      [
        "Quels sont les 7 Standards of Professional Conduct, de I à VII ?",
        "I à VII : ==Professionalism, Markets, Clients, Employers, Analysis, Conflicts, CFA==\nEn clair : I Professionalism, II Integrity of Capital Markets, III Duties to Clients, IV Duties to Employers, V Investment Analysis, VI Conflicts of Interest, VII CFA Institute Member or Candidate.",
      ],
      [
        "En Ethics, un bon motif (« c'était pour aider le client ») peut-il éviter la violation d'un Standard ?",
        "==Non== : si un Standard interdit l'acte, le motif ne change rien\nEn clair : La seule exception concerne les Standards où l'intention fait la règle, comme II(B) Market Manipulation (intent to mislead). Une même action peut aussi violer plusieurs Standards.",
      ],
      [
        "Standard I(A) Knowledge of the Law : un membre vit dans un pays et travaille dans un autre. Si ces deux lois et le Code and Standards divergent, quelle règle suit-il ?",
        "I(A) : appliquer ==la règle la plus stricte== des trois\nEn clair : On compare loi du pays de résidence, loi du pays d'activité et Code and Standards. Si la loi est moins stricte (pas de loi sur l'insider trading), le Code s'applique.\nPiège : imiter la signature d'un client, même pour gagner du temps, viole aussi I(A).",
      ],
      [
        "Standard I(A) Knowledge of the Law : un membre découvre qu'un collègue viole la loi. Que doit-il faire, et doit-il le dénoncer à CFA Institute ?",
        "D'abord : ==alerter supervisor ou compliance== · Sinon : ==se dissocier== · Dénoncer au PCP : ==pas exigé==\nEn clair : On documente tout et on démissionne en dernier recours. Signaler au PCP (Professional Conduct Program) est « strongly encouraged » ; aux autorités, si la loi l'exige.\nPiège : rester passif n'est pas se dissocier.",
      ],
      [
        "Standard I(B) Independence and Objectivity : cadeau d'un client vs cadeau d'un broker ou d'un émetteur, que faut-il faire ?",
        "Client : ==disclose à l'employeur== · Broker/émetteur : ==refuser si objectivité menacée==\nEn clair : Un cadeau de client menace moins l'objectivité : on le déclare avant si possible, sinon après. Un entertainment « lavish » est une violation.\nPiège : « token items seulement » est une politique recommandée aux firmes, pas la règle.",
      ],
    ],
  },
  {
    title: "Ethics — Flashcards 2/4 (Professionalism, marchés, loyauté client)",
    cards: [
      [
        "Standard I(B) Independence and Objectivity : un analyste peut-il rédiger de l'issuer-paid research (recherche payée par la société étudiée) ?",
        "Oui, si ==flat fee non lié aux conclusions== et paiement disclosed\nEn clair : Le Standard I(B) est violé si la rémunération dépend de la recommendation ou de l'effet sur le cours, ou si le paiement par l'émetteur est caché.\nPiège : céder à la pression de l'investment banking pour changer une recommendation viole aussi I(B).",
      ],
      [
        "Standard I(B) : un gérant fait un don à la campagne d'un élu pour décrocher la gestion d'un fonds de pension public. Violation ?",
        "==Violation de I(B)== Independence and Objectivity\nEn clair : Le Standard I(B) interdit d'offrir, de solliciter ou d'accepter un avantage qui peut compromettre l'objectivité, la sienne ou celle d'autrui (ici l'élu qui attribue le mandat).",
      ],
      [
        "Standard I(C) Misrepresentation : faut-il citer la source d'un tableau de taux tiré du site du U.S. Treasury ? Et le rapport d'un autre analyste ?",
        "Treasury : ==pas de citation requise== · Autre analyste : ==citer, sinon plagiarism==\nEn clair : Une donnée factuelle d'une source statistique reconnue n'a pas à être citée. Les analyses, modèles ou graphiques d'autrui doivent l'être, même résumés.\nPiège : on peut omettre le nom d'un collègue parti, sans se dire seul auteur.",
      ],
      [
        "Standard I(C) : un gérant écrit « notre modèle battra le S&P 500 de 2 à 4 % par an », car il l'a fait 3 ans de suite. Est-ce permis ?",
        "==Non== : garantie de rendement implicite, donc misrepresentation (I(C))\nEn clair : On ne garantit un rendement que s'il existe une vraie garantie (État, institution financière). Choisir un benchmark non comparable à la stratégie viole aussi I(C).",
      ],
      [
        "Standard I(C) Misrepresentation : pendant un appel d'offres, un gérant clé cité dans la proposition quitte la firme. Que doit faire le membre ?",
        "==Prévenir le prospect== : se taire serait une misrepresentation par omission\nEn clair : Le Standard I(C) Misrepresentation couvre aussi l'omission d'une information utile et les données sélectives présentées pour tromper.",
      ],
      [
        "Standard I(D) Misconduct : un analyste est arrêté lors d'une action de civil disobedience pour défendre ses convictions. Viole-t-il I(D) ?",
        "==Pas forcément== : l'acte ne ternit ni son honnêteté ni sa competence\nEn clair : I(D) vise dishonesty, fraud et deceit au travail, et tout acte, même privé, qui ternit honnêteté ou competence. Négliger sa due diligence est aussi du misconduct.\nPiège : I(D) ne sert pas à régler un conflit personnel ou politique.",
      ],
      [
        "Standard I(E) Competence : un analyste accepte un poste de superviseur sans se former à ce nouveau rôle. Violation ?",
        "==Violation de I(E)== : un nouveau rôle exige d'en acquérir les compétences\nEn clair : Le Standard I(E) Competence exige d'avoir et de garder les compétences du poste. La continuing education est recommandée, pas exigée.\nPiège : un mauvais résultat ne prouve pas l'incompétence.",
      ],
      [
        "Standard II(A) Material Nonpublic Information : quand une information est-elle « material » et quand est-elle « nonpublic » ?",
        "Material : ==ferait bouger le cours== · Nonpublic : ==pas diffusée au marché==\nEn clair : Est aussi material ce qu'un investisseur raisonnable voudrait savoir. II(A) interdit d'agir ou de faire agir, même via fonds, options ou swaps.\nPiège : un analyst conference call ne rend pas l'info publique (selective disclosure).",
      ],
      [
        "Qu'est-ce que la mosaic theory (Standard II(A) Material Nonpublic Information) ?",
        "Mosaic theory : infos publiques + ==nonpublic non material== → pas de violation\nEn clair : Conclure grâce à une analyse fine d'infos publiques et d'infos nonpublic non material est permis sous II(A), même si la conclusion vaut cher.\nPiège : une seule info material nonpublic dans le lot suffit à violer II(A).",
      ],
      [
        "Standard II(A) : un analyste surprend l'appel téléphonique d'un ami et en déduit une takeover offer imminente sur une société. Peut-il acheter ?",
        "==Non== : info material nonpublic, acheter violerait II(A)\nEn clair : Peu importe comment l'info a été obtenue. Il ne doit ni agir, ni faire agir proches ou clients, et il en parle à la compliance.\nPiège : une info reçue pour une mission (ex. investment banking) ne sert qu'à cette mission.",
      ],
      [
        "Standard II(A) : quelles procédures une firme met-elle en place pour éviter l'usage de material nonpublic information ?",
        "Un ==firewall==, avec watch, restricted et rumor lists\nEn clair : La compliance filtre les échanges entre services et revoit les trades du personnel. Le proprietary trading est surveillé et restreint.\nPiège : pas de gel total du proprietary trading (signal au marché), seulement la contrepartie des unsolicited customer trades.",
      ],
      [
        "Standard II(B) Market Manipulation : qu'est-ce qui est interdit, et une grosse transaction qui fait bouger le cours est-elle une violation ?",
        "Interdit : ==fausser prix ou volumes== · Gros ordre, sans intention : ==permis==\nEn clair : II(B) exige l'intent to mislead. Fausses rumeurs, pump and dump ou échanges entre filiales pour simuler de la liquidité sont interdits.\nPiège : acheter une action et vendre des puts dessus (arbitrage) n'est pas une manipulation.",
      ],
      [
        "Standard III(A) Loyalty, Prudence, and Care : envers qui le gérant d'un pension fund a-t-il son devoir de loyauté ?",
        "Envers ==les bénéficiaires du pension fund==, pas la direction qui l'a mandaté\nEn clair : Le client est celui dont on gère l'argent, pas le sponsor. III(A) exige la prudence d'un pro avisé et recommande des relevés de compte au moins trimestriels.",
      ],
      [
        "Standard III(A) Loyalty, Prudence, and Care : à qui appartiennent les soft dollars (client brokerage), et à quoi le gérant peut-il les utiliser ?",
        "Soft dollars : ==propriété du client== · Usage : ==recherche utile au client==\nEn clair : Le client brokerage ne paie que de la recherche qui sert les décisions d'investissement du client. Payer avec lui le loyer, les salaires ou les bureaux de la firme viole III(A).",
      ],
      [
        "Standard III(A) Loyalty, Prudence, and Care : un gérant doit-il voter tous les proxies des actions qu'il gère pour ses clients ?",
        "==Non== : il vote quand c'est utile au client, après analyse cost-benefit\nEn clair : Sous III(A), les proxies ont une valeur économique pour le client. La best practice est une proxy voting policy écrite et communiquée aux clients.",
      ],
    ],
  },
  {
    title: "Ethics — Flashcards 3/4 (Devoirs envers clients et employeur)",
    cards: [
      [
        "Standard III(A) : une firme ajoute dans ses contrats une clause qui dispense ses conseillers d'agir au mieux du client. Est-ce permis ?",
        "==Non== : pas d'opt-out des Standards, violation de III(A)\nEn clair : Le devoir de loyauté de III(A) Loyalty, Prudence, and Care ne se négocie pas. On peut seulement annoncer les limites réelles du service, comme ne proposer que les produits maison.",
      ],
      [
        "Standard III(A) Loyalty, Prudence, and Care : un gérant en voyage pour un client reste le week-end, car le vol moins cher baisse le coût total malgré l'hôtel. Peut-il facturer vol et hôtel au client ?",
        "==Oui== : coût total plus bas, donc pas de violation de III(A)\nEn clair : Le Standard III(A) Loyalty, Prudence, and Care est violé si on facture au client des frais utiles à d'autres clients ou ses loisirs (sorties du week-end).",
      ],
      [
        "Standard III(B) Fair Dealing : traiter les clients « fairly » veut-il dire les traiter « equally » ?",
        "Non : ==fairly ≠ equally==, mais aucun client n'est désavantagé\nEn clair : Sous III(B), une recommendation part en même temps à tous les clients concernés. Un service premium est permis s'il est disclosed et ouvert à tous ceux qui paient.\nPiège : la firme qui trade pour elle avant que les clients aient pu agir viole III(B).",
      ],
      [
        "Standard III(B) Fair Dealing : formule de l'allocation pro rata d'une IPO (initial public offering) sursouscrite ? Application : 6 000 actions ; A, B, C demandent 6 000, 3 000, 3 000 ; le gérant 1 000.",
        "Allocation pro rata d'une IPO\n$$\\text{Allocation}_i = \\dfrac{\\text{Order}_i}{\\sum \\text{Client orders}} \\times \\text{Shares available}$$\nEn clair : $\\text{Order}_i$ = demande du client i. Ici 6 000 / 12 000 = 50 % : A 3 000, B 1 500, C 1 500, gérant 0, car se servir dans une IPO sursouscrite viole III(B) et I(B).\nPiège : la demande du gérant n'entre pas dans le total (6 000 / 13 000 serait faux).",
      ],
      [
        "Standard III(C) Suitability : que doit faire un conseiller avant de recommander un investissement à un client ?",
        "Une ==reasonable inquiry==, consignée dans un IPS écrit et mis à jour\nEn clair : L'IPS (investment policy statement) note expérience, objectifs de risk et return et contraintes. La suitability se juge sur le portefeuille total.\nPiège : un gérant de fonds à mandat (index, style) suit le mandat, pas le profil de chaque porteur.",
      ],
      [
        "Standard III(C) Suitability : un client demande un achat inadapté à son IPS (investment policy statement). Le gérant doit-il refuser ou exécuter ?",
        "Refus d'office : ==non, expliquer d'abord== · Impact minime : ==politique de firme== · Impact material : ==revoir l'IPS==\nEn clair : Si l'impact sur le portefeuille total est minime, la firme peut permettre le trade, mais le client confirme toujours avoir compris. S'il refuse un nouvel IPS : compte séparé client-directed.",
      ],
      [
        "Standard III(D) Performance Presentation : quelles pratiques de présentation de performance sont des violations ?",
        "==Meilleur compte seul== · ==Comptes fermés exclus== · ==Promettre de refaire le passé==\nEn clair : Tout doit être fair, accurate, complete. Best practice : les GIPS (Global Investment Performance Standards), gross ou net of fees précisé.\nPiège : présentation brève permise si elle se dit limitée, détail fourni sur demande.",
      ],
      [
        "Standard III(D) : un fonds lancé l'an dernier présente un track record de 10 ans tiré de comptes séparés gérés avant sa création. Violation ?",
        "==Violation de III(D)== : le fonds paraît plus ancien qu'il n'est\nEn clair : Le Standard III(D) Performance Presentation exige une performance fair, accurate, complete, avec les vraies dates et la vraie nature des comptes utilisés.",
      ],
      [
        "Standard III(E) Preservation of Confidentiality : quels clients sont protégés, et quelles sont les exceptions ?",
        "Protégés : ==clients actuels, anciens, prospects== · Sauf : ==illégalité, loi, accord client==\nEn clair : Coopérer avec une enquête du PCP (Professional Conduct Program) est permis. Garder des données clients sur un PC perso mal protégé viole III(E).\nPiège : client dans l'illégalité : n'informer que les autorités.",
      ],
      [
        "Standard IV(A) Loyalty (envers l'employeur) : qu'est-ce qui est interdit et permis quand on prépare son départ vers un concurrent ?",
        "Préparer son départ : ==permis== · Démarcher ses clients avant : ==interdit==\nEn clair : IV(A) court jusqu'au départ effectif : on prépare hors du temps et des moyens de l'employeur, sans emporter records ni liste clients.\nPiège : parti, recontacter ses ex-clients de mémoire et réutiliser son expérience est permis, sauf non-compete.",
      ],
      [
        "Standard IV(A) Loyalty : un membre veut gérer bénévolement le pension fund de sa ville, avec une place de parking gratuite en échange. Que doit-il faire ?",
        "Décrire l'activité à l'employeur et ==obtenir son accord écrit avant==\nEn clair : Sous IV(A), on décrit nature, durée et rémunération. Même bénévole, une activité qui concurrence l'employeur et rapporte un avantage (le parking) exige cet accord.",
      ],
      [
        "Standard IV(A) Loyalty : un membre copie des dossiers clients pour prouver au régulateur que sa firme vend des produits abusifs. Viole-t-il son devoir envers l'employeur ?",
        "==Non== : protéger les clients, sans gain personnel, est permis\nEn clair : Le devoir IV(A) Loyalty envers l'employeur cède quand on agit pour les clients ou l'intégrité du marché, sans profit personnel : c'est du whistleblowing.",
      ],
      [
        "Standard IV(B) Additional Compensation Arrangements : un client offre un bonus si son compte bat l'indice l'an prochain. Que faire ?",
        "Obtenir le ==consentement écrit de toutes les parties== avant d'accepter\nEn clair : Le Standard IV(B) vise un bonus lié à la performance future. Un e-mail de l'employeur suffit comme accord écrit.\nPiège : un bonus pour la performance passée est un cadeau : simple disclosure à l'employeur (I(B)).",
      ],
      [
        "Standard IV(C) Responsibilities of Supervisors : que doit faire un superviseur si le système de compliance de sa firme est inadéquat ?",
        "==Décliner par écrit la supervision== tant que la compliance reste inadéquate\nEn clair : IV(C) exige des efforts raisonnables pour prévenir et détecter les violations. Le superviseur alerte la direction. De bonnes procédures sont écrites, avec compliance officer et formation.",
      ],
      [
        "Standard IV(C) Responsibilities of Supervisors : un superviseur découvre qu'un employé enfreint les règles. Un simple avertissement suffit-il ?",
        "==Non== : enquêter vite et restreindre ou surveiller l'employé fautif\nEn clair : Le Standard IV(C) exige d'empêcher la récidive pendant l'enquête. Déléguer la supervision ne retire pas la responsabilité.\nPiège : accepter le titre de CCO (chief compliance officer) sans pouvoir d'agir viole IV(C) : il fallait refuser.",
      ],
    ],
  },
  {
    title: "Ethics — Flashcards 4/4 (Analyse, conflits, titre CFA et GIPS)",
    cards: [
      [
        "Standard V(A) Diligence and Reasonable Basis : que doit vérifier un analyste qui utilise de la third-party research ?",
        "V(A) : vérifier qu'elle est ==sound== (fiable), c'est exigé\nEn clair : On revoit ses hypothèses, sa rigueur, sa timeliness (fraîcheur), son objectivité et son indépendance. Une politique de revue périodique de la recherche externe est seulement recommandée.",
      ],
      [
        "Standard V(A) : un analyste recommande une action sans analyse sérieuse, et une collègue reprend sa recommendation dans son propre rapport. Qui viole V(A) ?",
        "==Les deux== violent V(A) : aucune reasonable and adequate basis\nEn clair : Reprendre l'analyse bâclée d'un collègue ne crée pas de base. Une rumeur ou le tuyau d'un proche ne sont pas une reasonable basis non plus.",
      ],
      [
        "Standard V(B) Communication with Clients and Prospective Clients : que faut-il divulguer aux clients et prospects ?",
        "==Services et coûts== · ==Process et ses changements== · ==Limites et risques==\nEn clair : Les risques incluent liquidity, capacity et limites des modèles quantitatifs. V(B) exige aussi de séparer fact et opinion : une projection n'est pas un fait.\nPiège : présenter des scénarios tous dans le sens de sa thèse viole V(B).",
      ],
      [
        "Standard V(C) Record Retention : à qui appartiennent les records, et combien de temps les garder sans règle locale ?",
        "Records : ==propriété de la firme== · Durée : ==7 ans minimum==\nEn clair : E-mails et SMS clients sont des records à conserver. Les 7 ans sont une recommandation, faute de loi ou de politique interne.\nPiège : nouvel employeur : refaire la documentation via des sources publiques, ni de mémoire ni d'anciennes copies.",
      ],
      [
        "Standard VI(A) Avoid or Disclose Conflicts : comment traiter un conflit d'intérêts, et quels sont les cas typiques ?",
        "Règle : ==éviter, sinon disclose== · Exemples : ==actions détenues, board, bonus==\nEn clair : On informe clients, prospects et employeur, de façon prominent et en plain language. Le market making est aussi un conflit à divulguer.\nPiège : des actions en trust, invendables mais votables, restent un beneficial ownership à divulguer.",
      ],
      [
        "Standard VI(B) Priority of Transactions : dans quel ordre passent les transactions, et un trade personnel contraire à la recommendation est-il permis ?",
        "Priorité : ==clients, employeur, puis soi== · Trade perso contraire : ==permis==\nEn clair : Le trade contraire ne doit léser aucun client. VI(B) interdit le front running. Blackout, preclearance et duplicate confirmations sont recommandés aux firmes.\nPiège : le compte d'un proche qui est client se traite comme tout compte client.",
      ],
      [
        "Standard VI(B) : un gérant alloue ses block trades après la clôture, les gagnants à son compte perso, les perdants aux gros comptes clients. Violation ?",
        "==Violation de VI(B)==, et aussi de III(B) Fair Dealing\nEn clair : Sous VI(B) Priority of Transactions, le gérant s'est servi avant ses clients. Il faut un même prix d'exécution pour tous les comptes du block trade, et les partiels au pro rata.",
      ],
      [
        "Standard VI(C) Referral Fees : que faut-il divulguer quand on reçoit ou verse une contrepartie pour recommander un service ?",
        "Divulguer ==toute contrepartie== à l'employeur, aux clients et aux prospects\nEn clair : Argent, recherche ou cadeaux, reçus ou versés, se divulguent avant l'entrée en relation : le client juge ainsi le vrai coût et la partialité possible.\nPiège : fêtes ou remises offertes aux clients apporteurs sont des referral fees à divulguer.",
      ],
      [
        "Standard VII(A) Conduct as Participants in CFA Institute Programs : un candidat peut-il écrire en ligne que l'examen n'avait aucune question d'Alternative Investments ?",
        "==Non== : révéler les topics testés ou non viole VII(A)\nEn clair : Critiquer CFA Institute ou dire que l'examen était difficile est permis. Tricher, enfreindre les règles d'examen ou mentir sur le PCS (Professional Conduct Statement) est interdit.",
      ],
      [
        "Standard VII(B) : un charterholder écrit « J'ai réussi les 3 niveaux du premier coup, mes clients auront donc de meilleures performances ». Violation ?",
        "Réussi du premier coup : ==permis== · Performance promise : ==violation==\nEn clair : Le Standard VII(B) interdit aussi de parler de « CFA partiel ». Pour garder le titre, on signe le PCS (Professional Conduct Statement) et on paie la cotisation chaque année.\nPiège : « CFA » est un adjectif : CFA charterholder, jamais « a CFA ».",
      ],
      [
        "Pourquoi les GIPS (Global Investment Performance Standards) existent-ils, et qui peut s'en réclamer ?",
        "But : ==comparer sans cherry-picking== · Qui : ==firmes gérant pour autrui==\nEn clair : Les GIPS sont volontaires, en tout ou rien et firmwide. La firm est l'entité présentée aux clients, toutes implantations comprises.\nPiège : un éditeur de logiciel peut seulement « endorse » les GIPS, pas claim compliance.",
      ],
      [
        "Quelles sont les 8 sections des GIPS (Global Investment Performance Standards) for Firms ?",
        "==Fundamentals== · ==Input Data== · ==Composites== · ==4 rapports de return== · ==Advertising==\nEn clair : Dans l'ordre : 1 Fundamentals of Compliance, 2 Input Data and Calculation Methodology, 3 Composite and Pooled Fund Maintenance, 4 à 7 rapports time-weighted et money-weighted, 8 Advertising.",
      ],
      [
        "GIPS (Global Investment Performance Standards) : qu'est-ce qu'un composite, et quels portefeuilles doit-il contenir ?",
        "Composite : ==portefeuilles de même stratégie== · Contenu : ==tous les fee-paying discretionary==\nEn clair : On inclut aussi les portefeuilles passés, chacun affecté ex ante (avant de connaître sa performance) à au moins un composite.\nPiège : restrictions client qui bloquent la stratégie → portefeuille nondiscretionary, hors composite.",
      ],
      [
        "GIPS (Global Investment Performance Standards) : formule du return d'un composite ? Application : A (USD 80 millions en début de période, return 10 %) et B (USD 20 millions, return 5 %).",
        "Return d'un composite, asset-weighted\n$$R_C = \\sum_i w_i R_i, \\qquad w_i = \\dfrac{MV_{i,0}}{\\sum_j MV_{j,0}}$$\nEn clair : $MV_{i,0}$ = market value du portefeuille i en début de période. Ici $w_A$ = 80 / 100 = 0,8, donc 0,8 × 10 % + 0,2 × 5 % = 8 % + 1 % = 9 %.\nPiège : la moyenne simple (7,5 %) est fausse : les GIPS pondèrent par les actifs.",
      ],
      [
        "GIPS (Global Investment Performance Standards) : la verification est-elle obligatoire, et sur quel périmètre porte-t-elle ?",
        "Obligatoire : ==non, recommandée== · Par qui : ==tiers indépendant== · Périmètre : ==toute la firme==\nEn clair : Le verifier atteste que la construction des composites respecte les GIPS et que les process de calcul, de données et de présentation sont conformes.\nPiège : jamais de verification sur un seul composite.",
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
