import type { MatiereFormules } from "@/lib/formules/types";

export const ETHICS: MatiereFormules = {
  matiere: "ethics",
  copies: [
    {
      id: "ethics.code-of-ethics",
      titre: "Code d'éthique (les six principes)",
      formules: [
        {
          id: "ethics.code-1",
          nom: "Code of Ethics, 1st principle",
          texte: "Act with integrity, competence, diligence, respect, and in an ethical manner with the public, clients, prospective clients, employers, employees, colleagues in the investment profession, and other participants in the global capital markets."
        },
        {
          id: "ethics.code-2",
          nom: "Code of Ethics, 2nd principle",
          texte: "Place the integrity of the investment profession and the interests of clients above their own personal interests."
        },
        {
          id: "ethics.code-3",
          nom: "Code of Ethics, 3rd principle",
          texte: "Use reasonable care and exercise independent professional judgment when conducting investment analysis, making investment recommendations, taking investment actions, and engaging in other professional activities."
        },
        {
          id: "ethics.code-4",
          nom: "Code of Ethics, 4th principle",
          texte: "Practice and encourage others to practice in a professional and ethical manner that will reflect credit on themselves and the profession."
        },
        {
          id: "ethics.code-5",
          nom: "Code of Ethics, 5th principle",
          texte: "Promote the integrity and viability of the global capital markets for the ultimate benefit of society."
        },
        {
          id: "ethics.code-6",
          nom: "Code of Ethics, 6th principle",
          texte: "Maintain and improve their professional competence and strive to maintain and improve the competence of other investment professionals."
        }
      ]
    },
    {
      id: "ethics.standards-1-2",
      titre: "Standards I et II : professionnalisme, intégrité des marchés",
      formules: [
        {
          id: "ethics.standard-1a",
          nom: "Standard I(A)",
          texte: "Knowledge of the Law: Members and Candidates must understand and comply with all applicable laws, rules, and regulations (including the CFA Institute Code of Ethics and Standards of Professional Conduct) of any government, regulatory organization, licensing agency, or professional association governing their professional activities. In the event of conflict, Members and Candidates must comply with the more strict law, rule, or regulation. Members and Candidates must not knowingly participate or assist in any violation of laws, rules, or regulations and must dissociate themselves from any such violation.",
          note: "On suit la plus stricte des trois sources : Standards, loi du pays de résidence, loi du pays d'activité. Signaler les violations est fortement encouragé, pas exigé."
        },
        {
          id: "ethics.standard-1b",
          nom: "Standard I(B)",
          texte: "Independence and Objectivity: Members and Candidates must use reasonable care and judgment to achieve and maintain independence and objectivity in their professional activities. Members and Candidates must not offer, solicit, or accept any gift, benefit, compensation, or consideration that reasonably could be expected to compromise their own or another's independence and objectivity.",
          note: "Rapport payé par l'émetteur : autorisé si rémunération forfaitaire non liée aux conclusions et divulguée. Les cadeaux de clients se divulguent à l'employeur."
        },
        {
          id: "ethics.standard-1c",
          nom: "Standard I(C)",
          texte: "Misrepresentation: Members and Candidates must not knowingly make any misrepresentations relating to investment analysis, recommendations, actions, or other professional activities.",
          note: "Inclut le plagiat ; pas besoin de citer une source statistique reconnue (ex. Trésor américain)."
        },
        {
          id: "ethics.standard-1d",
          nom: "Standard I(D)",
          texte: "Misconduct: Members and Candidates must not engage in any professional conduct involving dishonesty, fraud, or deceit or commit any act that reflects adversely on their professional reputation, integrity, or competence."
        },
        {
          id: "ethics.standard-1e",
          nom: "Standard I(E)",
          texte: "Competence: Members and Candidates must act with and maintain the competence necessary to fulfill their professional responsibilities.",
          note: "Formation continue recommandée, pas exigée ; un mauvais résultat ne prouve pas l'incompétence."
        },
        {
          id: "ethics.standard-2a",
          nom: "Standard II(A)",
          texte: "Material Nonpublic Information: Members and Candidates who possess material nonpublic information that could affect the value of an investment must not act or cause others to act on the information.",
          note: "Une conférence téléphonique d'analystes n'est pas une divulgation publique."
        },
        {
          id: "ethics.standard-2b",
          nom: "Standard II(B)",
          texte: "Market Manipulation: Members and Candidates must not engage in practices that distort prices or artificially inflate trading volume with the intent to mislead market participants.",
          note: "C'est l'intention de tromper qui fait la violation."
        }
      ]
    },
    {
      id: "ethics.standard-3",
      titre: "Standard III : devoirs envers les clients",
      formules: [
        {
          id: "ethics.standard-3a",
          nom: "Standard III(A)",
          texte: "Loyalty, Prudence, and Care: Members and Candidates have a duty of loyalty to their clients and must act with reasonable care and exercise prudent judgment. Members and Candidates must act for the benefit of their clients and place their clients' interests before their employer's or their own interests."
        },
        {
          id: "ethics.standard-3b",
          nom: "Standard III(B)",
          texte: "Fair Dealing: Members and Candidates must deal fairly and objectively with all clients when providing investment analysis, making investment recommendations, taking investment action, or engaging in other professional activities.",
          note: "Équitable, pas forcément égal : des niveaux de service différents sont permis s'ils sont divulgués et ouverts à tous."
        },
        {
          id: "ethics.standard-3c",
          nom: "Standard III(C)",
          texte: "Suitability: 1. When Members and Candidates are in an advisory relationship with a client, they must: a. make a reasonable inquiry into a client's or prospective client's investment experience, risk and return objectives, and financial constraints prior to making any investment recommendation or taking investment action, and reassess and update this information regularly; b. determine that an investment is suitable to the client's financial situation and consistent with the client's written objectives, mandates, and constraints before making a recommendation or taking action; c. judge the suitability of investments in the context of the client's total portfolio. 2. When Members and Candidates are responsible for managing a portfolio to a specific mandate, strategy, or style, they must make only investment recommendations or take only investment actions that are consistent with the stated objectives and constraints of the portfolio.",
          note: "Relation de conseil : on collecte les informations dans un IPS. Mandat : on reste dans les objectifs et contraintes du portefeuille. Ordre non sollicité jugé inadapté : en discuter avec le client avant d'agir."
        },
        {
          id: "ethics.standard-3d",
          nom: "Standard III(D)",
          texte: "Performance Presentation: When communicating investment performance information, Members or Candidates must make reasonable efforts to ensure that it is fair, accurate, and complete.",
          note: "Ne pas laisser entendre qu'un rendement passé se reproduira."
        },
        {
          id: "ethics.standard-3e",
          nom: "Standard III(E)",
          texte: "Preservation of Confidentiality: Members and Candidates must keep information about current, former, and prospective clients confidential unless: 1. the information concerns illegal activities on the part of the client or prospective client; 2. disclosure is required by law; or 3. the client or prospective client permits disclosure of the information."
        }
      ]
    },
    {
      id: "ethics.standards-4-5",
      titre: "Standards IV et V : employeurs, analyse et recommandations",
      formules: [
        {
          id: "ethics.standard-4a",
          nom: "Standard IV(A)",
          texte: "Loyalty: In matters related to their employment, Members and Candidates must act for the benefit of their employer and not deprive their employer of the advantage of their skills and abilities, divulge confidential information, or otherwise cause harm to their employer."
        },
        {
          id: "ethics.standard-4b",
          nom: "Standard IV(B)",
          texte: "Additional Compensation Arrangements: Members and Candidates must not accept gifts, benefits, compensation, or consideration that competes with or might reasonably be expected to create a conflict of interest with their employer's interest unless they obtain written consent from all parties involved.",
          note: "Prime liée à la performance future d'un compte = arrangement (accord écrit préalable). Prime pour la performance passée = cadeau (à divulguer à l'employeur, voir I(B))."
        },
        {
          id: "ethics.standard-4c",
          nom: "Standard IV(C)",
          texte: "Responsibilities of Supervisors: Members and Candidates must make reasonable efforts to ensure that anyone subject to their supervision or authority complies with applicable laws, rules, regulations, and the Code and Standards.",
          note: "Si les procédures de conformité manquent ou sont inadéquates : refuser par écrit la responsabilité de supervision tant qu'elles ne sont pas corrigées."
        },
        {
          id: "ethics.standard-5a",
          nom: "Standard V(A)",
          texte: "Diligence and Reasonable Basis: Members and Candidates must: 1. exercise diligence, independence, and thoroughness in analyzing investments, making investment recommendations, and taking investment actions; 2. have a reasonable and adequate basis, supported by appropriate research and investigation, for any investment analysis, recommendation, or action."
        },
        {
          id: "ethics.standard-5b",
          nom: "Standard V(B)",
          texte: "Communication with Clients and Prospective Clients: Members and Candidates must: 1. disclose to clients and prospective clients the nature of the services provided, along with information about the costs to the client associated with those services; 2. disclose the basic format and general principles of the investment processes they use to analyze investments, select securities, and construct portfolios, and promptly disclose any changes that might materially affect those processes; 3. disclose significant limitations and risks associated with the investment process; 4. use reasonable judgment in identifying which factors are important to their investment analyses, recommendations, or actions and include those factors in communications; 5. distinguish between fact and opinion in the presentation of investment analysis and recommendations.",
          note: "Cinq points, dont le premier : nature des services et coûts. Limites inhérentes : liquidité et capacité."
        },
        {
          id: "ethics.standard-5c",
          nom: "Standard V(C)",
          texte: "Record Retention: Members and Candidates must develop and maintain appropriate records to support their investment analysis, recommendations, actions, and other investment-related communications with clients and prospective clients.",
          note: "Sans règle ni politique de l'employeur : conservation d'au moins 7 ans. Les dossiers appartiennent à l'employeur ; en changeant de firme, on refait l'analyse à partir d'informations publiques."
        }
      ]
    },
    {
      id: "ethics.standards-6-7",
      titre: "Standards VI et VII : conflits d'intérêts, responsabilités de membre",
      formules: [
        {
          id: "ethics.standard-6a",
          nom: "Standard VI(A)",
          texte: "Avoid or Disclose Conflicts: Members and Candidates must avoid or make full and fair disclosure of all matters that could reasonably be expected to impair their independence and objectivity or interfere with respective duties to their clients, prospective clients, and employer. Members and Candidates must ensure that such disclosures are prominent, are delivered in plain language, and communicate the relevant information effectively.",
          note: "Conflit le plus courant : détention d'actions recommandées."
        },
        {
          id: "ethics.standard-6b",
          nom: "Standard VI(B)",
          texte: "Priority of Transactions: Investment transactions for clients and employers must have priority over investment transactions in which a Member or Candidate is the beneficial owner.",
          note: "Ordre de priorité : clients, puis employeur, puis le membre lui-même."
        },
        {
          id: "ethics.standard-6c",
          nom: "Standard VI(C)",
          texte: "Referral Fees: Members and Candidates must disclose to their employer, clients, and prospective clients, as appropriate, any compensation, consideration, or benefit received by, or paid to, others for the recommendation of products or services."
        },
        {
          id: "ethics.standard-7a",
          nom: "Standard VII(A)",
          texte: "Conduct as Participants in CFA Institute Programs: Members and Candidates must not engage in any conduct that compromises the reputation or integrity of CFA Institute or the CFA designation or the integrity, validity, or security of CFA Institute programs.",
          note: "Ex. : tricher à l'examen, révéler le contenu de l'examen, enfreindre les règles du programme."
        },
        {
          id: "ethics.standard-7b",
          nom: "Standard VII(B)",
          texte: "Reference to CFA Institute, the CFA Designation, and the CFA Program: When referring to CFA Institute, CFA Institute membership, the CFA designation, or candidacy in the CFA Program, Members and Candidates must not misrepresent or exaggerate the meaning or implications of membership in CFA Institute, holding the CFA designation, or candidacy in the CFA Program.",
          note: "Il n'existe pas de « CFA partiel » ; aucune promesse de performance liée au titre."
        }
      ]
    },
    {
      id: "ethics.application",
      titre: "Notions clés et cadre de décision éthique",
      formules: [
        {
          id: "ethics.seven-standards",
          nom: "The seven Standards of Professional Conduct",
          texte: "I Professionalism; II Integrity of Capital Markets; III Duties to Clients; IV Duties to Employers; V Investment Analysis, Recommendations, and Actions; VI Conflicts of Interest; VII Responsibilities as a CFA Institute Member or CFA Candidate."
        },
        {
          id: "ethics.material-information",
          nom: "Material information",
          texte: "Information is \"material\" if its disclosure would affect the price of a security or if a reasonable investor would want the information before making an investment decision. Information that is ambiguous as to its likely effect on price may not be considered material.",
          note: "Interdit aussi d'agir via fonds, swaps et options liés au titre."
        },
        {
          id: "ethics.nonpublic-information",
          nom: "Nonpublic information",
          texte: "Information is \"nonpublic\" until it has been made available to the marketplace.",
          note: "Une conférence téléphonique d'analystes n'est pas une divulgation publique."
        },
        {
          id: "ethics.mosaic-theory",
          nom: "Mosaic theory",
          texte: "Reaching an investment conclusion through perceptive analysis of public information combined with non-material nonpublic information is not a violation of Standard II(A)."
        },
        {
          id: "ethics.decision-framework",
          nom: "Ethical decision-making framework",
          texte: "Identify: relevant facts, stakeholders and duties owed, ethical principles, conflicts of interest. Consider: situational influences, additional guidance, alternative actions. Decide and act. Reflect: was the outcome as anticipated? Why or why not?"
        },
        {
          id: "ethics.suitability-vs-fiduciary",
          nom: "Suitability standard vs fiduciary standard",
          texte: "Suitability: the match between the client's return requirements and risk tolerance and the characteristics of the securities recommended. Fiduciary standard: the professional must act in the best interests of the client.",
          note: "Les Standards n'imposent pas un devoir fiduciaire là où il n'existait pas déjà."
        },
        {
          id: "ethics.ethics-vs-law",
          nom: "Ethics vs law",
          texte: "Not all unethical actions are illegal, and not all illegal actions are unethical. A code of ethics is a higher standard than legal compliance and requires more judgment.",
          note: "Ex. : la désobéissance civile ou le « whistle-blowing » peuvent être éthiques tout en étant illégaux."
        },
        {
          id: "ethics.ethical-challenges",
          nom: "Challenges to ethical behavior",
          texte: "Overestimating one's own ethical character; considering only near-term consequences; letting situational (external) influences, such as peer pressure or financial rewards, unduly affect decisions."
        },
        {
          id: "ethics.professional-conduct-program",
          nom: "CFA Institute Professional Conduct Program: outcomes",
          texte: "After an inquiry, Professional Conduct staff may decide that no sanction is appropriate, issue a cautionary letter, or discipline the member or candidate. A rejected sanction is referred to a disciplinary review panel. Sanctions may include public censure or suspension from the CFA Program.",
          note: "Le personnel ne suspend pas le droit d'utiliser le titre pendant une enquête."
        },
        {
          id: "ethics.unsolicited-trade",
          nom: "Unsolicited trade request judged unsuitable",
          texte: "Do not make the trade until the unsuitability (based on the IPS) has been discussed with the client. If the effect on the total portfolio is minimal, follow firm policy, with the client acknowledging the discussion. If material, update the IPS, or follow firm policy (e.g. a separate client-directed account).",
          note: "Rattaché à III(C)."
        }
      ]
    },
    {
      id: "ethics.gips",
      titre: "GIPS (Global Investment Performance Standards)",
      formules: [
        {
          id: "ethics.gips-purpose",
          nom: "GIPS: nature and purpose",
          texte: "A standardized, voluntary methodology for reporting investment performance, so that results are comparable across firms, useful to current and prospective clients, and free of misrepresentation. GIPS apply to firms that manage assets for others; a firm may claim compliance only if it complies fully and on a firmwide basis.",
          note: "Les autres entreprises (ex. éditeurs de logiciels) peuvent déclarer soutenir GIPS, pas s'en réclamer."
        },
        {
          id: "ethics.gips-composite",
          nom: "GIPS composite",
          texte: "A grouping of discretionary portfolios representing a similar investment strategy, objective, or mandate. It must include all fee-paying, discretionary portfolios (current and past, including terminated accounts); the composite for each portfolio is decided before its performance is known; every such portfolio must be in at least one composite."
        },
        {
          id: "ethics.gips-composite-return",
          nom: "Composite return (asset-weighted)",
          latex: "\\sum_{i=1}^{n} \\frac{\\text{Assets}_i}{\\sum \\text{Assets}} \\times R_i",
          note: "Moyenne pondérée par les actifs (pas une moyenne simple). Dans les exercices du site, pondération par les actifs de début de période."
        },
        {
          id: "ethics.gips-verification",
          nom: "GIPS verification",
          texte: "Optional. If a firm chooses it, it must be performed by a third party on a firmwide basis (not on a single composite). The verifier attests that (1) the firm has complied with all GIPS requirements for composite construction on a firmwide basis and (2) its processes and procedures are established to present performance as GIPS require.",
          note: "Phrase des firmes vérifiées : « [firm] has been verified for the periods [dates] by [verifier]. A copy of the verification report is available upon request. »"
        },
        {
          id: "ethics.gips-sections",
          nom: "GIPS Standards for Firms: the eight sections",
          texte: "1) Fundamentals of Compliance; 2) Input Data and Calculation Methodology; 3) Composite and Pooled Fund Maintenance; 4) Composite Time-Weighted Return Report; 5) Composite Money-Weighted Return Report; 6) Pooled Fund Time-Weighted Return Report; 7) Pooled Fund Money-Weighted Return Report; 8) GIPS Advertising Guidelines."
        },
        {
          id: "ethics.gips-firm-discretion",
          nom: "GIPS: definition of the firm and of discretion",
          texte: "The firm is the corporation, subsidiary, or division held out to clients as a distinct business entity (including all its geographic locations). A portfolio may be nondiscretionary, and so excluded from composites, if client restrictions prevent the manager from carrying out the intended strategy."
        },
        {
          id: "ethics.gips-fundamentals",
          nom: "GIPS fundamentals of compliance",
          texte: "Defining the firm; providing GIPS-compliant reports to all clients and prospects; complying with applicable regulations and laws; presenting information that is neither false nor misleading."
        }
      ]
    }
  ]
};
