// Variantes (2 par question) pour "Mock A — Session 1 — Éthique et
// Standards Professionnels".
//
// Règle de conception : une variante ne rejoue pas l'énoncé d'origine avec
// d'autres chiffres. Pour chaque question source on produit
//   (a) un ANGLE DIFFÉRENT — on inverse l'inconnue, on compare deux cas, on
//       diagnostique une erreur, ou on applique le concept ailleurs ;
//   (b) une MONTÉE EN DIFFICULTÉ — une étape de plus, un repère retiré, ou la
//       combinaison de deux notions.
// Les distracteurs correspondent à des erreurs réellement commises.
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Mocks Officiels (Système)";

const QUIZ_SETS = [
  {
    title: "Mock A — Session 1 — Éthique et Standards Professionnels — Variantes",
    difficulty: 2,
    questions: [
      // ---- Q1 — frais de recommandation (référence) ------------------------
      // (a) angle : QUI doit être informé
      [
        "Standard VI(C), Referral Fees, requires a member to disclose a referral fee arrangement to:",
        ["clients only.", "the member's employer only.", "both the member's employer and clients/prospective clients."],
        2,
        "Standard VI(C) requires members to inform their employer, clients, and prospective clients of any benefit received or paid for referrals — the obligation runs to both sides, not just to the client or just to the employer. Disclosing to only one party leaves the other unable to evaluate potential partiality or the true cost of services.",
      ],
      // (b) difficulté : le moment de la divulgation
      [
        "A wealth manager refers a prospective client to a specialist retirement-planning firm and receives a one-time flat referral fee. She first discloses this fee to the client three weeks after the client signs a formal engagement letter with the specialist firm. Has she most likely violated Standard VI(C)?",
        [
          "No, since disclosure occurred before any services were rendered by the specialist firm.",
          "No, since referral fees only need to be disclosed if the client asks about them.",
          "Yes, since disclosure must occur before the client enters into the formal agreement for services, not after.",
        ],
        2,
        "Appropriate disclosure under Standard VI(C) must happen before the client enters into any formal agreement for the referred services — disclosing afterward, even promptly and even if services haven't yet started, is too late. Disclosure is also proactively required regardless of whether the client asks.",
      ],

      // ---- Q2 — présentation initiale GIPS ----------------------------------
      // (a) angle : un historique plus court que 5 ans
      [
        "A newly GIPS-compliant firm has only 3 years of investment performance history available. It should initially present:",
        [
          "all 3 years available, then build up annually toward a 5-year (and eventually 10-year) record.",
          "a minimum of 5 years regardless of how long the firm has existed.",
          "a minimum of 10 years of performance history.",
        ],
        0,
        "A firm presents whatever compliant history it actually has if that is less than five years, then adds a further year each year until it reaches the five-year minimum and, ultimately, a ten-year record. It is not required — nor possible — to present five years of history when the firm has only existed for three.",
      ],
      // (b) difficulté : la trajectoire après plusieurs années
      [
        "A firm has been GIPS-compliant for eight consecutive years, adding one additional year of performance to its presentation each year since becoming compliant. Under the GIPS standards, the firm should now be presenting a performance record of:",
        ["5 years, since that is the minimum requirement.", "8 years, reflecting all years since compliance began.", "10 years, since firms must maintain at least a 10-year record."],
        1,
        "Firms build their presented history up year by year, from the initial minimum toward an eventual 10-year record — after eight years of compliant history with one year added annually, the firm should be presenting all eight years, not stopping at the original five-year minimum or jumping ahead to ten years it has not yet accumulated.",
      ],

      // ---- Q3 — mention du titre CFA et performance -------------------------
      // (a) angle : ce qui EST permis de dire
      [
        "Which of the following statements about the CFA credential would most likely NOT violate Standard VII(B), Reference to CFA Institute, the CFA Designation, and the CFA Program?",
        [
          "\"Completing the CFA Program broadened my analytical skill set.\"",
          "\"My CFA charter is the reason I outperformed the benchmark last year.\"",
          "\"Holding the CFA charter guarantees superior investment results for my clients.\"",
        ],
        0,
        "A general statement that the CFA Program improved one's skills is a fair, permitted description of the credential's value. Directly attributing specific investment outperformance to the charter, or claiming the charter guarantees superior results, crosses into the kind of promotional, performance-causation claim that Standard VII(B) prohibits.",
      ],
      // (b) difficulté : isoler le problème de statut, pas de performance
      [
        "An individual whose CFA Institute membership lapsed two years ago due to nonpayment of dues continues to list \"CFA charterholder, active member\" on her business card and marketing materials. This most likely violates the Standard relating to:",
        [
          "misrepresentation, by holding out an active membership status that is no longer accurate.",
          "reference to CFA Institute, the CFA designation, and the CFA Program, merely by mentioning the charter at all.",
          "no Standard, since charterholders remain permanently entitled to use the credential regardless of dues status.",
        ],
        0,
        "The problem here is not that she mentions the CFA charter — charterholders in good standing are entitled to do that — but that she misrepresents her current status as an active member when it has lapsed. This is a distinct issue from the performance-attribution problem: it is about the accuracy of a factual claim (active status), not about linking the charter to investment results.",
      ],

      // ---- Q4 — loyauté au départ d'un employeur ----------------------------
      // (a) angle : le cas inverse — divulgation d'informations confidentielles
      [
        "Before leaving her firm, an adviser calls her clients to inform them of her departure. During these calls she also reveals confidential portfolio details of another client she manages, to illustrate her investment approach. She has most likely violated the Standard(s) relating:",
        ["only to loyalty.", "both to loyalty and to preservation of confidentiality.", "only to preservation of confidentiality."],
        2,
        "Simply informing clients of a planned departure is permitted and does not by itself breach the duty of loyalty. Disclosing another client's confidential account details without authorization, however, is exactly what Standard III(E), Preservation of Confidentiality, prohibits — the reverse of the original scenario, where disparaging the employer (a loyalty issue) was the problem and no confidential client information was shared.",
      ],
      // (b) difficulté : classer trois actions distinctes
      [
        "Before leaving her firm, an adviser (1) calls clients to inform them of her departure, (2) tells clients the firm's technology \"is falling apart and driving away good people,\" and (3) shares a former client's portfolio performance history with her new employer to help transition the relationship. Which of her actions most likely violate the Standards?",
        [
          "(2) only, since (1) is permitted and (3) does not involve a current employer's confidential information.",
          "(2) and (3), since the first harms her former employer's interests and the second breaches client confidentiality.",
          "(1), (2), and (3), since all client contact before departure is prohibited.",
        ],
        1,
        "Notifying clients of a departure (1) is permitted on its own. Disparaging the firm's leadership and technology (2) breaches the duty of loyalty by harming the employer. Sharing a client's confidential performance history with a new employer without authorization (3) breaches preservation of confidentiality — client information does not become shareable simply because the adviser is changing firms.",
      ],

      // ---- Q5 — déclarations promotionnelles et GIPS ------------------------
      // (a) angle : l'objectif réel des normes GIPS
      [
        "According to the GIPS standards, which of the following best describes their objective regarding investor due diligence?",
        [
          "GIPS compliance is intended to eliminate the need for investors to perform their own due diligence.",
          "GIPS compliance shifts responsibility for due diligence entirely to independent verifiers.",
          "GIPS compliance promotes fair representation and full disclosure but does not eliminate the need for investor due diligence.",
        ],
        2,
        "GIPS compliance standardizes and improves the fairness and comparability of performance reporting, but it is not a substitute for an investor's own due diligence — a firm may not claim that compliance removes the need for prospective clients to evaluate it themselves.",
      ],
      // (b) difficulté : conformité partielle, composite par composite
      [
        "An asset manager claims GIPS compliance for its domestic equity composite only, while its fixed income and global equity composites are not GIPS-compliant. This claim is most likely:",
        [
          "acceptable, since GIPS compliance can be claimed at the composite level.",
          "not acceptable, since GIPS compliance must be claimed on a firm-wide basis, not selectively for some composites.",
          "acceptable, provided the domestic equity composite alone meets all applicable requirements.",
        ],
        1,
        "A claim of GIPS compliance applies to the firm as a whole, not to individual composites chosen selectively — a firm cannot present some composites as compliant while leaving others outside the claim. This is a common misconception distinct from the promotional-statement issues (endorsements, misleading objectives) tested elsewhere.",
      ],

      // ---- Q6 — confidentialité et collecte d'informations -------------------
      // (a) angle : un problème d'adéquation (suitability), pas de confidentialité
      [
        "In a similar situation, an adviser shares no information about a prospective client with anyone. However, he still prepares her IPS and enters into a formal agreement based only on the partial ESG-related information she chose to disclose, without following up to obtain a fuller picture of her overall financial situation. He has most likely violated the Standard relating to:",
        [
          "suitability, for failing to gather sufficient information to formulate appropriate advice.",
          "preservation of confidentiality, for retaining incomplete records.",
          "no Standard, since the client chose what information to disclose.",
        ],
        0,
        "Standard III(C), Suitability, requires members to gather enough information about a client's full financial circumstances to formulate appropriate advice and enter into an appropriate agreement — proceeding on admittedly partial information, without following up, falls short of that duty. No confidential information is being disclosed to anyone here, so confidentiality is not the issue.",
      ],
      // (b) difficulté : deux violations dans la même situation
      [
        "An adviser mentions to a friend that his prospective client donates to environmental causes. Separately, he prepares her IPS using only the partial ESG-related information she provided, without requesting a fuller picture of her financial circumstances, and enters into a formal agreement with her. Which Standard(s) has he most likely violated?",
        ["only preservation of confidentiality.", "only suitability.", "both preservation of confidentiality and suitability."],
        2,
        "Disclosing the prospective client's information to a friend breaches Standard III(E), Preservation of Confidentiality, while proceeding to formulate advice and enter an agreement on admittedly incomplete information breaches Standard III(C), Suitability — these are two separate failures within the same fact pattern, not a single issue.",
      ],

      // ---- Q7 — citation des sources (plagiat) --------------------------------
      // (a) angle : le cas conforme — sources correctement citées
      [
        "An analyst compiles a report drawing on research from several outside analysts, clearly citing each source and disclosing that his conclusions build on their work. This practice is:",
        [
          "a violation of the Standards, since using others' research always constitutes plagiarism.",
          "a violation of the Standards, since Standard I(C) prohibits incorporating any third-party research into a member's own reports.",
          "permitted, since the sources are properly cited and the analyst does not misrepresent the work as entirely his own.",
        ],
        2,
        "Standard I(C), Misrepresentation, allows members to use and build on others' research, provided they do not represent themselves as the original authors and properly cite their sources — that is precisely what distinguishes legitimate use of third-party research from plagiarism.",
      ],
      // (b) difficulté : une citation partielle qui reste trompeuse
      [
        "An analyst's report repeatedly refers to \"our proprietary analysis,\" while in fact the underlying models and much of the analytical framework were purchased from a third-party data vendor and used largely unchanged. A footnote mentions only that \"certain data was sourced externally.\" This disclosure is most likely:",
        [
          "sufficient, since the footnote discloses that some data came from an external source.",
          "insufficient, since describing the vendor's framework as \"our proprietary analysis\" misrepresents the true source and extent of the analyst's own work.",
          "unnecessary, since footnote disclosures are only required for direct quotations.",
        ],
        1,
        "A vague footnote about \"external data\" does not cure a report that elsewhere describes a purchased analytical framework as the firm's own proprietary work — the overall impression given to the reader is what matters, and here it still misleads as to how much of the analysis was genuinely original. A citation must be clear and proportionate to how much of the work came from elsewhere.",
      ],

      // ---- Q8 — GIPS : définition de la discrétion ---------------------------
      // (a) angle : discrétion contre critère de composite
      [
        "A firm's composite construction is based on investment mandate, objective, or strategy. Separately, the firm's definition of discretion is used to determine:",
        [
          "which portfolios the firm must include in an appropriate composite, based on whether the firm can implement its intended strategy for that portfolio.",
          "which investment mandate a composite should be assigned to.",
          "the minimum asset level a portfolio must have to be included in any composite.",
        ],
        0,
        "Discretion and composite construction serve different roles: composites are built around a shared mandate, objective, or strategy, while the discretion definition determines whether a given portfolio can actually be managed according to that strategy and therefore must be included in the corresponding composite.",
      ],
      // (b) difficulté : appliquer le critère à une restriction limitée
      [
        "A client imposes a restriction prohibiting the firm from purchasing tobacco-sector securities in her portfolio, but otherwise allows the firm full latitude to implement its standard strategy. Under the GIPS standards, this portfolio is most likely:",
        [
          "non-discretionary, and therefore excluded from all composites.",
          "discretionary, but must always be presented in its own single-portfolio composite.",
          "discretionary, since the restriction does not prevent the firm from implementing its strategy, and it may be included in an appropriate composite.",
        ],
        2,
        "A portfolio is judged non-discretionary only when a client-imposed restriction is significant enough to prevent the firm from implementing its intended strategy. A single narrow sector exclusion that still leaves the firm free to run its normal strategy typically does not rise to that level, so the portfolio remains discretionary and belongs in an appropriate composite alongside similarly managed portfolios.",
      ],

      // ---- Q9 — légal contre éthique -----------------------------------------
      // (a) angle : un exemple concret de comportement légal mais contraire à l'éthique
      [
        "Which of the following is the best example of conduct that may be legal but is nonetheless widely regarded as unethical?",
        [
          "Executing a client's order at the best price available on a public exchange.",
          "Providing a client with a written summary of all fees before the engagement begins.",
          "Recommending a suitable product without disclosing that it pays a substantially higher commission than comparable alternatives, in a jurisdiction where such disclosure is not legally required.",
        ],
        2,
        "Failing to disclose a material conflict of interest — here, a much higher commission on the recommended product — can be entirely legal in a jurisdiction with weak disclosure rules, yet it is still widely regarded as unethical because it puts the adviser's compensation ahead of the client's ability to make a fully informed decision. Best execution and transparent fee disclosure are both examples of conduct that is both legal and ethical.",
      ],
      // (b) difficulté : le cas inverse — éthique mais illégal
      [
        "Which of the following best illustrates conduct that may be regarded as ethical even though it is illegal in the jurisdiction where it occurs?",
        [
          "A whistleblower discloses her employer's fraudulent accounting practices to regulators, in violation of a strict local law that criminalizes any disclosure of internal company information without prior consent.",
          "An adviser fails to register with the local regulator as required by law, but otherwise treats clients fairly.",
          "A portfolio manager complies with all disclosure laws while also acting in clients' best interests.",
        ],
        0,
        "Some jurisdictions have laws so restrictive that clearly ethical conduct — like exposing fraud to protect investors — is technically illegal; this is the harder-to-spot corner of the legal/ethical relationship, distinct from the more familiar case of legal-but-unethical conduct. Failing to register, by contrast, is simply illegal without an obvious ethical justification, and full compliance combined with acting in clients' interests is both legal and ethical.",
      ],

      // ---- Q10 — vérification GIPS --------------------------------------------
      // (a) angle : ce que la vérification couvre réellement
      [
        "Which of the following is most accurate regarding GIPS standards verification?",
        [
          "Verification confirms that a specific composite's performance was calculated accurately.",
          "Verification provides assurance on firm-wide claims of compliance but does not test the accuracy of any specific composite's performance.",
          "Verification is mandatory for all firms claiming compliance with the GIPS standards.",
        ],
        1,
        "Firm-wide verification tests whether the firm has complied with the GIPS standards on a firm-wide basis and applied them consistently — it does not test the accuracy of any individual composite's specific performance figures, which requires a separate performance examination. Verification is voluntary, not mandatory, under the GIPS standards.",
      ],
      // (b) difficulté : la responsabilité subsiste après vérification
      [
        "A firm hires an independent verifier, who issues a report confirming firm-wide compliance with the GIPS standards. Six months later, a regulator discovers that one of the firm's composites materially misstated its returns due to an internal data error. Which of the following is most accurate?",
        [
          "The firm remains responsible for its claim of compliance and the accuracy of its performance presentations, notwithstanding the verification report.",
          "The verifier bears sole responsibility for the misstatement, since it issued the verification report.",
          "The firm is shielded from responsibility because it exercised due diligence by hiring an independent verifier.",
        ],
        0,
        "Verification increases confidence in a firm's compliance claim, but it never shifts ultimate responsibility for that claim, or for the accuracy of the firm's own performance data, away from the firm itself. A verification report from six months earlier does not absolve the firm of a data error subsequently discovered in its own records.",
      ],

      // ---- Q11 — relevés périodiques ------------------------------------------
      // (a) angle : la condition (contrôle des actifs), pas seulement la fréquence
      [
        "A member provides investment advice to a client but does not have custody or control of the client's assets; a separate custodian bank holds and reports on the assets. Under Standard III(A), Loyalty, Prudence, and Care, the member's obligation to provide the client with itemized account statements is:",
        [
          "the same as if the member had control of the assets — quarterly statements are required regardless.",
          "eliminated entirely, since only custodians have any statement-related obligations.",
          "reduced, since the duty to provide itemized statements at least quarterly applies specifically to members who have control of client assets.",
        ],
        2,
        "The quarterly itemized-statement requirement under Standard III(A) is specifically tied to members who have control of client assets — the underlying condition matters as much as the frequency. A member who merely advises, while a separate custodian holds and reports on the assets, is not subject to the same specific obligation, though other duties of loyalty, prudence, and care still apply.",
      ],
      // (b) difficulté : des mises à jour informelles ne suffisent pas
      [
        "A member with control of client assets sends clients a comprehensive itemized statement of holdings and transactions once a year, supplemented by brief email updates on major transactions as they occur throughout the year. Does this practice most likely satisfy Standard III(A)?",
        [
          "Yes, since clients are kept reasonably informed through the combination of annual statements and transaction emails.",
          "No, since a comprehensive itemized statement must be provided at least quarterly, and informal updates do not substitute for it.",
          "Yes, provided the client has not requested more frequent statements.",
        ],
        1,
        "The quarterly requirement is specific and does not bend to a client's silence or to informal supplementary updates — ad hoc transaction emails, however useful, are not a substitute for the comprehensive itemized statement that Standard III(A) requires at least every quarter.",
      ],

      // ---- Q12 — responsabilités des superviseurs ----------------------------
      // (a) angle : pourquoi un code trop détaillé pose problème
      [
        "A firm's compliance officer drafts a stand-alone code of ethics filled with highly detailed, technical procedures covering dozens of specific scenarios. According to the recommended procedures for Standard IV(C), Responsibilities of Supervisors, this approach is most likely:",
        [
          "appropriate, since more detail reduces ambiguity for employees.",
          "required, since regulators mandate comprehensive procedural codes.",
          "not ideal, since a stand-alone code of ethics should be written in plain language addressing general fiduciary concepts, unencumbered by numerous detailed procedures.",
        ],
        2,
        "The recommended procedures specifically call for a stand-alone code of ethics to be written in plain, accessible language covering general fiduciary concepts — not to be weighed down with numerous detailed procedures, which belong elsewhere in a firm's compliance framework rather than in the code of ethics itself.",
      ],
      // (b) difficulté : distinguer le code des procédures de conformité
      [
        "According to the recommended procedures for Standard IV(C), which of the following is most accurate regarding the relationship between a firm's code of ethics and its compliance procedures?",
        [
          "Both the code of ethics and the compliance procedures should be written in general, plain language to remain accessible to all employees.",
          "The code of ethics should be written in plain, general language, while detailed compliance procedures may separately elaborate on specific requirements.",
          "Detailed compliance procedures should be incorporated directly into the code of ethics to ensure employees see them together.",
        ],
        1,
        "The plain-language guidance applies specifically to the stand-alone code of ethics; it does not mean a firm cannot maintain separate, more detailed compliance procedures that spell out specific requirements. The two documents serve different purposes and can coexist, with detail properly housed in the compliance procedures rather than the code itself.",
      ],

      // ---- Q13 — conduite lors des examens CFA --------------------------------
      // (a) angle : ce qui EST permis de publier après un examen
      [
        "Which of the following would most likely NOT violate Standard VII(A), Conduct as Participants in CFA Institute Programs, if posted on social media immediately after sitting for a CFA exam?",
        [
          "A general comment such as \"that was a tough exam,\" without describing any topic areas or content tested.",
          "A list of the broad topic areas that appeared on the exam.",
          "A description of a specific formula that was, or was not, tested.",
        ],
        0,
        "A general remark about the exam's difficulty, with no reference to specific topics, formulas, or content, does not disclose confidential exam material. Listing broad topic areas or specific formulas tested — or notably absent — does disclose exactly the kind of information Standard VII(A) prohibits candidates from sharing.",
      ],
      // (b) difficulté : une divulgation indirecte, par la pondération relative
      [
        "A candidate posts on social media: \"Ethics felt way more heavily weighted on my exam than I expected based on the curriculum weightings, while Fixed Income barely showed up.\" Has the candidate most likely violated Standard VII(A)?",
        [
          "No, since no specific questions, formulas, or exact topic lists were disclosed.",
          "Yes, since the comment effectively discloses the relative topic weighting/composition of that specific exam, which is confidential.",
          "No, since candidates are permitted to discuss their general impressions of exam difficulty.",
        ],
        1,
        "Disclosing relative topic emphasis — which areas felt over- or under-weighted — still reveals confidential information about the composition of a specific exam, even without naming exact questions or formulas. The prohibition covers this kind of indirect content disclosure, not just verbatim leaks.",
      ],

      // ---- Q14 — manipulation de marché ---------------------------------------
      // (a) angle : une stratégie légitime, même à grande échelle
      [
        "A member believes a stock is overvalued based on independent fundamental analysis and takes a large short position, without disseminating any false or misleading information. This is:",
        [
          "permitted, since Standard II(B) does not preclude legitimate trading strategies based on genuine analysis.",
          "a violation, since large short positions inherently manipulate market prices.",
          "a violation, but only if the member's analysis later proves incorrect.",
        ],
        0,
        "Standard II(B), Market Manipulation, is aimed at deceptive practices that distort the price-setting mechanism, not at the size of a legitimately researched position. A large trade based on genuine, independently formed analysis is not manipulation merely because of its size, and it does not become a violation simply because the thesis later turns out to be wrong.",
      ],
      // (b) difficulté : une stratégie légitime AVEC un élément manipulateur ajouté
      [
        "A member identifies a genuine short-term pricing inefficiency in a thinly traded security through independent analysis. To profit from it, she also places several small buy and sell orders with no intention of executing them, solely to create the appearance of increased trading activity and attract other investors' attention to the stock before closing her position. Has she most likely violated Standard II(B)?",
        [
          "No, since her original strategy is based on a genuine market inefficiency.",
          "No, since the orders were small and unlikely to meaningfully affect the price.",
          "Yes, placing orders with no intention to execute, in order to create a false impression of trading activity, is manipulative regardless of the legitimacy of the underlying strategy.",
        ],
        2,
        "A legitimate analytical basis for a trading strategy does not excuse a separate manipulative tactic layered on top of it — placing orders with no genuine intention to execute them, purely to create a false impression of activity, is classic market manipulation, regardless of how small the orders are or how sound the underlying thesis is.",
      ],

      // ---- Q15 — adéquation, produit dérivé illiquide -------------------------
      // (a) angle : le même produit, adapté à un autre profil de client
      [
        "The same thinly traded, leveraged derivative product is instead proposed for a single sophisticated client with a stated objective of aggressive growth, high risk tolerance, and no liquidity needs for this position, with an allocation of just 5% based on the same investment bank research. Has the manager most likely violated Standard III(C), Suitability?",
        [
          "Yes, regardless of client profile, since the product itself is inherently unsuitable for anyone.",
          "No, since the product's risk and liquidity characteristics are consistent with this specific client's objectives, risk tolerance, and circumstances.",
          "Yes, since any allocation to a leveraged product always requires special client pre-approval regardless of suitability.",
        ],
        1,
        "Suitability turns on the fit between a specific product and a specific client's objectives, risk tolerance, and circumstances — not on whether a product is inherently risky. A leveraged, illiquid product that would be unsuitable for a conservative, risk-averse client base can be entirely appropriate, at a modest allocation, for a client whose profile and stated objectives align with it.",
      ],
      // (b) difficulté : un processus soigné mais avec une allocation réduite
      [
        "The same conservative, risk-averse government-entity accounts are involved. This time, before investing, the manager explicitly evaluates the product's illiquidity and leverage characteristics against each client's investment policy statement, concludes they are inconsistent with a 10% allocation, but instead allocates only 2% per account, documenting it as a limited exposure to a high-conviction idea. Has the manager most likely violated Standard III(C)?",
        [
          "Yes, since any allocation to a leveraged, illiquid product is automatically unsuitable for a conservative, risk-averse client base.",
          "No, provided her documented analysis reasonably concludes the smaller, limited allocation remains consistent with each client's overall risk profile and objectives.",
          "Yes, since she previously considered a 10% allocation, which taints any subsequent smaller allocation to the same product.",
        ],
        1,
        "Suitability is judged on the actual investment decision and its fit with the client's overall portfolio and risk tolerance, supported by a reasoned process — not by a blanket rule against ever touching a given product type, and not tainted by an earlier, larger allocation that was ultimately rejected in favor of a smaller, better-considered one.",
      ],

      // ---- Q16 — conflits d'intérêts et double casquette ----------------------
      // (a) angle : appliquer le même principe à un cas d'analyste/administrateur
      [
        "An equity analyst at a brokerage firm also serves as an independent director of a company she covers in her research. Under Standard VI(A), Avoid or Disclose Conflicts, the analyst can most likely continue covering the company and serving as a director if she:",
        [
          "makes full and fair disclosure of the board position in her research reports and to her employer.",
          "resigns from the board immediately, since covering a company while serving on its board is always prohibited outright.",
          "simply avoids issuing any negative recommendations about the company to prevent the appearance of a conflict.",
        ],
        0,
        "As with any conflict of interest under Standard VI(A), full and fair disclosure — here, of the board seat, both to her employer and in her published research — is the mechanism that allows the analyst to continue both roles, rather than requiring her to give one up outright. Deliberately avoiding negative recommendations would itself compromise the independence and objectivity her research is supposed to provide.",
      ],
      // (b) difficulté : la divulgation face à une objection explicite
      [
        "In a similar situation, an independent board member makes full and fair disclosure to both companies before undertaking a feasibility study for a foreign competitor entering his board company's market — but the board company's board explicitly objects, citing serious competitive concerns, and he proceeds with the assignment anyway. Has he most likely violated the Standards?",
        [
          "No, since full disclosure alone always satisfies Standard VI(A) regardless of any party's objection.",
          "No, since his obligations run only to the foreign manufacturer, which is paying him for the study.",
          "Yes, most likely, since proceeding despite the board company's clearly expressed objection, given the real conflict his board role creates, goes beyond what disclosure alone can resolve.",
        ],
        2,
        "Disclosure is necessary but is not automatically sufficient when a party with a legitimate stake — here, the company whose board he serves — has clearly and specifically objected on competitive grounds; proceeding regardless suggests the underlying conflict was not actually resolved by disclosure alone.",
      ],

      // ---- Q17 — information matérielle non publique --------------------------
      // (a) angle : le cas inverse — une information clairement matérielle
      [
        "In a similar situation, an analyst instead overhears senior bank executives discussing a specific, imminent acquisition target and the expected premium to be paid, in a conversation clearly about to become public within days. Under Standard II(A), she could most likely use this information when making an investment recommendation:",
        [
          "immediately, since she obtained it inadvertently rather than through a breach of duty.",
          "only once the information has been publicly disseminated and had time to be absorbed by the market.",
          "at any time, provided she does not disclose the source of the information.",
        ],
        1,
        "How the information was obtained does not matter if it is genuinely material and nonpublic — an analyst who overhears details of an imminent, price-moving acquisition, even by chance, must wait until that information is publicly disseminated and absorbed by the market before using it, unlike information about routine staff changes unlikely to move the share price.",
      ],
      // (b) difficulté : déterminer si une information EST matérielle
      [
        "While overhearing the same kind of conversation, an analyst also learns that a company's chief financial officer is expected to depart within the year for personal reasons unrelated to performance, with no successor yet identified. Which factor is most relevant to determining whether this information is material before she uses it in her recommendations?",
        [
          "Whether disclosure of the CFO's planned departure would likely be viewed by a reasonable investor as significantly altering the total mix of information about the company.",
          "Whether the information was obtained in a public place, such as an airport lounge.",
          "Whether the analyst personally believes the CFO's departure to be significant.",
        ],
        0,
        "Materiality turns on whether a reasonable investor would view the information as significantly changing the total mix of available information about the company — not on where the information happened to be overheard, and not on the analyst's own subjective opinion of its importance.",
      ],

      // ---- Q18 — connaissance de la loi ---------------------------------------
      // (a) angle : ce qui n'est PAS exigé
      [
        "A member conducts business exclusively within a single country. Under Standard I(A), Knowledge of the Law, the member is most likely required to:",
        [
          "understand and comply with the applicable laws and regulations of that country, relying on legal counsel and compliance staff as needed for technical expertise.",
          "personally memorize every statute and regulation that could conceivably apply to any aspect of the firm's business.",
          "have no independent knowledge of the law at all, since compliance staff bear full responsibility.",
        ],
        0,
        "Standard I(A) requires members to understand the laws and regulations applicable to where they conduct business, but it does not require encyclopedic personal mastery of every possible statute — members are expected and permitted to rely on legal counsel and compliance professionals as subject-matter experts, while still maintaining a working understanding themselves.",
      ],
      // (b) difficulté : conflits de juridiction, la règle la plus stricte
      [
        "A member's home country has minimal securities regulation, but she manages assets for clients located in a country with stricter disclosure requirements. Which law or standard should most likely govern her conduct with respect to those clients?",
        [
          "Her home country's law only, since that is where she is licensed.",
          "CFA Institute Standards only, since they supersede all local law in every jurisdiction.",
          "The stricter of the applicable law/regulation and the CFA Institute Standards.",
        ],
        2,
        "When applicable laws differ across the jurisdictions relevant to an engagement, members must follow the stricter of the applicable law or regulation and the CFA Institute Code and Standards — neither the more permissive home-country rule nor a blanket assumption that the Standards always override local law is correct.",
      ],

      // ---- Q19 — traitement équitable et comptes familiaux ---------------------
      // (a) angle : le cas inverse — une exclusion légitime
      [
        "In a similar oversubscribed IPO allocation, an investment professional excludes his mother's account, which he manages for free as a personal favor and which is not treated as a fee-paying client account of the firm in any other respect. Has he most likely violated Standard III(B), Fair Dealing?",
        [
          "Yes, since all family-member accounts must always be treated identically to other client accounts.",
          "No, most likely not, since an account not managed similarly to the firm's other fee-paying client accounts may be treated differently without violating fair dealing.",
          "Yes, since excluding any account from an IPO allocation is inherently unfair regardless of its nature.",
        ],
        1,
        "The fair-dealing test for family-member accounts is whether they are managed similarly to the firm's other client accounts. An account handled informally, for free, as a personal favor, and not treated like a regular fee-paying client account, may reasonably be excluded — the opposite of a regular fee-paying family account, which must not be singled out for exclusion.",
      ],
      // (b) difficulté : l'obligation qui suit un incident involontaire
      [
        "Referring to a technical email failure that caused one client to miss a premium-services offer sent to all other clients simultaneously, which of the following best describes the firm's ongoing obligation under Standard III(B), Fair Dealing, once it becomes aware of the failure?",
        [
          "None, since the firm attempted in good faith to notify all clients simultaneously and the failure was inadvertent and outside its control.",
          "It should take reasonable steps to ensure the affected client receives the same opportunity as other clients once the failure is discovered.",
          "It must cancel the premium-services offer for all clients to restore equal treatment.",
        ],
        1,
        "An inadvertent technical failure does not itself violate fair dealing, but once the firm becomes aware that a client was left out through no fault of their own, its duty to treat clients fairly extends to taking reasonable remedial steps — such as separately extending the same offer — rather than simply leaving the outcome uncorrected.",
      ],

      // ---- Q20 — présentation de la performance --------------------------------
      // (a) angle : la bonne pratique pour un groupe de comptes similaires
      [
        "Without adopting GIPS, which practice is most consistent with Standard III(D), Performance Presentation, when a member wants to present the performance of several similar discretionary accounts together?",
        [
          "presenting the return of a single representative account as indicative of all similar accounts' performance.",
          "presenting whichever single account within the group had the best performance during the period.",
          "presenting an asset-weighted composite of all similar discretionary accounts, rather than a single account in isolation.",
        ],
        2,
        "A fair presentation of a group of similarly managed accounts uses a composite that aggregates them, typically asset-weighted, rather than singling out one representative or best-performing account — the latter two approaches can easily overstate or misrepresent what clients in the group actually experienced.",
      ],
      // (b) difficulté : appliquer la règle des comptes résiliés
      [
        "A member presents a composite's five-year performance history. One account was terminated after year 3 due to the client's death (unrelated to performance) and is included in the historical composite returns for years 1–3. Under Standard III(D), is this presentation most likely appropriate?",
        [
          "Yes, provided the presentation clearly indicates when the account was terminated and why it is no longer included.",
          "No, since terminated accounts must always be excluded entirely from historical performance once they leave the composite.",
          "Yes, but only if the terminated account's performance is excluded from all periods, including years 1–3.",
        ],
        0,
        "Standard III(D) allows a member to include a terminated account's performance for the periods during which it was actually part of the composite, provided the presentation clearly discloses when the account left — the account is not required to be scrubbed from history entirely, nor kept only under an unreasonably strict all-or-nothing rule.",
      ],

      // ---- Q21 — indépendance et objectivité -----------------------------------
      // (a) angle : une procédure erronée mêlée à une correcte
      [
        "Members should encourage their firms to establish which of the following procedures under Standard I(B), Independence and Objectivity? Procedure 1: Prohibit analysts from ever meeting privately with company management, to preserve strict independence. Procedure 2: Require pre-approval and disclosure of any gifts from corporate issuers that exceed a modest, firm-set threshold.",
        ["Procedure 1 only.", "Procedure 2 only.", "Both Procedure 1 and Procedure 2."],
        1,
        "Meetings with company management are a normal and useful part of research and are not what Standard I(B) targets — an outright ban on ever meeting privately with management goes beyond the Standard's actual concerns. Limiting and disclosing gifts from issuers above a set threshold, by contrast, is a genuine recommended procedure aimed at the real risk: undue influence through gifts or favors, not access to management itself.",
      ],
      // (b) difficulté : appliquer la procédure de la liste restreinte
      [
        "A firm is unwilling to publish a negative research report on a large investment-banking client. Consistent with the recommended procedures for Standard I(B), which of the following is the most appropriate way to handle this situation going forward?",
        [
          "Continue publishing only positive opinions on the company to maintain the client relationship.",
          "Place the company on a restricted list and limit any further published commentary to factual information only.",
          "Discontinue all research coverage of every company in the same industry to avoid any appearance of bias.",
        ],
        1,
        "When a firm is unwilling to permit an unfavorable opinion to be published about a company, the recommended response is to place that company on a restricted list and confine any further public commentary to purely factual information — not to keep publishing biased positive opinions, and not to overreact by dropping coverage of an entire, unrelated industry.",
      ],

      // ---- Q22 — normes les moins probablement violées -------------------------
      // (a) angle : isoler la violation de la vente du rapport
      [
        "An economist at a global investment bank issues a bearish forecast on a commodity's long-term price trend, and also secretly sells a copy of his report to a widely followed internet site before its official release. This second action most likely violates the Standard relating to:",
        [
          "additional compensation arrangements, since he receives compensation from a third party related to his employment activities, without his employer's knowledge or consent.",
          "priority of transactions, since third parties should never receive investment research before clients.",
          "misrepresentation, since selling research to outside parties misrepresents its exclusivity.",
        ],
        0,
        "Standard IV(B), Additional Compensation Arrangements, is violated when a member accepts compensation from a party outside the employment relationship for services connected to that employment, without the employer's knowledge and consent — exactly what secretly selling the report to a third-party website represents, independent of any other issues in a broader fact pattern.",
      ],
      // (b) difficulté : un nouveau cas à trois normes
      [
        "A widely followed analyst learns, ahead of the public, that his own firm's trading desk is about to execute a large block trade in a thinly traded stock for a major client. Before that trade executes, he buys shares for his personal account, then issues a bullish public report timed to coincide with the client's own selling into the resulting price strength — a fact he discloses to no one. He receives no payment from any outside party for any of this. The analyst least likely violated the Standard relating to:",
        [
          "priority of transactions, since client transactions should have priority over personal transactions.",
          "material nonpublic information, since he traded ahead of knowledge of his own firm's pending block trade.",
          "additional compensation arrangements, since no outside party paid him anything in this scenario.",
        ],
        2,
        "With no outside party paying him anything, Additional Compensation Arrangements simply is not implicated here. He clearly violates Priority of Transactions by trading ahead of his employer's client, and Material Nonpublic Information by acting on advance knowledge of the pending block trade before it became public.",
      ],

      // ---- Q23 — diligence et base raisonnable ----------------------------------
      // (a) angle : le cas inverse — pas de raison objective de douter
      [
        "In a similar situation, a portfolio manager has no specific reason to doubt the validity of a bank-approved research vendor's research as applied to her market — she simply prefers a local vendor out of familiarity and personal relationships, without having conducted any due diligence comparing the two. Which vendor should she use to avoid violating the Standards?",
        [
          "The local vendor, since personal preference is a sufficient basis for the choice.",
          "The bank-approved vendor, absent any objective reason to doubt its reliability for her market, or a properly diligenced local alternative.",
          "Either vendor, since both are acceptable regardless of due diligence.",
        ],
        1,
        "Standard V(A), Diligence and Reasonable Basis, permits departing from a firm-approved research source when there is genuine, substantiated doubt about its reliability — not merely personal preference or unfamiliarity. Absent an objective basis for doubt, or diligence actually performed on the alternative, the firm-approved source remains the appropriate choice.",
      ],
      // (b) difficulté : des doutes partiels et l'obligation d'évaluer
      [
        "A portfolio manager has some, but not conclusive, doubts about a bank-approved research vendor's applicability to her local market. She decides to continue using it because switching entirely is impractical in the short term. Under Standard V(A), which of the following is most appropriate?",
        [
          "She may rely on the vendor's research so long as she has a reasonable basis for believing it is sound, which may include periodically evaluating the vendor's process and the quality and timeliness of its data.",
          "She must immediately cease using the vendor entirely at the first sign of any doubt.",
          "She has no obligation to evaluate third-party research at all, since responsibility rests solely with the vendor.",
        ],
        0,
        "Diligence and reasonable basis does not require abandoning a research source at the first hint of doubt, nor does it let a member rely blindly on a vendor without ever assessing it — the appropriate response to partial doubts is ongoing, periodic evaluation of the vendor's process and data quality to maintain a reasonable basis for continued reliance.",
      ],

      // ---- Q24 — tenue des dossiers ----------------------------------------------
      // (a) angle : ajouter une vraie violation du traitement équitable
      [
        "The same adviser, in addition to rarely updating client records, also allocates a particularly attractive new bond issue first to her longtime family-member clients, before offering any remaining allocation to her other, non-family clients. Which Standard(s) has she most likely violated?",
        ["record retention only.", "fair dealing only.", "both record retention and fair dealing."],
        2,
        "Rarely updating client records, without maintaining adequate know-your-client information, remains a record-retention violation on its own. Systematically favoring family-member clients in a desirable new-issue allocation, ahead of other clients, is a separate and additional violation of fair dealing — the two issues are independent of each other and both apply here.",
      ],
      // (b) difficulté : la durée de conservation recommandée
      [
        "Under Standard V(C), Record Retention, in the absence of any specific regulatory or firm-imposed requirement, members and candidates should generally retain records supporting their investment actions and recommendations for a minimum of:",
        ["seven years.", "one year.", "indefinitely, since records may never be destroyed."],
        0,
        "Absent a stricter regulatory or firm-specific requirement, CFA Institute's recommended guidance is that members retain supporting records for a minimum of seven years — a specific baseline that goes beyond simply knowing that records must be kept, which is the more basic point tested by the original scenario.",
      ],

      // ---- Q25 — communication avec les clients ----------------------------------
      // (a) angle : une activité déjà couverte par le processus divulgué
      [
        "In a similar fund, the manager writes and sells covered call options against a small, clearly disclosed \"tactical income enhancement\" sleeve of the portfolio, exactly as described in the fund's investment process documentation already provided to clients. The options later expire and boost returns modestly; this specific instance is not separately called out in the next client update, though it was already covered by the standing process description. Has the manager most likely violated Standard V(B), Communication with Clients and Prospective Clients?",
        [
          "Yes, since any use of derivatives must be separately disclosed in every client update regardless of prior disclosure.",
          "Yes, since all option activity constitutes a material change requiring update, regardless of context.",
          "No, most likely not, since the activity was already consistent with, and covered by, the investment process previously disclosed to clients.",
        ],
        2,
        "Standard V(B) requires prompt disclosure of changes that might materially affect the investment process — not a fresh announcement every time a manager does something the process already describes. A routine instance of a previously and clearly disclosed strategy does not itself trigger a new disclosure obligation.",
      ],
      // (b) difficulté : juger le caractère matériel d'un changement non divulgué
      [
        "A fund manager's disclosed investment process states that the fund \"invests exclusively in cash equities, using fundamental, bottom-up stock selection.\" Midway through the year, the manager begins using stock index futures to manage the fund's overall market exposure alongside the existing equity selections, without updating any client communication. Has the manager most likely violated Standard V(B)?",
        [
          "No, since futures and equities are both traded on public exchanges and are equally transparent to investors.",
          "Yes, since introducing derivatives and a market-exposure overlay is a material change to the previously disclosed \"cash equities only\" process that must be promptly disclosed.",
          "No, since Standard V(B) only requires disclosure of changes to individual security selection, not to overall portfolio construction techniques.",
        ],
        1,
        "Departing from a specifically stated \"cash equities only\" mandate by introducing derivatives and a market-exposure overlay is a material change to the disclosed investment process, and Standard V(B) requires such changes to be promptly disclosed — unlike the more routine case where an activity was already covered by existing disclosure.",
      ],

      // ---- Q26 — inconduite -------------------------------------------------------
      // (a) angle : une conduite privée QUI relève de la norme
      [
        "A member is convicted of tax fraud in his personal finances, unrelated to any professional client work. Is this most likely covered by Standard I(D), Misconduct?",
        [
          "No, since Standard I(D) applies only to conduct occurring within a member's professional duties.",
          "No, since only conduct explicitly related to investment management activities is covered.",
          "Yes, most likely, since conduct involving dishonesty such as fraud reflects poorly on the member's professional integrity and reputation, even though it occurred in a personal context.",
        ],
        2,
        "What matters under Standard I(D) is whether conduct reflects poorly on a member's professional integrity, reputation, or competence — not whether it technically occurred within professional duties. Fraud is exactly the kind of dishonest conduct that reaches into private life and still implicates the Standard.",
      ],
      // (b) difficulté : une conduite privée qui NE relève PAS de la norme
      [
        "A member is going through a highly publicized, contentious divorce, unrelated to any dishonesty, fraud, or deceit, and not involving her professional competence or any client dealings. Is this most likely covered by Standard I(D), Misconduct?",
        [
          "No, most likely not, since Standard I(D) targets conduct involving dishonesty, fraud, or deceit, or that otherwise reflects poorly on professional integrity, reputation, or competence — a personal event lacking those elements does not, by itself, qualify.",
          "Yes, since any conduct that becomes publicly known automatically falls under Standard I(D).",
          "Yes, since Standard I(D) covers all personal life events, regardless of their nature.",
        ],
        0,
        "The scope of Standard I(D) is not simply \"anything private that becomes public\" — it is conduct involving dishonesty, fraud, deceit, or that otherwise reflects poorly on professional integrity, reputation, or competence. A difficult personal life event with none of those elements generally falls outside the Standard, in contrast with conduct like fraud that does implicate professional integrity even in a private context.",
      ],

      // ---- Q27 — rémunération additionnelle --------------------------------------
      // (a) angle : le consentement préalable corrige le problème
      [
        "In a similar situation, before providing any investment advice to her friend in exchange for a charitable donation, an adviser first obtains written consent from her employer describing the arrangement, including that she will receive no cash payment. Has she most likely violated Standard IV(B), Additional Compensation Arrangements?",
        [
          "No, since she obtained her employer's written consent before beginning to provide the services.",
          "Yes, since any arrangement involving a conflict with the employer's interests is prohibited regardless of consent.",
          "No, since charitable donations are never considered compensation under the Standards.",
        ],
        0,
        "Standard IV(B) requires members to obtain permission from their employer before accepting compensation or benefits from third parties for services that could conflict with the employer's interests — obtaining written consent up front, before beginning the services, is exactly what cures the problem that an after-the-fact notification does not.",
      ],
      // (b) difficulté : quand la norme ne s'applique pas du tout
      [
        "A member provides pro bono investment education to a local high school's personal-finance club, entirely unrelated to her employer's business or client base, and receives no payment, gift, or benefit of any kind from the school or its students. Must she obtain her employer's written consent under Standard IV(B) before doing this?",
        [
          "Yes, all outside activities involving investment topics require prior written employer consent, regardless of compensation or conflict.",
          "No, most likely not, since Standard IV(B) is triggered by compensation or benefits from a third party, and none exists here, nor is there an apparent conflict with her employer's interests.",
          "Yes, but only a verbal notification to her employer is required, not written consent.",
        ],
        1,
        "Standard IV(B) is specifically about compensation or benefits received from third parties, and the conflicts of interest such arrangements can create — it is not a blanket requirement to seek consent for any outside activity that merely touches on investment topics. Genuinely unpaid, conflict-free volunteer work of this kind does not trigger the Standard.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Variantes — Mock A Session 1 — Éthique et Standards Professionnels...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
