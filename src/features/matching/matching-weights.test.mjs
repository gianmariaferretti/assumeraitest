import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadFromRepoRoot } from "../../test-helpers/ts-loader.mjs";
import { FULL_ACCEPTED_INPUT } from "./matching-engine-fixtures.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const {
  createCompanyMatch,
  DEFAULT_MATCH_WEIGHTS,
  DEFAULT_MATCH_WEIGHT_SET,
  MATCH_DIMENSIONS,
  resolveWeights,
} = loadFromRepoRoot("src/features/matching/matching-engine.ts");
const { loadActiveMatchWeights, parseMatchWeightSetRow } = loadFromRepoRoot(
  "src/features/matching/persistence.ts",
);

const CUSTOM_WEIGHTS = Object.fromEntries(
  MATCH_DIMENSIONS.map((name) => [name, name === "InterviewEvidenceFit" ? 1 : 0]),
);

// ---------------------------------------------------------------------------
// Row parsing + fallback behavior
// ---------------------------------------------------------------------------

test("a well-formed weight-set row parses; malformed rows are rejected", () => {
  const valid = parseMatchWeightSetRow({ version: "match-weights-v1", weights: DEFAULT_MATCH_WEIGHTS });
  assert.deepEqual(valid, { version: "match-weights-v1", weights: DEFAULT_MATCH_WEIGHTS });

  assert.equal(parseMatchWeightSetRow(null), undefined);
  assert.equal(parseMatchWeightSetRow({ weights: DEFAULT_MATCH_WEIGHTS }), undefined);
  assert.equal(parseMatchWeightSetRow({ version: "v", weights: null }), undefined);
  assert.equal(
    parseMatchWeightSetRow({
      version: "v",
      weights: { ...DEFAULT_MATCH_WEIGHTS, RoleSkillFit: undefined },
    }),
    undefined,
    "a missing dimension invalidates the whole set",
  );
  assert.equal(
    parseMatchWeightSetRow({
      version: "v",
      weights: { ...DEFAULT_MATCH_WEIGHTS, RoleSkillFit: -1 },
    }),
    undefined,
  );
  assert.equal(
    parseMatchWeightSetRow({
      version: "v",
      weights: Object.fromEntries(MATCH_DIMENSIONS.map((name) => [name, 0])),
    }),
    undefined,
    "an all-zero set can never drive scoring",
  );
});

function clientReturning(result) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                order() {
                  return { limit: async () => result };
                },
              };
            },
          };
        },
      };
    },
  };
}

test("the active weight set is loaded from the table, with in-code fallback", async () => {
  const active = await loadActiveMatchWeights(
    clientReturning({
      data: [{ version: "match-weights-v1", weights: CUSTOM_WEIGHTS }],
      error: null,
    }),
  );
  assert.equal(active.version, "match-weights-v1");
  assert.equal(active.weights.InterviewEvidenceFit, 1);

  const onError = await loadActiveMatchWeights(
    clientReturning({ data: null, error: { message: "down" } }),
  );
  assert.deepEqual(onError, DEFAULT_MATCH_WEIGHT_SET);

  const onEmpty = await loadActiveMatchWeights(clientReturning({ data: [], error: null }));
  assert.deepEqual(onEmpty, DEFAULT_MATCH_WEIGHT_SET);

  const onMalformed = await loadActiveMatchWeights(
    clientReturning({ data: [{ version: "vX", weights: { RoleSkillFit: 1 } }], error: null }),
  );
  assert.deepEqual(onMalformed, DEFAULT_MATCH_WEIGHT_SET);

  // No client + no service role configured (test env) -> in-code defaults.
  const unreachable = await loadActiveMatchWeights();
  assert.deepEqual(unreachable, DEFAULT_MATCH_WEIGHT_SET);
});

// ---------------------------------------------------------------------------
// Versioned weights drive scoring; role calibration still overrides on top
// ---------------------------------------------------------------------------

test("a custom weight set changes the score and is recorded as weights_version", () => {
  const { role, ...rest } = FULL_ACCEPTED_INPUT;
  // Strip the role calibration override so the base set is fully visible.
  const input = {
    ...rest,
    role: { ...role, calibration: { ...role.calibration, weights: undefined } },
  };

  const defaultMatch = createCompanyMatch(input);
  const customMatch = createCompanyMatch({
    ...input,
    weightSet: { version: "match-weights-v1", weights: CUSTOM_WEIGHTS },
  });

  assert.equal(defaultMatch.weights_version, "match-weights-v0");
  assert.equal(customMatch.weights_version, "match-weights-v1");
  // All weight on InterviewEvidenceFit -> the match score IS that dimension.
  assert.equal(customMatch.match_score, customMatch.dimensions.InterviewEvidenceFit.score);
  assert.notEqual(customMatch.match_score, defaultMatch.match_score);
});

test("role calibration overrides apply on top of the versioned base set", () => {
  const resolved = resolveWeights({ RoleSkillFit: 0.5 }, CUSTOM_WEIGHTS);
  // Base says everything on InterviewEvidenceFit; the role moves half onto
  // RoleSkillFit; the result is re-normalized.
  assert.ok(Math.abs(resolved.RoleSkillFit - 1 / 3) < 1e-9);
  assert.ok(Math.abs(resolved.InterviewEvidenceFit - 2 / 3) < 1e-9);
  const total = Object.values(resolved).reduce((sum, weight) => sum + weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
});

// ---------------------------------------------------------------------------
// Migration seed stays in lockstep with the in-code defaults
// ---------------------------------------------------------------------------

test("matching_weight_sets is service-role only and seeds the in-code defaults", () => {
  const migrationsDir = path.join(rootDir, "supabase", "migrations");
  const migrationName = readdirSync(migrationsDir).find((name) =>
    name.includes("matching_weight_sets"),
  );
  assert.ok(migrationName, "expected the matching_weight_sets migration");
  const migration = readFileSync(path.join(migrationsDir, migrationName), "utf8");

  assert.match(migration, /create table if not exists public\.matching_weight_sets/);
  assert.match(migration, /alter table public\.matching_weight_sets enable row level security/);
  assert.match(
    migration,
    /revoke all privileges on table public\.matching_weight_sets from anon, authenticated/,
  );
  assert.doesNotMatch(migration, /create policy/);
  assert.match(migration, /matching_weight_sets_single_active_idx/);

  // The seeded JSON must equal DEFAULT_MATCH_WEIGHTS exactly.
  const seedJson = migration.match(/'(\{[\s\S]*?\})'::jsonb/)?.[1];
  assert.ok(seedJson, "expected a seed weights JSON literal");
  assert.deepEqual(JSON.parse(seedJson), DEFAULT_MATCH_WEIGHTS);
  assert.match(migration, /'match-weights-v0'/);
  assert.match(migration, /true,/);
});

test("the materializer loads the active set once and records weightsVersion", () => {
  const workspaceSource = readFileSync(
    path.join(rootDir, "src", "features", "company-workspace", "company-workspace.ts"),
    "utf8",
  );

  assert.match(workspaceSource, /loadActiveMatchWeights/);
  assert.match(workspaceSource, /weightSet,/);
  assert.match(workspaceSource, /weightsVersion: match\.weights_version/);
});
