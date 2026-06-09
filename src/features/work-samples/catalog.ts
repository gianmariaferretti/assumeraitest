import type { ProhibitedWorkSampleSignal, WorkSampleDefinition } from "./types";

export const PROHIBITED_WORK_SAMPLE_SIGNALS: readonly ProhibitedWorkSampleSignal[] = [
  "direct_age",
  "protected_attribute",
  "accent",
  "personality",
  "biometric",
  "emotion",
  "face",
  "health",
  "family_status",
  "nationality",
];

const STANDARD_SAFE_EXECUTION = {
  mode: "local-static-tests",
  rawMediaRequired: false,
  allowedCapabilities: ["cpu-only", "standard-library", "local-read-only"],
  forbiddenCapabilities: ["network", "filesystem-write", "external-services"],
  memoryLimitMb: 256,
  requiresHumanReview: true,
  notes: [
    "Run only in a disposable local assessment workspace.",
    "Do not request external services, secrets, browser activity, or candidate device inspection.",
    "Use the work product and test results as reviewer evidence, not as an automatic hiring decision.",
  ],
} as const;

const STANDARD_RUBRIC_SAFETY = {
  confidenceGuidance:
    "Confidence increases with complete work product, clear evidence, and rubric coverage; low confidence triggers review rather than a lower quality score.",
  humanReviewGuidance:
    "A reviewer must inspect evidence, missing data, and context before any employer action.",
};

