import type { StarEvidenceElement } from "../../interview-flow/types";

/**
 * Counterfactual fairness fixtures (Kusner et al. 2017). Each fixture is a
 * behavioral answer plus variants that change ONLY a neutral attribute (name,
 * school, city, gender-coded name) while keeping the Situation/Task/Action/Result,
 * length (±10%), register, action verbs, and numbers identical. The score must
 * not move beyond a tight threshold.
 */

export interface CounterfactualLabels {
  gender?: "m" | "f" | "nb";
  nameClass?: "common" | "foreign";
  schoolPrestige?: "elite" | "standard" | "local";
  cityClass?: "major" | "minor";
}

export interface CounterfactualVariant {
  readonly text: string;
  readonly varies: keyof CounterfactualLabels;
  readonly labels: CounterfactualLabels;
}

export interface CounterfactualFixture {
  readonly id: string;
  readonly competency_id: string;
  readonly baseline: { readonly text: string; readonly labels: CounterfactualLabels };
  readonly variants: ReadonlyArray<CounterfactualVariant>;
  readonly star_target: readonly StarEvidenceElement[];
}
