import { normalizeIngredientName } from "src/ingredients/ingredient.utils";
import { conversionOf, type ConvertibleKind } from "./units";

/**
 * Sums ingredients: the same ingredient and kind of unit become one line, converting within a kind
 * (g/kg, ml/l, TL/EL). Used for a single recipe and for collections.
 * Rules: guidelines projects/rezepte.md, "Ingredient list of a collection or group".
 */

/** Where a contribution comes from. A recipe has steps; a collection adds recipe and servings. */
export interface SummaryOrigin {
  stepId?: string;
  recipeId?: string;
  servings?: number;
}

export interface IngredientContribution {
  ingredientId?: string;
  name: string;
  amount?: number;
  unit?: string;
  /** Scaling, e.g. 2 when a recipe for 2 is used for 4 servings. */
  factor: number;
  origin: SummaryOrigin;
}

export interface SummaryPart {
  /** Scaled amount, null = "nach Bedarf". */
  amount: number | null;
  unit: string | null;
  origin: SummaryOrigin;
}

export interface IngredientSummaryLine {
  key: string;
  ingredientId?: string;
  name: string;
  /** Total in `unit`, null = "nach Bedarf". */
  amount: number | null;
  unit: string | null;
  /** True when the total was rounded. */
  approximate: boolean;
  parts: SummaryPart[];
}

const FREE = "free";
const PART_DECIMALS = 100;
const HALVES = 2;
const ROUNDING_TOLERANCE = 0.01;
const BASE_UNIT_THRESHOLD = 1000;
const TEASPOONS_PER_TABLESPOON = 3;

type LineKind = ConvertibleKind | typeof FREE | `unit:${string}`;

interface Accumulator {
  key: string;
  ingredientId?: string;
  name: string;
  kind: LineKind;
  /** Sum in the kind's base unit (g, ml, TL) or in the counted unit itself. */
  total: number;
  countedUnit: string | null;
  parts: SummaryPart[];
}

const PIECE = "Stück";

/** "2 Eier" (no unit) and "3 Stück Eier" are the same kind, so they end up on one line. */
function countedUnitOf(unit: string | undefined): string {
  return unit === PIECE ? "" : (unit ?? "");
}

function kindOf(contribution: IngredientContribution): LineKind {
  if (contribution.amount === undefined) {
    return FREE;
  }

  return (
    conversionOf(contribution.unit)?.kind ??
    `unit:${countedUnitOf(contribution.unit)}`
  );
}

function keyOf(contribution: IngredientContribution, kind: LineKind): string {
  const ingredientKey =
    contribution.ingredientId ??
    `name:${normalizeIngredientName(contribution.name)}`;

  return `${ingredientKey}|${kind}`;
}

function roundPart(value: number): number {
  return Math.round(value * PART_DECIMALS) / PART_DECIMALS;
}

/** Grams and millilitres to whole numbers, everything else (pieces, spoons) to halves. */
function roundTotal(kind: LineKind, total: number): number {
  if (kind === "mass" || kind === "volume") {
    return Math.round(total);
  }

  return Math.round(total * HALVES) / HALVES;
}

/** Picks a readable unit: 1500 g -> 1.5 kg, 6 TL -> 2 EL. */
function displayTotal(
  kind: LineKind,
  total: number,
  countedUnit: string | null,
): [number, string | null] {
  if (kind === "mass") {
    return total >= BASE_UNIT_THRESHOLD
      ? [total / BASE_UNIT_THRESHOLD, "kg"]
      : [total, "g"];
  }

  if (kind === "volume") {
    return total >= BASE_UNIT_THRESHOLD
      ? [total / BASE_UNIT_THRESHOLD, "l"]
      : [total, "ml"];
  }

  if (kind === "spoon") {
    return total % TEASPOONS_PER_TABLESPOON === 0
      ? [total / TEASPOONS_PER_TABLESPOON, "EL"]
      : [total, "TL"];
  }

  return [total, countedUnit];
}

function toLine(accumulator: Accumulator): IngredientSummaryLine {
  const base = {
    key: accumulator.key,
    ingredientId: accumulator.ingredientId,
    name: accumulator.name,
    parts: accumulator.parts,
  };

  if (accumulator.kind === FREE) {
    return { ...base, amount: null, unit: null, approximate: false };
  }

  const rounded = roundTotal(accumulator.kind, accumulator.total);
  const [amount, unit] = displayTotal(
    accumulator.kind,
    rounded,
    accumulator.countedUnit,
  );
  const approximate =
    Math.abs(rounded - accumulator.total) > ROUNDING_TOLERANCE;

  return { ...base, amount, unit, approximate };
}

export function summarizeIngredients(
  contributions: IngredientContribution[],
): IngredientSummaryLine[] {
  const accumulators = new Map<string, Accumulator>();

  for (const contribution of contributions) {
    const kind = kindOf(contribution);
    const key = keyOf(contribution, kind);
    const accumulator = accumulators.get(key) ?? {
      key,
      ingredientId: contribution.ingredientId,
      name: contribution.name,
      kind,
      total: 0,
      countedUnit: contribution.unit ?? null,
      parts: [],
    };
    const scaled =
      contribution.amount === undefined
        ? null
        : contribution.amount * contribution.factor;

    if (scaled !== null) {
      accumulator.total +=
        scaled * (conversionOf(contribution.unit)?.factor ?? 1);
    }

    // Once any part says "Stück", the line shows "Stück" (instead of no unit).
    if (contribution.unit === PIECE) {
      accumulator.countedUnit = PIECE;
    }

    accumulator.parts.push({
      amount: scaled === null ? null : roundPart(scaled),
      unit: contribution.unit ?? null,
      origin: contribution.origin,
    });
    accumulators.set(key, accumulator);
  }

  return [...accumulators.values()]
    .map(toLine)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "de") || a.key.localeCompare(b.key),
    );
}
