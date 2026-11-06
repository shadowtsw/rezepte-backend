/**
 * Reads the schema.org `Recipe` that most recipe sites embed as JSON-LD (Chefkoch, Lecker, blogs).
 * Only name, yield and ingredient lines are taken over; steps stay with the user (guidelines projects/rezepte.md, D8).
 */

export interface JsonLdRecipe {
  title: string | null;
  servings: number | null;
  ingredients: string[];
}

const JSON_LD_SCRIPT =
  /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
/** Nesting deeper than this is not searched (protects against odd or hostile pages). */
const MAX_DEPTH = 6;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  szlig: "ß",
};

/** Decodes the HTML entities that show up in JSON-LD strings ("Salz &amp; Pfeffer"). */
export function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+\d*);/gi,
    (entity, code: string) => {
      if (code.startsWith("#x") || code.startsWith("#X")) {
        return fromCodePoint(Number.parseInt(code.slice(2), 16), entity);
      }

      if (code.startsWith("#")) {
        return fromCodePoint(Number.parseInt(code.slice(1), 10), entity);
      }

      return NAMED_ENTITIES[code] ?? entity;
    },
  );
}

/** Invalid code points ("&#99999999;") stay as written instead of throwing. */
function fromCodePoint(codePoint: number, fallback: string): string {
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return fallback;
  }
}

/** Entities decoded, tags removed, whitespace collapsed. */
function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRecipeType(type: unknown): boolean {
  const types = Array.isArray(type) ? type : [type];

  return types.some(
    (entry) => typeof entry === "string" && /(^|[/:])Recipe$/.test(entry),
  );
}

/** Depth-first search for the first object typed Recipe, also inside `@graph` and nested values. */
function findRecipe(node: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > MAX_DEPTH || node === null || typeof node !== "object") {
    return null;
  }

  if (Array.isArray(node)) {
    for (const entry of node) {
      const found = findRecipe(entry, depth + 1);

      if (found) {
        return found;
      }
    }

    return null;
  }

  const record = node as Record<string, unknown>;

  if (isRecipeType(record["@type"])) {
    return record;
  }

  return findRecipe(Object.values(record), depth + 1);
}

/** "4", 4, "4 Portionen", ["4", "4 Stück"] → 4. */
function parseYield(value: unknown): number | null {
  const first = Array.isArray(value) ? (value as unknown[])[0] : value;
  const text =
    typeof first === "number" || typeof first === "string" ? String(first) : "";
  const match = /\d+/.exec(text);
  const servings = match ? Number.parseInt(match[0], 10) : NaN;

  return servings > 0 ? servings : null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Some sites put raw line breaks into strings; try once more without control characters.
    try {
      // eslint-disable-next-line no-control-regex -- removing control characters is the point here
      return JSON.parse(text.replace(/[\u0000-\u001f]+/g, " "));
    } catch {
      return null;
    }
  }
}

/** The recipe of a page, or null when the page has no JSON-LD recipe with ingredients. */
export function extractRecipeFromHtml(html: string): JsonLdRecipe | null {
  for (const match of html.matchAll(JSON_LD_SCRIPT)) {
    const recipe = findRecipe(parseJson(match[1] ?? ""));
    const rawIngredients = recipe?.recipeIngredient ?? recipe?.ingredients;
    const ingredients = (Array.isArray(rawIngredients) ? rawIngredients : [])
      .map(cleanText)
      .filter(Boolean);

    if (recipe && ingredients.length) {
      return {
        title: cleanText(recipe.name) || null,
        servings: parseYield(recipe.recipeYield),
        ingredients,
      };
    }
  }

  return null;
}
