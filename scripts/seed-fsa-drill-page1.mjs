import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Financial Statement Analysis (Système)";
const QUIZ_SETS = [
  {
    title: "Financial Statement Analysis — Drill Fiche Page 1 (Introduction to Financial Statement Analysis)",
    difficulty: 1,
    questions: [
      [
        "Quelle est la meilleure description du framework d'analyse des états financiers ?",
        [
          "Collecter les données, analyser et interpréter les données, traiter les conclusions, évaluer le contexte, rapporter les recommandations, mettre à jour l'analyse.",
          "Énoncer l'objectif et le contexte, collecter les données, traiter les données, analyser et interpréter les données, rapporter les conclusions ou recommandations, mettre à jour l'analyse.",
          "Collecter les données, analyser et interpréter les données, déterminer le contexte, rapporter les conclusions, mettre à jour l'analyse.",
        ],
        1,
        "Le framework compte 6 étapes dans cet ordre précis : (1) énoncer l'objectif et le contexte, (2) collecter les données, (3) traiter les données, (4) analyser et interpréter, (5) rapporter les conclusions/recommandations, (6) mettre à jour l'analyse. Les options A et C mélangent l'ordre (la détermination du contexte doit être la toute première étape, pas une étape intermédiaire) et omettent l'étape de traitement des données.",
      ],
      [
        "Le rapport d'audit standard ('standard auditor's report') a le plus vraisemblablement pour rôle de :",
        [
          "fournir une opinion 'sans réserve' même si des incertitudes matérielles existent.",
          "garantir une assurance raisonnable que la direction est fiable.",
          "garantir une assurance raisonnable que les états financiers ne contiennent pas d'erreurs matérielles.",
        ],
        2,
        "L'audit est mené selon les normes d'audit généralement acceptées, qui offrent une assurance raisonnable (jamais absolue) que les états financiers sont exempts d'erreurs matérielles. L'auditeur ne se prononce jamais sur la fiabilité de la direction (B) et une opinion sans réserve ('unqualified') suppose l'absence d'incertitude matérielle significative, ce qui exclut A.",
      ],
      [
        "Pour les sociétés cotées aux États-Unis, la section Management Discussion & Analysis (MD&A) de la communication financière est le moins susceptible d'être tenue d'aborder :",
        [
          "les ressources en capital et la liquidité.",
          "les résultats des opérations.",
          "les éléments inhabituels ou peu fréquents.",
        ],
        2,
        "Le MD&A américain doit obligatoirement couvrir les résultats des opérations, les ressources en capital et la liquidité, ainsi qu'un aperçu général de l'activité fondé sur les tendances connues. La discussion des éléments inhabituels ou peu fréquents peut y figurer mais n'est pas une obligation réglementaire, contrairement aux deux autres points.",
      ],
      [
        "Une entreprise s'engage dans un nouveau type de transaction financière ayant un effet matériel sur ses résultats. Un analyste devrait le plus vraisemblablement se méfier de cette nouvelle transaction si :",
        [
          "la direction n'en a pas expliqué la finalité économique (business purpose).",
          "aucune norme comptable existante ne s'applique à la transaction.",
          "la transaction n'est encadrée par aucune réglementation existante.",
        ],
        0,
        "Une transaction nouvelle peut légitimement échapper aux normes comptables ou à la réglementation existantes simplement parce qu'elle est inédite — ce n'est pas en soi un signal d'alerte. Ce qui doit alerter l'analyste, c'est l'incapacité de la direction à en expliquer la finalité économique, ce qui peut signaler une tentative de manipulation des états financiers.",
      ],
      [
        "Lequel des éléments suivants est le moins susceptible d'être disponible sur EDGAR (Electronic Data Gathering, Analysis, and Retrieval System) ?",
        [
          "Les communiqués de presse de l'entreprise.",
          "Le formulaire 10-Q.",
          "Les dépôts réglementaires auprès de la SEC.",
        ],
        0,
        "EDGAR (www.sec.gov) héberge les dépôts officiels auprès de la SEC, comme les rapports annuels (10-K) et trimestriels (10-Q). Les communiqués de presse sont rédigés par la direction elle-même et ne constituent pas des dépôts réglementaires SEC ; ils n'apparaissent donc pas sur EDGAR.",
      ],
      [
        "Laquelle des affirmations suivantes sur l'analyse des états financiers (financial statement analysis) et la communication financière (financial reporting) est la moins exacte ?",
        [
          "L'analyse des états financiers vise à évaluer la performance passée et actuelle d'une entreprise pour porter un jugement sur ses perspectives futures.",
          "La communication financière (financial reporting) consiste à fournir de l'information à un large éventail d'utilisateurs pour la prise de décision.",
          "L'analyse des états financiers se concentre sur la manière dont les entreprises présentent leur performance financière au travers des états financiers et des annexes.",
        ],
        2,
        "L'option C décrit en réalité le rôle de la communication financière (financial reporting) — produire et présenter l'information — et non celui de l'analyse (financial statement analysis), qui consiste à utiliser cette information pour évaluer et décider. C'est donc l'affirmation la moins exacte à propos de l'analyse des états financiers, alors que A et B décrivent correctement respectivement l'analyse et la communication financière.",
      ],
      [
        "Un auditeur indépendant est le moins susceptible de :",
        [
          "confirmer les actifs et les passifs de l'entreprise.",
          "préparer les états financiers et en assumer la responsabilité.",
          "fournir une opinion sur le caractère fidèle de la présentation des états financiers.",
        ],
        1,
        "Préparer les états financiers et en assumer la responsabilité incombe à la direction de l'entreprise, pas à l'auditeur. L'auditeur, lui, confirme certains soldes (A) et exprime une opinion sur la fidélité de la présentation (C) — ce sont là ses tâches habituelles.",
      ],
      [
        "Quelle donnée est la plus vraisemblablement une source d'information auditée pour un analyste ?",
        [
          "Les annexes (footnotes) aux états financiers annuels.",
          "Le commentaire de la direction (MD&A).",
          "Les états financiers intermédiaires déposés auprès de la SEC.",
        ],
        0,
        "Les annexes aux états financiers annuels font partie du périmètre audité et sont donc vérifiées par l'auditeur indépendant. Le MD&A est une commentaire narratif de la direction, non audité, et les états financiers intermédiaires (trimestriels) sont généralement seulement 'reviewed', pas audités au même niveau que les comptes annuels.",
      ],
      [
        "Le système de contrôle interne d'une entreprise est le plus fidèlement décrit comme :",
        [
          "relevant de la responsabilité exclusive du conseil d'administration.",
          "affectant directement la qualité de la communication financière.",
          "hors du champ du rapport d'audit.",
        ],
        1,
        "Les contrôles internes concernent les processus mis en place pour garantir la fiabilité de l'information financière ; ils affectent donc directement la qualité de la communication financière. La responsabilité du contrôle interne incombe à la direction (avec supervision du conseil, pas seulement sa responsabilité exclusive), et l'auditeur doit en évaluer l'efficacité dans le cadre de sa mission — ce n'est donc pas hors du champ de l'audit.",
      ],
      [
        "L'étape de traitement des données (processing the data) du framework d'analyse est le moins susceptible d'inclure :",
        [
          "l'acquisition des états financiers de l'entreprise étudiée.",
          "le calcul de ratios ou de données en pourcentage (common-size).",
          "la réalisation d'ajustements appropriés aux données financières.",
        ],
        0,
        "L'acquisition des états financiers relève de l'étape de collecte des données (gather data), une étape antérieure. L'étape de traitement (processing) porte elle sur la transformation des données déjà collectées : calcul de ratios, données en pourcentage, et ajustements appropriés.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Financial Statement Analysis Page 1...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
