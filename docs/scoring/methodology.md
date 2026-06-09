# AssumerAI scoring methodology

This document anchors every scoring choice to industry-standard literature so the
audit trail can cite a source for each threshold and formula. Scores are always
recommendations for human review, never automated hiring decisions.

## Pipeline

```
ensemble (variance ↓) → bootstrap CI (uncertainty) → Z-score (cross-role comparability)
counterfactual suite (invariance) ┐
adverse impact monitor (balance)  ┘  ← independent, ex-post detection
```

## Capabilities, formulas, thresholds

| Capability | File | Key formula / threshold (named const) |
|------------|------|----------------------------------------|
| Ensemble multi-rater | `src/features/scoring/bars/ensemble-evaluator.ts` | median score; modal level; majority STAR `≥ ceil(raters/2)`; `confidence = clamp01(1 − IQR/9)`; review if `level_agreement_ratio < 0.5` (`ENSEMBLE_REVIEW_MIN_AGREEMENT`) or `IQR ≥ 3` (`ENSEMBLE_REVIEW_IQR_WIDTH`); `DEFAULT_ENSEMBLE_RATERS = 3` |
| Inter-rater reliability | `src/features/scoring/bars/inter-rater-monitor.ts` | Cohen's κ; target `κ ≥ 0.70` |
| Bootstrap CI | `src/features/scoring/bootstrap.ts` | percentile bootstrap; `BOOTSTRAP_DEFAULT_ITERATIONS = 1000` (min 200); `BOOTSTRAP_DEFAULT_CONFIDENCE = 0.95` |
| Peer-cohort Z-score | `src/features/scoring/peer-cohort.ts` | `z = (score − mean) / stdev` (sample sd, n−1); `COHORT_INSUFFICIENT_BELOW = 10`, `COHORT_ESTABLISHED_AT_OR_ABOVE = 30` |
| Counterfactual fairness | `src/features/fairness/counterfactual/runner.ts` | invariance to neutral swaps; `COUNTERFACTUAL_DELTA_THRESHOLD = 1.0` (≈0.5σ) |
| Adverse impact | `src/features/audit/adverse-impact-monitor.ts` | four-fifths rule; `FOUR_FIFTHS_THRESHOLD = 0.8`, `WARN_THRESHOLD = 0.9`, `MIN_COHORT_APPLICANTS = 5` |

## References

- **Cohen, J. (1960).** _A coefficient of agreement for nominal scales._ Educational
  and Psychological Measurement — Cohen's κ for inter-rater agreement.
- **Efron, B. & Tibshirani, R. (1993).** _An Introduction to the Bootstrap._
  Chapman & Hall — percentile bootstrap confidence intervals.
- **Kusner, M., Loftus, J., Russell, C., Silva, R. (2017).** _Counterfactual
  Fairness._ NeurIPS — invariance of a decision to changing a sensitive attribute.
- **EEOC (1978).** _Uniform Guidelines on Employee Selection Procedures_ — the
  four-fifths (80%) rule for adverse impact.
- **EU AI Act, Annex III §4** — recruitment AI is high-risk; output bias must be
  monitored.
- **NIST AI RMF (2023)** — AI risk management, drift, and governance practices.

## Scientific honesty (limits)

- The **bootstrap CI is an internal reliability indicator** (how stable a score is
  given the evidence) — *not* predictive validity. Do not present it as "95% accurate".
- **Z-score** with n≈30 is acceptable for descriptive use but not benchmarking;
  cohorts stay flagged `emerging` until n ≥ 100.
- **Counterfactual fairness** over 20 fixtures is an empirical first defense, not a
  complete bias audit; a formal Differential Item Functioning analysis is planned
  pre-launch enterprise.
- **Adverse impact** on neutral proxies is an early-warning system, not a
  protected-attribute analysis (which requires explicit consent and a dedicated DPA).
- **Predictive validity** (interview score vs on-the-job performance) is wired via
  `hire_outcomes` and reported only once real hires accumulate.