export const WORK_SAMPLE_LIBRARY: readonly WorkSampleDefinition[] = [
  {
    id: "python-api-bugfix-tests-v1",
    kind: "coding",
    title: "Fix and test a small order summary helper",
    version: "work-sample-v1.0.0",
    status: "active",
    timeboxMinutes: 35,
    prompt:
      "A small API helper groups order rows by customer and returns revenue totals. Fix the helper so cancelled rows are ignored, zero-quantity rows remain valid, and totals are rounded to cents.",
    candidateInstructions:
      "Make the smallest clear edit that satisfies the tests. Add one short note about the bug you fixed and any behavior you would confirm with a teammate.",
    expectedOutput:
      "A corrected helper, passing unit tests, and a brief explanation of the tradeoff or assumption.",
    antiTrickQuestionNotes: [
      "The task uses everyday API data handling rather than obscure algorithms.",
      "The expected behavior is stated directly in the prompt and tests.",
      "Reviewers grade correctness, tests, and explanation quality, not speed alone.",
    ],
    metadata: {
      roleFamilies: ["engineering"],
      skillTags: ["python", "sql", "api design", "fastapi", "tested code sample"],
      difficulty: "intermediate",
      estimatedReviewMinutes: 10,
    },
    prohibitedSignals: PROHIBITED_WORK_SAMPLE_SIGNALS,
    safeExecutionPlan: {
      ...STANDARD_SAFE_EXECUTION,
      timeLimitMinutes: 35,
    },
    coding: {
      language: "python",
      starterFiles: [
        {
          path: "order_summary.py",
          language: "python",
          contents: [
            "from decimal import Decimal, ROUND_HALF_UP",
            "",
            "",
            "def summarize_orders(rows):",
            "    totals = {}",
            "    for row in rows:",
            "        if not row.get('quantity'):",
            "            continue",
            "        if row.get('status') == 'cancelled':",
            "            continue",
            "        customer_id = row['customer_id']",
            "        amount = Decimal(str(row['unit_price'])) * Decimal(str(row['quantity']))",
            "        totals[customer_id] = totals.get(customer_id, Decimal('0')) + amount",
            "    return {key: float(value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)) for key, value in totals.items()}",
          ].join("\n"),
        },
      ],
      tests: [
        {
          id: "order-summary-behavior",
          title: "groups revenue while preserving zero quantity rows",
          command: "python -m pytest test_order_summary.py",
          assertions: [
            "cancelled rows do not contribute to totals",
            "zero-quantity rows are accepted and contribute 0.00",
            "currency totals round to two decimal places",
          ],
          contents: [
            "from order_summary import summarize_orders",
            "",
            "",
            "def test_groups_revenue_and_ignores_cancelled_rows():",
            "    rows = [",
            "        {'customer_id': 'cust-1', 'quantity': 2, 'unit_price': '10.005', 'status': 'paid'},",
            "        {'customer_id': 'cust-1', 'quantity': 1, 'unit_price': '10.00', 'status': 'cancelled'},",
            "        {'customer_id': 'cust-2', 'quantity': 0, 'unit_price': '99.99', 'status': 'paid'},",
            "    ]",
            "",
            "    assert summarize_orders(rows) == {'cust-1': 20.01, 'cust-2': 0.0}",
          ].join("\n"),
        },
      ],
    },
    rubric: {
      version: "rubric-v1.0.0",
      scoringVersion: "work-sample-scoring-v1.0.0",
      ...STANDARD_RUBRIC_SAFETY,
      criteria: [
        {
          id: "correctness",
          label: "Correctness",
          description: "The submitted helper implements the stated behavior and keeps edge cases explicit.",
          weight: 0.4,
          scoringGuidance:
            "Credit behavior demonstrated by tests and readable logic. Do not reward unrelated rewrites.",
          evidenceRequired: ["passing test output", "changed helper code"],
          disallowedSignals: ["typing speed", "unrelated framework knowledge"],
        },
        {
          id: "test-coverage",
          label: "Test coverage",
          description: "The candidate preserves or extends deterministic tests for the key behavior.",
          weight: 0.25,
          scoringGuidance:
            "Credit tests that would fail on the original bug and cover stated edge cases.",
          evidenceRequired: ["unit test file", "test command output"],
          disallowedSignals: ["large test count without relevant assertions"],
        },
        {
          id: "maintainability",
          label: "Maintainability",
          description: "The solution is small, readable, and suitable for review.",
          weight: 0.2,
          scoringGuidance:
            "Credit simple data handling, clear names, and minimal changes aligned to the prompt.",
          evidenceRequired: ["diff summary", "reviewer notes"],
          disallowedSignals: ["unrequested architecture rewrite"],
        },
        {
          id: "communication",
          label: "Communication",
          description: "The candidate explains the bug and the assumption they would confirm.",
          weight: 0.15,
          scoringGuidance:
            "Credit concise explanations grounded in the work product.",
          evidenceRequired: ["candidate note"],
          disallowedSignals: ["confidence without evidence"],
        },
      ],
    },
  },
  {
    id: "sdr-objection-follow-up-v1",
    kind: "writing",
    title: "Write a follow-up after a timing objection",
    version: "work-sample-v1.0.0",
    status: "active",
    timeboxMinutes: 20,
    prompt:
      "A prospect says the problem is relevant but the team is busy this quarter. Draft a short follow-up email and a CRM next step that keeps the opportunity useful without pressuring the prospect.",
    candidateInstructions:
      "Write the email and one CRM note. Keep it specific, respectful, and grounded in the prospect's stated business problem.",
    expectedOutput:
      "A concise email, a CRM next step, and a short reason for the chosen follow-up timing.",
    antiTrickQuestionNotes: [
      "The prompt states the buyer context and asks for a normal SDR work product.",
      "There is no hidden correct phrase or artificial puzzle.",
      "Reviewers grade relevance, structure, and judgment with evidence.",
    ],
    metadata: {
      roleFamilies: ["sales"],
      skillTags: ["outbound sales", "crm discipline", "objection handling", "german communication"],
      difficulty: "baseline",
      estimatedReviewMinutes: 8,
    },
    prohibitedSignals: PROHIBITED_WORK_SAMPLE_SIGNALS,
    safeExecutionPlan: {
      ...STANDARD_SAFE_EXECUTION,
      mode: "static-review",
      timeLimitMinutes: 20,
    },
    rubric: {
      version: "rubric-v1.0.0",
      scoringVersion: "work-sample-scoring-v1.0.0",
      ...STANDARD_RUBRIC_SAFETY,
      criteria: [
        {
          id: "buyer-relevance",
          label: "Buyer relevance",
          description: "The follow-up reflects the stated business problem and timing constraint.",
          weight: 0.35,
          scoringGuidance:
            "Credit concrete references to the prospect context and practical next steps.",
          evidenceRequired: ["email draft", "CRM note"],
          disallowedSignals: ["generic enthusiasm", "pressure tactics"],
        },
        {
          id: "crm-discipline",
          label: "CRM discipline",
          description: "The CRM note captures next action, timing, and reason clearly.",
          weight: 0.25,
          scoringGuidance:
            "Credit notes that another teammate could act on without extra context.",
          evidenceRequired: ["CRM next step"],
          disallowedSignals: ["activity volume without substance"],
        },
        {
          id: "communication",
          label: "Communication",
          description: "The message is concise, respectful, and easy to reply to.",
          weight: 0.25,
          scoringGuidance:
            "Credit clarity and appropriate tone for a professional sales conversation.",
          evidenceRequired: ["email draft"],
          disallowedSignals: ["native-speaker assumptions"],
        },
        {
          id: "judgment",
          label: "Follow-up judgment",
          description: "The timing recommendation balances persistence with buyer context.",
          weight: 0.15,
          scoringGuidance:
            "Credit a defensible follow-up interval and reason.",
          evidenceRequired: ["timing rationale"],
          disallowedSignals: ["aggressive urgency without evidence"],
        },
      ],
    },
  },
  {
    id: "tech-risk-control-gap-analysis-v1",
    kind: "analysis",
    title: "Summarize a control evidence gap",
    version: "work-sample-v1.0.0",
    status: "active",
    timeboxMinutes: 30,
    prompt:
      "A client provided screenshots of access approvals and a spreadsheet export of active users. Identify the likely control gap, the missing evidence, and the next clarification you would ask for before writing a finding.",
    candidateInstructions:
      "Produce three bullets: likely gap, missing evidence, and next clarification. Keep the answer practical and tied to the provided artifacts.",
    expectedOutput:
      "A concise control-gap assessment that separates observed evidence from assumptions.",
    antiTrickQuestionNotes: [
      "The task mirrors a small consulting work product and asks for limited conclusions.",
      "Candidates are not expected to know a proprietary framework.",
      "The rubric rewards evidence separation and review judgment.",
    ],
    metadata: {
      roleFamilies: ["consulting", "risk", "operations"],
      skillTags: ["risk analysis", "client communication", "sql", "structured analysis", "ai governance"],
      difficulty: "baseline",
      estimatedReviewMinutes: 8,
    },
    prohibitedSignals: PROHIBITED_WORK_SAMPLE_SIGNALS,
    safeExecutionPlan: {
      ...STANDARD_SAFE_EXECUTION,
      mode: "static-review",
      timeLimitMinutes: 30,
    },
    rubric: {
      version: "rubric-v1.0.0",
      scoringVersion: "work-sample-scoring-v1.0.0",
      ...STANDARD_RUBRIC_SAFETY,
      criteria: [
        {
          id: "evidence-separation",
          label: "Evidence separation",
          description: "The answer distinguishes observed evidence, inference, and missing data.",
          weight: 0.35,
          scoringGuidance:
            "Credit clear separation between what was provided and what still needs confirmation.",
          evidenceRequired: ["gap bullet", "missing evidence bullet"],
          disallowedSignals: ["unsupported certainty"],
        },
        {
          id: "risk-relevance",
          label: "Risk relevance",
          description: "The likely gap is relevant to access review and client control objectives.",
          weight: 0.3,
          scoringGuidance:
            "Credit specific risk reasoning tied to approvals and active-user evidence.",
          evidenceRequired: ["gap bullet"],
          disallowedSignals: ["framework jargon without artifact linkage"],
        },
        {
          id: "client-clarity",
          label: "Client clarity",
          description: "The clarification question is useful, answerable, and respectful of client time.",
          weight: 0.2,
          scoringGuidance:
            "Credit a next question that would change the finding or confidence.",
          evidenceRequired: ["clarification bullet"],
          disallowedSignals: ["open-ended fishing questions"],
        },
        {
          id: "review-judgment",
          label: "Review judgment",
          description: "The answer avoids overstating conclusions before evidence is complete.",
          weight: 0.15,
          scoringGuidance:
            "Credit appropriately cautious wording and clear reviewer handoff.",
          evidenceRequired: ["assessment language"],
          disallowedSignals: ["final finding without support"],
        },
      ],
    },
  },
];
