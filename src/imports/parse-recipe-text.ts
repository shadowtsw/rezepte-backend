import {
  parseIngredientLine,
  type ParsedIngredientLine,
} from "./parse-ingredient-line";

/** A pasted recipe text: optional header lines, then one ingredient per line. */
export interface ParsedRecipeText {
  title: string | null;
  servings: number | null;
  source: string | null;
  lines: ParsedIngredientLine[];
}

const HEADER = /^(titel|portionen|quelle)\s*:\s*(.*)$/i;
const INGREDIENTS_START = /^zutaten\s*:?\s*$/i;
/** "Kartoffelgratin für 4" or "Linsensuppe (für 6 Personen)" as the first line of a free note. */
const TITLE_WITH_SERVINGS =
  /^(.+?)\s*\(?\s*für\s+(\d+)(?:\s+(?:personen|portionen))?\s*\)?\s*$/i;
const STARTS_WITH_AMOUNT = /^[\d½¼¾⅓⅔?]/;

function parseServings(text: string): number | null {
  const value = Number.parseInt(text, 10);

  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Reads the standard format ("Titel:", "Portionen:", "Quelle:", "Zutaten:") and free notes.
 * With a "Zutaten:" line, only lines after it are ingredients. Without headers, a first line that
 * does not start with an amount and is followed by more lines is taken as the title.
 */
export function parseRecipeText(text: string): ParsedRecipeText {
  const result: ParsedRecipeText = {
    title: null,
    servings: null,
    source: null,
    lines: [],
  };
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  const hasIngredientsStart = rows.some((row) => INGREDIENTS_START.test(row));
  let inIngredients = !hasIngredientsStart;

  rows.forEach((row, index) => {
    const header = HEADER.exec(row);

    if (header) {
      applyHeader(
        result,
        (header[1] ?? "").toLowerCase(),
        (header[2] ?? "").trim(),
      );
      return;
    }

    if (INGREDIENTS_START.test(row)) {
      inIngredients = true;
      return;
    }

    if (!inIngredients) {
      return;
    }

    if (isTitleLine(result, row, index, rows.length)) {
      applyTitleLine(result, row);
      return;
    }

    result.lines.push(parseIngredientLine(row));
  });

  return result;
}

function applyHeader(result: ParsedRecipeText, key: string, value: string) {
  if (key === "titel") {
    result.title = value || null;
  } else if (key === "portionen") {
    result.servings = parseServings(value);
  } else {
    result.source = value || null;
  }
}

function isTitleLine(
  result: ParsedRecipeText,
  row: string,
  index: number,
  rowCount: number,
): boolean {
  const isFirstFreeLine = index === 0 && result.title === null && rowCount > 1;

  return isFirstFreeLine && !STARTS_WITH_AMOUNT.test(row) && !row.endsWith(":");
}

function applyTitleLine(result: ParsedRecipeText, row: string) {
  const withServings = TITLE_WITH_SERVINGS.exec(row);

  if (withServings) {
    result.title = (withServings[1] ?? "").trim();
    result.servings = parseServings(withServings[2] ?? "");
    return;
  }

  result.title = row;
}
