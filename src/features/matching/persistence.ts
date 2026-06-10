import {
  DEFAULT_MATCH_WEIGHT_SET,
  MATCH_DIMENSIONS,
  type MatchWeightSet,
} from "./weights";

/**
 * Versioned match weights (matching_weight_sets, service-role managed).
 *
 * The active row is loaded once per materialization run and passed into
 * createCompanyMatch, which records weights_version on every computed match.
 * When the table is unreachable (no service role, no row, malformed weights)
 * the in-code DEFAULT_MATCH_WEIGHT_SET is the fallback — matching never
 * blocks on weight persistence.
 */

type WeightSetQueryResult = Promise<{
  readonly data: Record<string, unknown>[] | null;
  readonly error: { readonly message?: string } | null;
}>;

export interface MatchWeightSetClient {
  from(table: "matching_weight_sets"): {
    select(columns: string): {
      eq(
        column: "active",
        value: true,
      ): {
        order(
          column: string,
          options: { readonly ascending: boolean },
        ): { limit(count: number): WeightSetQueryResult };
      };
    };
  };
}

/** Parse one matching_weight_sets row; undefined when incomplete or invalid. */
export function parseMatchWeightSetRow(row: unknown): MatchWeightSet | undefined {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return undefined;
  }
  const record = row as Record<string, unknown>;
  const version = typeof record.version === "string" ? record.version.trim() : "";
  const weightsValue = record.weights;
  if (!version || !weightsValue || typeof weightsValue !== "object" || Array.isArray(weightsValue)) {
    return undefined;
  }

  const weightsRecord = weightsValue as Record<string, unknown>;
  const weights = {} as Record<(typeof MATCH_DIMENSIONS)[number], number>;
  for (const name of MATCH_DIMENSIONS) {
    const weight = weightsRecord[name];
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
      return undefined;
    }
    weights[name] = weight;
  }

  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    return undefined;
  }

  return { version, weights };
}

/**
 * Load the active versioned weight set. Falls back to the in-code defaults on
 * any failure. Pass an injectable client in tests; production resolves the
 * Supabase admin client lazily (service role).
 */
export async function loadActiveMatchWeights(
  client?: MatchWeightSetClient,
): Promise<MatchWeightSet> {
  try {
    const resolvedClient =
      client ??
      ((await import("../../lib/supabase/admin")).createAdminClient() as unknown as MatchWeightSetClient);

    const { data, error } = await resolvedClient
      .from("matching_weight_sets")
      .select("version,weights")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) {
      return DEFAULT_MATCH_WEIGHT_SET;
    }

    return parseMatchWeightSetRow(data[0]) ?? DEFAULT_MATCH_WEIGHT_SET;
  } catch {
    return DEFAULT_MATCH_WEIGHT_SET;
  }
}
