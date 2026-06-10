import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";
import { SCENARIOS } from "./matching-engine-fixtures.mjs";

/**
 * Characterization lock for the matching-engine refactor (Phase 10).
 *
 * The snapshot file was generated from the PRE-refactor engine on the frozen
 * fixtures. The refactored engine must reproduce it identically. The only
 * permitted difference is the ADDITIVE weights_version field introduced by
 * the versioned-weights work; it is asserted separately and stripped before
 * the deep comparison.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = JSON.parse(
  readFileSync(path.join(__dirname, "matching-engine-characterization.snapshot.json"), "utf8"),
);

const { createCompanyMatch, getEmployerMatchView, DEFAULT_MATCH_WEIGHTS_VERSION } =
  loadFromRepoRoot("src/features/matching/matching-engine.ts");

function stripAdditiveFields(match) {
  const rest = { ...match };
  delete rest.weights_version;
  return rest;
}

for (const [name, input] of Object.entries(SCENARIOS)) {
  test(`characterization: ${name} reproduces the pre-refactor output exactly`, () => {
    const match = createCompanyMatch(input);
    assert.deepEqual(
      JSON.parse(JSON.stringify(stripAdditiveFields(match))),
      SNAPSHOT[name],
      `${name} drifted from the frozen snapshot`,
    );
  });
}

test("characterization: employer view gating is unchanged", () => {
  const accepted = createCompanyMatch(SCENARIOS.full_accepted);
  const declined = createCompanyMatch(SCENARIOS.gate_failing_declined);
  const pending = createCompanyMatch(SCENARIOS.minimal);

  assert.equal(getEmployerMatchView(accepted).allowed, true);
  assert.equal(getEmployerMatchView(declined).allowed, false);
  assert.equal(getEmployerMatchView(pending).allowed, false);
});

test("every computed match records its weights version (additive field)", () => {
  for (const [name, input] of Object.entries(SCENARIOS)) {
    const match = createCompanyMatch(input);
    assert.equal(
      match.weights_version,
      DEFAULT_MATCH_WEIGHTS_VERSION,
      `${name} must record the in-code default weights version`,
    );
  }
});
