// Variantes (2 par question) pour "Mock A — Session 1 — Éthique et
// Standards Professionnels".
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Mocks Officiels (Système)";

const QUIZ_SETS = [
  {
    title: "Mock A — Session 1 — Éthique et Standards Professionnels — Variantes",
    difficulty: 2,
    questions: [
      // Q1 — referral fees
      [
        "Which of the following statements are consistent with the Standard relating to referral fees? Statement 1: A member must disclose to their employer any referral fee received from a third party for referring clients. Statement 2: Such disclosure lets the employer evaluate the full cost of services provided on the client's behalf. Statement 3: A member only needs to disclose a referral fee arrangement if the client specifically asks about it.",
        ["Only Statement 1", "Only Statement 1 and Statement 2", "Statement 1, Statement 2, and Statement 3"],
        1,
        "Standard VI(C), Referral Fees, requires proactive disclosure of any benefit received for referrals — not only when asked. Statements 1 and 2 correctly describe the disclosure requirement and its purpose; Statement 3 is wrong because disclosure must happen regardless of whether the client asks.",
      ],
      [
        "Which of the following statements are consistent with the Standard relating to referral fees? Statement 1: Appropriate disclosure requires advising the client only after a formal service agreement has been signed. Statement 2: Members must disclose the nature of compensation received for referrals (e.g., flat fee versus percentage basis). Statement 3: Referral fee disclosures allow clients to assess potential partiality in a member's recommendations.",
        ["Only Statement 2 and Statement 3", "Only Statement 1", "Statement 1, Statement 2, and Statement 3"],
        0,
        "Disclosure must occur BEFORE entering into a formal agreement for services, not only after — so Statement 1 is incorrect. Statements 2 and 3 correctly describe what must be disclosed (the nature/value of compensation) and why (to let clients assess partiality).",
      ],
      // Q2 — GIPS initial presentation
      [
        "When first becoming compliant with the GIPS standards, an investment firm with 8 years of investment performance history must initially present a minimum of:",
        ["5 years of annual investment performance.", "8 years of annual investment performance.", "10 years of annual investment performance."],
        0,
        "A firm must initially present, at a minimum, five years of GIPS-compliant annual performance, then build up to a 10-year record over time — regardless of how many years of history it actually has available, it isn't required to show more than 5 years initially.",
      ],
      [
        "A newly GIPS-compliant firm has only 3 years of investment performance history available. Under the GIPS standards, the firm should initially present:",
        [
          "a minimum of 5 years regardless of how long the firm has existed.",
          "all 3 years available, then build up annually toward a 5-year (and eventually 10-year) record.",
          "a minimum of 10 years of performance history.",
        ],
        1,
        "A firm presents whatever compliant performance history it has (here, 3 years) if it has fewer than 5 years available, and then builds up its presented history year by year toward the 5-year minimum, and eventually toward 10 years.",
      ],
      // Q3 — CFA charter performance claim
      [
        "Elena Cruz, a sole proprietor investment advisor, stopped paying her CFA Institute dues two years ago. In a magazine interview, she states that being a CFA charterholder helped her deliver market-beating returns for clients. Which of Cruz's actions most likely violated the Standards?",
        [
          "Nonpayment of CFA Institute membership dues.",
          "Attributing her strong investment returns to participation in the CFA Program.",
          "Stating that the CFA charter improved her general analytical skills.",
        ],
        1,
        "Standard VII(B) prohibits claiming that the CFA credential caused superior investment performance. Nonpayment of dues alone isn't a violation if she doesn't misrepresent her status, and claiming the program improved her general skills is a permitted statement.",
      ],
      [
        "Mark Owusu is no longer a CFA Institute member due to unpaid dues. He tells a prospective client that his CFA charter is 'the reason' his portfolio outperformed its benchmark last year. This claim:",
        [
          "does not violate the Standards, since it is simply a general statement of confidence.",
          "violates the Standards, since members and candidates must not imply the charter caused superior performance.",
          "violates the Standards only because his CFA Institute dues are unpaid.",
        ],
        1,
        "Regardless of his membership status, directly attributing superior investment performance to holding the CFA charter violates Standard VII(B) — the charter should never be presented as a guarantee or cause of investment success.",
      ],
      // Q4 — loyalty vs confidentiality on departure
      [
        "Karim Haddad, CFA, is leaving his firm. Before departing, he calls his clients to inform them and, when asked, says he is leaving because he 'no longer trusts management' and predicts more departures are coming. Haddad has violated the Standard(s) relating:",
        ["only to loyalty.", "only to preservation of confidentiality.", "both to loyalty and to preservation of confidentiality."],
        0,
        "Haddad may inform clients he's leaving, but making disparaging, harmful statements about his employer's leadership violates his duty of loyalty (Standard IV(A)). No client-related confidential information is disclosed, so the confidentiality standard is not implicated.",
      ],
      [
        "Before leaving her firm, Priya Nair, CFA, tells clients the firm is 'financially unstable' — an unverified, disparaging claim — while informing them of her departure. Nair has violated the Standard(s) relating:",
        ["both to loyalty and to preservation of confidentiality.", "only to loyalty.", "only to preservation of confidentiality."],
        1,
        "Making harmful, unverified statements about her employer to clients violates her duty of loyalty under Standard IV(A). Since no client-specific confidential information is disclosed, the confidentiality standard is not violated.",
      ],
      // Q5 — GIPS promotional statements
      [
        "Silverline Advisors includes the following in its promotional materials: Statement 1: Our retained investment consultants endorse the GIPS standards. Statement 2: All of our pooled fund products comply with the GIPS standards, even though firm-wide compliance has not been achieved. Statement 3: GIPS compliance guarantees investors will earn superior risk-adjusted returns. Which statement is most consistent with the GIPS standards?",
        ["Statement 1", "Statement 2", "Statement 3"],
        0,
        "Investment consultants may claim to endorse the GIPS standards. GIPS compliance is a firm-wide requirement, so claiming product-level compliance without firm-wide compliance (Statement 2) is inconsistent, and GIPS compliance never guarantees investment performance (Statement 3).",
      ],
      [
        "Northbridge Capital includes the following in its marketing materials: Statement 1: Our external auditors have reviewed and endorse the GIPS standards on our behalf. Statement 2: Investment consultants who recommend our firm may state that they endorse the GIPS standards. Statement 3: GIPS compliance removes the need for prospective clients to perform their own due diligence. Which statement is most consistent with the GIPS standards?",
        ["Statement 1", "Statement 2", "Statement 3"],
        1,
        "Consultants (not auditors specifically) may claim to endorse the GIPS standards; Statement 2 correctly reflects this. GIPS compliance never eliminates the need for investor due diligence (Statement 3), and auditors 'endorsing' the standards on a firm's behalf isn't how GIPS verification/endorsement works (Statement 1).",
      ],
      // Q6 — confidentiality (partial IPS + sharing prospect info)
      [
        "Elena Petrova, CFA, has a prospective client who mentions she volunteers for a local animal shelter. Petrova mentions this to a friend who works at the shelter. The next week, Petrova prepares an IPS for the client, who withholds details about assets held outside the relationship, and signs a formal agreement based on that partial information. Petrova has most likely violated the Standard relating to:",
        ["suitability.", "preservation of confidentiality.", "diligence and reasonable basis."],
        1,
        "Sharing information the prospective client shared with her (that she volunteers at the shelter) with an outside friend violates Standard III(E), Preservation of Confidentiality. The suitability analysis is necessarily based only on information the client actually provides, so withheld information doesn't itself create a suitability violation.",
      ],
      [
        "Tomas Novak, CFA, learns that a prospective client is planning a career change to teaching. He mentions this to an acquaintance who works at a school the client is interested in. Novak later prepares the client's investment policy statement based on the partial financial information she provides and signs a formal advisory agreement. Novak has most likely violated the Standard relating to:",
        ["diligence and reasonable basis.", "suitability.", "preservation of confidentiality."],
        2,
        "Sharing information a prospective client disclosed to him with an outside acquaintance violates Standard III(E), Preservation of Confidentiality — this duty applies even to prospective clients, and even before a formal agreement is signed.",
      ],
      // Q7 — plagiarism / failing to cite
      [
        "Diego Alvarez, CFA, compiles a research report on the airline industry using data and conclusions drawn from several third-party analysts, forms his own overall opinion, and distributes the report to clients without disclosing or citing any of his sources. Alvarez has violated the Standards by:",
        [
          "failing to cite the work of others.",
          "failing to have a reasonable basis for his conclusions.",
          "incorporating other analysts' research into his own work.",
        ],
        0,
        "Standard I(C), Misrepresentation, prohibits presenting a report built from multiple uncited sources as one's own original work — members must disclose and cite sources. Using others' research is not itself a violation as long as it's properly acknowledged, and there's no indication his conclusions lacked a reasonable basis.",
      ],
      [
        "Amina Bello, CFA, prepares a sector outlook for retail clients by synthesizing data and views from three external research houses into her own summary opinion, without acknowledging any of the source material. Bello has most likely violated the Standards by:",
        [
          "incorporating other analysts' research into her own work.",
          "failing to disclose and cite the sources of her information.",
          "lacking a reasonable basis for her conclusions.",
        ],
        1,
        "Failing to disclose or cite the sources behind a report — even when the analyst forms her own overall opinion from them — misleads clients about the expertise behind the report, violating Standard I(C). Drawing on others' research is fine as long as it's properly acknowledged.",
      ],
      // Q8 — GIPS discretion definition
      [
        "According to the GIPS standards, a firm's definition of discretion is primarily used to establish criteria for judging which of the following?",
        [
          "The investment strategy the firm must implement.",
          "Portfolios the firm must include in a composite.",
          "Underperforming accounts the firm may exclude from a composite.",
        ],
        1,
        "A firm's definition of discretion establishes which portfolios must be included in a composite, based on the firm's ability to implement its chosen strategy for that portfolio — not the other way around, and firms may not selectively exclude accounts based on performance.",
      ],
      [
        "Under the GIPS standards, which of the following would a firm's definition of discretion most directly help determine?",
        [
          "Whether a client-restricted portfolio must still be included in a composite.",
          "Which benchmark is appropriate for a given composite.",
          "The firm's overall risk tolerance.",
        ],
        0,
        "A portfolio subject to client-imposed restrictions that prevent the firm from fully implementing its strategy would be judged 'non-discretionary' under the firm's discretion policy, and therefore excluded from the relevant composite — this is exactly the purpose of the discretion definition.",
      ],
      // Q9 — legal vs ethical
      [
        "Which of the following statements is most accurate?",
        ["All legal behaviors are ethical.", "Some legal behaviors may be considered unethical.", "All ethical behaviors are legal."],
        1,
        "Legal and ethical conduct are not always the same — some conduct that is legal in a jurisdiction may still be considered unethical, and vice versa, so neither 'all legal is ethical' nor 'all ethical is legal' holds universally.",
      ],
      [
        "Which of the following statements is most accurate?",
        ["Legal and ethical conduct are always identical.", "Illegal conduct is always considered unethical, without exception.", "Some ethical behaviors may be considered illegal in certain jurisdictions."],
        2,
        "Ethical and legal conduct overlap substantially but are not identical — some behaviors considered ethical may be illegal in a given jurisdiction (and some legal behaviors may be unethical), so absolute statements equating the two are incorrect.",
      ],
      // Q10 — GIPS verifier purpose
      [
        "Hiring an independent third-party GIPS standards verifier primarily serves to:",
        [
          "improve the firm's actual investment performance.",
          "increase confidence in the firm's claim of compliance with the GIPS standards.",
          "transfer legal responsibility for the compliance claim to the verifier.",
        ],
        1,
        "Verification provides assurance that a firm's policies and procedures for composite/pooled fund maintenance and performance calculation/presentation comply with the GIPS standards firm-wide — increasing confidence in the compliance claim. It doesn't affect actual performance, and the firm always remains responsible for its own compliance claim.",
      ],
      [
        "Which of the following best describes the role of an independent GIPS verifier?",
        [
          "Assuming the firm's legal responsibility for its GIPS compliance claim.",
          "Guaranteeing the accuracy of the firm's future investment returns.",
          "Providing assurance that the firm's policies and procedures comply with the GIPS standards on a firm-wide basis.",
        ],
        2,
        "A verifier assesses whether a firm's composite construction and performance presentation policies comply with GIPS on a firm-wide basis — this is voluntary and increases confidence in the claim, but responsibility for the compliance claim always remains with the firm itself.",
      ],
      // Q11 — itemized statement frequency
      [
        "According to the Standard relating to loyalty, prudence, and care, a member with control of client assets should submit to each client an itemized statement of their holdings and transactions at least:",
        ["quarterly.", "monthly.", "annually."],
        0,
        "Standard III(A) requires members with control of client assets to provide, at minimum, quarterly itemized statements showing funds/securities held plus all debits, credits, and transactions during the period.",
      ],
      [
        "A portfolio manager with custody of client assets is required, under the Standard on loyalty, prudence, and care, to send clients an itemized account statement no less frequently than:",
        ["semi-annually.", "quarterly.", "annually."],
        1,
        "Standard III(A) sets quarterly as the minimum required frequency for itemized statements to clients whose assets a member controls — semi-annual and annual frequencies are both less frequent than required.",
      ],
      // Q12 — supervisors / plain-language code of ethics
      [
        "Per the recommended procedures for compliance with the Standard on responsibilities of supervisors, a firm's stand-alone code of ethics should be:",
        [
          "fully merged into the detailed compliance procedures manual.",
          "written in plain language, addressing general fiduciary concepts without excessive detailed procedures.",
          "built primarily around incentive structures tied to firm revenue.",
        ],
        1,
        "Recommended procedures call for a stand-alone code of ethics in plain, accessible language covering general fiduciary principles — kept separate from (not merged into) detailed compliance procedures, and compensation should be tied to client interests and outcomes, not simply revenue generated.",
      ],
      [
        "Which of the following would a member most appropriately encourage her employer to do, per the recommended procedures for the Standard on responsibilities of supervisors?",
        [
          "Tie employee incentive structures primarily to revenue generated for the firm.",
          "Write a separate code of ethics in plain, accessible language.",
          "Integrate the code of ethics fully into detailed compliance procedures.",
        ],
        1,
        "The recommended approach favors a stand-alone code of ethics written in plain language, kept separate from detailed compliance procedures (which can obscure the underlying principles) — and incentive structures should reward client-focused outcomes, not simply revenue generation.",
      ],
      // Q13 — CFA exam conduct / social media
      [
        "Immediately after sitting for the CFA Level I exam, Amara posts on social media which broad topic areas were tested. She also posts a separate article questioning whether the CFA Program remains relevant to modern portfolio management. Has Amara violated the Standards?",
        ["No.", "Yes, by disclosing broad topic areas tested on the exam.", "Yes, by questioning the relevance of the CFA Program."],
        1,
        "Standard VII(A) prohibits disclosing broad topical areas tested or not tested on the exam. It does not, however, prohibit a candidate from expressing a personal opinion about the CFA Program in general — so only the topic-area disclosure is a violation.",
      ],
      [
        "Right after his CFA Level II exam, Théo posts on an online forum which specific formulas were NOT tested on the exam, hoping to help other candidates plan their studies. Has Théo violated the Standards?",
        ["No, since he only disclosed information not tested.", "Yes, by disclosing formulas not tested on the exam.", "Yes, but only if he names the exact questions asked."],
        1,
        "Standard VII(A) prohibits disclosure of broad topical areas AND formulas — whether tested or NOT tested — since this can still compromise exam security and fairness across administrations. Naming specific questions isn't required for a violation to occur.",
      ],
      // Q14 — market manipulation exception
      [
        "Which of the following is permitted under the Standards? A member:",
        [
          "executes personal trades based on a legitimate strategy exploiting a perceived market inefficiency.",
          "spreads rumors intended to create the impression of rising demand for a security.",
          "accumulates a dominant position in a commodity to manipulate the price of a related futures contract.",
        ],
        0,
        "Standard II(B) is not intended to preclude legitimate trading strategies based on perceived market inefficiencies — intent matters. Spreading false information to create a misleading impression of activity, or cornering a market to manipulate a related derivative, are both classic examples of prohibited market manipulation.",
      ],
      [
        "Which of the following actions would most likely be permitted under the Standard relating to market manipulation?",
        [
          "Disseminating a report the member knows is misleading, to move a security's price before trading on it personally.",
          "Trading on a proprietary quantitative signal believed to identify genuine, temporary mispricings.",
          "Coordinating with other traders to create the false appearance of heavy trading volume in a thinly traded stock.",
        ],
        1,
        "Legitimate strategies based on a genuine belief in a market inefficiency are permitted — the Standard targets manipulative intent, such as spreading misleading information or artificially inflating trading activity to deceive other market participants.",
      ],
      // Q15 — suitability violation (leveraged illiquid product)
      [
        "Nadia Osei, CFA, manages conservative, risk-averse endowment portfolios. She adds a newly issued, thinly traded, leveraged commodity note to several client accounts (a 12% allocation each), relying on comprehensive research from a reputable investment bank, without separately assessing the note's liquidity and leverage characteristics against each client's stated objectives. Did Osei most likely violate the Standards?",
        [
          "No.",
          "Yes, the Standard relating to suitability.",
          "Yes, the Standard relating to loyalty, prudence, and care.",
        ],
        1,
        "Osei violated Standard III(C), Suitability, by failing to consider the product's illiquidity and leverage relative to her conservative clients' objectives before committing a substantial allocation — relying on a reputable bank's research doesn't substitute for that suitability assessment.",
      ],
      [
        "Liam Fitzgerald, CFA, manages retirement portfolios for clients whose investment policy statements emphasize capital preservation. He allocates 15% of each portfolio to a newly issued, illiquid structured note with embedded leverage, based on solid third-party research, without independently evaluating whether the note's risk profile fits each client's stated objectives. Did Fitzgerald most likely violate the Standards?",
        [
          "Yes, the Standard relating to suitability.",
          "No.",
          "Yes, the Standard relating to diligence and reasonable basis.",
        ],
        0,
        "Even with solid supporting research, Fitzgerald violated Standard III(C), Suitability, by not evaluating whether the note's illiquidity and leverage were appropriate for capital-preservation-focused clients before making a substantial allocation.",
      ],
      // Q16 — conflicts of interest disclosure
      [
        "Farah Nasser, CFA, sits on the board of a regional steel producer and separately owns a consulting firm. A foreign steel company entering the same local market hires her consulting firm for a feasibility study. Under what circumstances can Nasser most likely undertake this engagement without violating the Standards?",
        [
          "By making full and fair disclosure of the potential conflict to both companies.",
          "By obtaining notarized written consent from the local company only.",
          "By signing confidentiality agreements with both companies.",
        ],
        0,
        "Standard VI(A), Avoid or Disclose Conflicts, requires full and fair disclosure of matters that could reasonably impair independence and objectivity or interfere with duties owed to each party — confidentiality agreements or one-sided consent don't satisfy this broader disclosure requirement.",
      ],
      [
        "Ravi Chandran, CFA, is an independent director of a domestic logistics company and also runs an advisory practice. A competing foreign logistics firm hires his advisory practice to assess entering the domestic market. Under what circumstances could Chandran most likely take on this assignment without violating the Standards?",
        [
          "By signing a non-disclosure agreement with the foreign firm only.",
          "By making full and fair disclosure to both companies of the potential conflict.",
          "By resigning from the board only after completing the assignment.",
        ],
        1,
        "Standard VI(A) requires full and fair disclosure to all parties whose interests could reasonably be affected by the conflict — a one-sided NDA or delayed resignation does not satisfy this disclosure obligation.",
      ],
      // Q17 — material nonpublic information (overheard)
      [
        "While at an industry conference, Julia Chen, CFA, overhears board members of a public company discussing plans to close an underperforming division. Under what circumstances could Chen most likely use this information when making an investment recommendation to clients?",
        [
          "Under no circumstances.",
          "If the discussed changes are unlikely to affect investor perception of the company.",
          "If she avoids naming the specific division discussed.",
        ],
        1,
        "Standard II(A) prohibits acting on MATERIAL nonpublic information — information is only material if its public disclosure would likely move the security's price. If the overheard changes are unlikely to affect investor perception, the information isn't material and can be used; withholding a specific detail doesn't by itself resolve materiality.",
      ],
      [
        "At a business-class airport lounge, an analyst overhears senior executives of a listed company discussing a minor internal reorganization affecting a small back-office team. Under what circumstances could the analyst most likely use this information in a recommendation?",
        [
          "If the reorganization is unlikely to be material to investors' perception of the company.",
          "Under no circumstances, since it was overheard from senior executives.",
          "Only if she confirms the information independently from a public source first.",
        ],
        0,
        "The key test under Standard II(A) is materiality — if the reorganization is minor and unlikely to move investor perception or the share price if disclosed, it isn't material nonpublic information and may be used, even without independent confirmation.",
      ],
      // Q18 — knowledge of law
      [
        "According to the Code and Standards regarding knowledge of laws and regulations, CFA Institute members and candidates must:",
        [
          "understand the applicable laws and regulations of the countries where they conduct business.",
          "memorize the complete text of securities law in every jurisdiction where they operate.",
          "complete a fixed minimum of continuing legal education hours each year.",
        ],
        0,
        "Standard I(A) requires members to understand applicable laws and regulations where they trade or conduct business — it does not require them to become legal experts (they may rely on legal counsel/compliance) or meet a specific continuing-education requirement.",
      ],
      [
        "Which of the following best describes a member's obligation under the Standard on knowledge of the law?",
        [
          "Relying entirely on legal counsel, with no personal understanding of applicable regulation required.",
          "Understanding the laws and regulations applicable in jurisdictions where the member does business.",
          "Passing a jurisdiction-specific legal examination before conducting business there.",
        ],
        1,
        "Members must understand (not necessarily master in legal-expert detail) the applicable laws and regulations where they trade or do business — some reliance on legal counsel is appropriate, but a baseline personal understanding is still required.",
      ],
      // Q19 — fair dealing / family member exclusion
      [
        "Yusuf Demir, CFA, offers a premium advisory tier to clients. One regular fee-paying client — his brother — is excluded from an oversubscribed IPO allocation to free up shares for other clients. Has Demir most likely violated the Standards?",
        ["No.", "Yes, the Standard relating to fair dealing.", "Yes, the Standard relating to communication with clients."],
        1,
        "Standard III(B), Fair Dealing, requires that family-member accounts managed similarly to other client accounts not be excluded from investment opportunities like an oversubscribed IPO — since his brother is a regular fee-paying client, excluding him specifically violates fair dealing.",
      ],
      [
        "Sofia Reyes, CFA, manages a fee-paying account for her cousin alongside her other clients. When a popular new fund offering is oversubscribed, Reyes excludes her cousin's account to make more shares available to other clients. Has Reyes most likely violated the Standards?",
        ["Yes, the Standard relating to fair dealing.", "No, since family accounts may reasonably be deprioritized.", "Yes, the Standard relating to suitability."],
        0,
        "Because the cousin's account is a regular, fee-paying client account managed like any other, deliberately excluding it from an oversubscribed offering to benefit other clients violates Standard III(B), Fair Dealing.",
      ],
      // Q20 — performance presentation / GIPS not mandatory
      [
        "Three colleagues discuss how to remain consistent with the Standard on performance presentation practices. Wei says: 'Members must apply the GIPS standards to meet their obligations.' Sam says: 'GIPS application isn't mandatory, but members should present a single representative account rather than a weighted composite.' Priya says: 'True, GIPS isn't mandatory, but members should include terminated accounts in performance history with a clear indication of when they were terminated.' Whose statement is correct?",
        ["Wei's statement", "Sam's statement", "Priya's statement"],
        2,
        "Standard III(D) can be satisfied without GIPS compliance, so Wei is wrong to call it mandatory. Members should use weighted composites of similar portfolios, not a single representative account, so Sam is also wrong. Priya correctly identifies both that GIPS isn't mandatory and that terminated accounts should remain in performance history with disclosure of their termination date.",
      ],
      [
        "Two portfolio managers discuss performance presentation obligations. Anders says: 'Compliance with the GIPS standards is required to satisfy Standard III(D).' Noor says: 'GIPS compliance isn't required, but excluding terminated accounts from a track record — without any disclosure — is an acceptable way to present performance.' Whose statement is correct?",
        ["Anders's statement", "Noor's statement", "Neither statement is correct."],
        2,
        "GIPS compliance is not mandatory to meet Standard III(D), so Anders is wrong. However, terminated accounts should still be included in performance history (with disclosure of the termination date), not silently excluded — so Noor is also wrong.",
      ],
      // Q21 — independence/objectivity procedures
      [
        "Members should encourage their firms to adopt which of the following procedures to help comply with the Standard on independence and objectivity? Procedure 1: Place a covered company on a restricted list if the firm is unwilling to publish an adverse opinion on it. Procedure 2: Prohibit employees from accepting travel reimbursement from corporate issuers when visiting the issuer's headquarters.",
        ["Procedure 1 only", "Procedure 2 only", "Both Procedure 1 and Procedure 2"],
        2,
        "Both are recommended compliance procedures under Standard I(B): restricting research coverage to factual-only reporting when the firm won't permit adverse opinions, and requiring members to pay their own commercial transportation/hotel costs rather than accept issuer-funded travel, even when meetings occur at the issuer's own offices.",
      ],
      [
        "Which of the following procedures would most help a firm comply with the Standard on independence and objectivity? Procedure 1: Require analysts to disclose gifts received from portfolio companies. Procedure 2: Cap the value of any gift an analyst may accept from an issuer being covered.",
        ["Procedure 1 only", "Procedure 2 only", "Both Procedure 1 and Procedure 2"],
        2,
        "Both disclosure requirements and monetary caps on gifts from covered issuers are recommended procedures for compliance with Standard I(B) — they reduce the risk that gifts compromise an analyst's independence and objectivity.",
      ],
      // Q22 — least likely violated (priority of transactions)
      [
        "Kazuya Kato, CFA, a widely followed bank economist, issues an exaggerated forecast of a long-term decline in a commodity's price after learning of a temporary oversupply, aiming to profit from the resulting volatility. He also secretly sells his report to an independent financial website, and beforehand emails the bank's portfolio managers a copy indicating his view will soon reverse, creating a trading opportunity. Kato least likely violated which of the following Standards?",
        ["Market Manipulation", "Priority of Transactions", "Additional Compensation Arrangements"],
        1,
        "Kato violated Standard II(B), Market Manipulation, by exaggerating his forecast to profit from resulting volatility, and Standard IV(B), Additional Compensation Arrangements, by secretly selling his report. Standard VI(B), Priority of Transactions, concerns client/employer trades having priority over the member's own trades — not implicated here, making it the standard least likely violated.",
      ],
      [
        "An equity strategist at a large asset manager publishes an unjustifiably bullish note on a small-cap stock, intending to sell his own shares into the resulting price rise, and separately accepts an undisclosed fee from a boutique newsletter to republish the note before clients see it. Which Standard was he least likely to have violated?",
        ["Market Manipulation", "Additional Compensation Arrangements", "Priority of Transactions"],
        2,
        "The unjustifiably bullish note issued to profit personally from the price impact violates Standard II(B), Market Manipulation, and the undisclosed fee from the newsletter violates Standard IV(B), Additional Compensation Arrangements. There's no indication his own trades were given priority ahead of client trades, so Standard VI(B), Priority of Transactions, is least likely to have been violated.",
      ],
      // Q23 — diligence/reasonable basis (unreliable vendor)
      [
        "Joyce La Valle, CFA, a portfolio manager located in a different country from her global bank's headquarters, is instructed to use a headquarters-approved equity research vendor. She doubts the vendor's research is valid for her local market and prefers a local vendor she has already vetted through her own due diligence. Which vendor should La Valle use to avoid violating the Standards?",
        ["The local vendor she has vetted.", "The headquarters-approved vendor.", "Both vendors, to cross-check results."],
        0,
        "Standard V(A), Diligence and Reasonable Basis, requires members to refrain from relying on research they have reason to suspect lacks a sound basis — since she doubts the headquarters vendor's validity for her market and has vetted a local alternative, she should rely on the local vendor.",
      ],
      [
        "An analyst based in an emerging market is directed by her firm's global headquarters to use a specific credit research provider whose coverage she believes doesn't adequately capture local market conditions. She has already performed her own due diligence on a specialized local provider. Which provider should she rely on to comply with the Standards?",
        ["The globally mandated provider, regardless of her concerns.", "The local provider she has vetted through her own due diligence.", "Neither provider, until headquarters resolves the disagreement."],
        1,
        "Under Standard V(A), a member who has reason to suspect a research source lacks a sound basis for a given market must not rely on it — she should use the vetted local provider whose reliability she has already established through her own due diligence.",
      ],
      // Q24 — record retention
      [
        "Tharushi Ranasinghe, CFA, president of a small advisory firm, manages portfolios mostly for longtime associates and family members. She stays in regular contact and adjusts portfolios after major life events, but rarely formally updates client records given her personal familiarity with their circumstances. Ranasinghe has most likely violated the Standard(s) relating to:",
        ["fair dealing only.", "record retention only.", "both fair dealing and record retention."],
        1,
        "Standard V(C), Record Retention, requires maintaining appropriate, up-to-date records supporting investment analyses and recommendations, even when a manager is personally familiar with a client — informal familiarity doesn't substitute for documented, current know-your-client records. Nothing here suggests unequal treatment of clients, so fair dealing is not implicated.",
      ],
      [
        "Hassan Ali, CFA, has advised a small group of close personal friends for over a decade and knows their financial situations intimately. Because of this familiarity, he rarely documents changes to their circumstances in his files. Ali has most likely violated the Standard relating to:",
        ["suitability.", "loyalty, prudence, and care.", "record retention."],
        2,
        "Standard V(C), Record Retention, requires maintaining current, documented records to support investment recommendations regardless of how well a member personally knows a client — personal familiarity is not a substitute for proper documentation.",
      ],
      // Q25 — communication with clients
      [
        "Raymond Tam, CFA, manages a local-equity fund and starts selling covered call options on some fund holdings to boost returns. Three months later the options expire worthless to the buyer and the fund reports improved returns; Tam does not mention the options strategy in his next client update. Tam has violated the Standard(s) relating to:",
        ["fair dealing only.", "communication with clients and prospective clients only.", "both fair dealing and communication with clients."],
        1,
        "Standard V(B) requires disclosing the general investment process used and promptly disclosing material changes to it. Introducing an options overlay strategy is such a change, and failing to mention it in client communications violates this Standard — Tam applied the strategy equally across the fund's investors, so fair dealing isn't implicated.",
      ],
      [
        "A fixed-income fund manager begins using interest-rate futures to hedge duration risk across the fund without informing investors of this change in approach. The strategy performs well, and the manager omits any mention of it from the next quarterly letter. This is most likely a violation of the Standard relating to:",
        ["loyalty, prudence, and care.", "communication with clients and prospective clients.", "fair dealing."],
        1,
        "Standard V(B) requires prompt disclosure of material changes to the investment process — introducing a new hedging strategy and failing to disclose it to investors, even though it performed well, violates this disclosure obligation.",
      ],
      // Q26 — misconduct scope
      [
        "The Standard relating to misconduct addresses:",
        [
          "only conduct that reflects poorly on a member's professional integrity, reputation, or competence.",
          "only conduct in a member's private life that violates the trust of others.",
          "both professional conduct and all conduct occurring in a member's personal life.",
        ],
        0,
        "Standard I(D), Misconduct, is aimed at conduct reflecting poorly on professional integrity, reputation, or competence — it primarily targets a member's professional life and does not extend to cover all conduct in a member's private life.",
      ],
      [
        "Which of the following best describes the scope of the Standard on misconduct?",
        [
          "It applies broadly to any dishonest act in a member's personal or professional life.",
          "It is aimed primarily at conduct related to a member's professional life that harms integrity, reputation, or competence.",
          "It applies only to conduct that has already resulted in a regulatory sanction.",
        ],
        1,
        "Standard I(D) is primarily aimed at professional conduct and actions that reflect poorly on a member's integrity, reputation, or competence — it doesn't extend to every aspect of a member's personal life, nor does it require a prior regulatory sanction to apply.",
      ],
      // Q27 — additional compensation arrangements
      [
        "Suzanna Bermi, CFA, manages retail portfolios. A friend asks her to provide investment advice in her spare time, offering to make a donation to Bermi's favorite charity in exchange. Bermi accepts and begins advising her friend right after emailing her firm's compliance department describing the arrangement, including that she receives no cash payment. Has Bermi most likely violated the Standards?",
        ["No.", "Yes, the Standard relating to additional compensation arrangements.", "Yes, the Standard relating to communication with clients."],
        1,
        "Standard IV(B) requires obtaining the employer's PERMISSION (not merely notifying compliance by email) before accepting compensation or other benefits — including a charitable donation given in exchange for services — from a third party for work that could conflict with the employer's interests.",
      ],
      [
        "A wealth manager agrees to give informal investment guidance to a neighbor in exchange for the neighbor doing home renovation work for free. The manager sends a brief note to her supervisor mentioning the arrangement and begins the advice the same week without waiting for a response. Has she most likely violated the Standards?",
        [
          "Yes, the Standard relating to additional compensation arrangements.",
          "No, since informing the supervisor is sufficient.",
          "Yes, the Standard relating to suitability.",
        ],
        0,
        "Standard IV(B) requires obtaining prior WRITTEN PERMISSION from the employer before accepting any compensation or benefit — including a bartered service like free renovation work — for outside services that could conflict with the employer's interests. Simply notifying a supervisor and proceeding without approval does not satisfy this requirement.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Variantes — Mock A Session 1 — Éthique...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
