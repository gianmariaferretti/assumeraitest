export interface ProtectedSignal {
  signal: string;
  matchedText: string;
}

const PROTECTED_REQUIREMENT_PATTERNS: Array<{ signal: string; pattern: RegExp }> = [
  { signal: "direct_age", pattern: /\b(?:under|over)\s+\d{1,3}\b/i },
  { signal: "direct_age", pattern: /\baged?\s+\d{1,3}\b/i },
  { signal: "age_proxy", pattern: /\byoung\b|\bolder\b|\byouthful\b/i },
  { signal: "native_status_or_accent", pattern: /\bnative\s+(?:[a-z]+\s+){0,3}speaker(?:s)?\b/i },
  { signal: "native_status_or_accent", pattern: /\bmother\s+tongue\b|\bfirst\s+language\b|\baccent\b/i },
  { signal: "nationality", pattern: /\bcitizen(?:ship)?\b|\bpassport\b|\bnationality\b|\bnational\s+origin\b/i },
  { signal: "gender", pattern: /\bmale\b|\bfemale\b|\bman\b|\bwoman\b|\bgender\b/i },
  { signal: "family_status", pattern: /\bmarried\b|\bsingle\b|\bfamily\s+status\b|\bcaregiv(?:er|ing)\b/i },
  { signal: "pregnancy", pattern: /\bpregnan(?:t|cy)\b/i },
  { signal: "health_or_disability", pattern: /\bdisab(?:ility|led)\b|\bhealth\b|\bmedical\b/i },
  { signal: "religion", pattern: /\breligion\b|\bchristian\b|\bmuslim\b|\bjewish\b|\bhindu\b|\batheist\b/i },
  { signal: "race_or_ethnicity", pattern: /\brace\b|\bethnic(?:ity)?\b/i },
  { signal: "sexual_orientation", pattern: /\bsexual\s+orientation\b|\bgay\b|\blesbian\b|\bbisexual\b/i },
  { signal: "personality", pattern: /\bpersonality\b|\bintrovert(?:ed)?\b|\bextrovert(?:ed)?\b/i },
];

export function findProtectedRequirementSignals(text: string): ProtectedSignal[] {
  const signals: ProtectedSignal[] = [];

  for (const { signal, pattern } of PROTECTED_REQUIREMENT_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[0]) {
      signals.push({ signal, matchedText: match[0] });
    }
  }

  return signals;
}
