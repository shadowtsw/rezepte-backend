import type { ParsedIngredientLine } from "./parse-ingredient-line";

/** How a preview line relates to the ingredient registry. */
export type RegistryMatch =
  | { kind: "exact"; ingredientId: string; name: string }
  | { kind: "similar"; ingredientId: string; name: string }
  | { kind: "new" };

export interface ImportPreviewLine extends ParsedIngredientLine {
  match: RegistryMatch;
}

/** Result of POST /imports/parse. Nothing is saved yet. */
export interface ImportPreview {
  title: string | null;
  servings: number | null;
  source: string | null;
  lines: ImportPreviewLine[];
}
