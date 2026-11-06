import { Injectable } from "@nestjs/common";

import type { Ingredient } from "src/ingredients/ingredient.model";
import {
  findSimilarIngredient,
  normalizeIngredientName,
} from "src/ingredients/ingredient.utils";
import { IngredientsService } from "src/ingredients/ingredients.service";
import { MESSAGE_ID } from "src/messages/message-ids";
import type { ImportPreview, ImportPreviewLine } from "./import-preview";
import type { ParsedIngredientLine } from "./parse-ingredient-line";
import { parseRecipeText } from "./parse-recipe-text";

@Injectable()
export class ImportsService {
  constructor(private readonly ingredientsService: IngredientsService) {}

  /** Parses a pasted recipe and matches every line against the registry. Saves nothing. */
  async parseText(text: string): Promise<ImportPreview> {
    const parsed = parseRecipeText(text);
    const ingredients = await this.ingredientsService.getAllIngredients();

    return {
      ...parsed,
      lines: parsed.lines.map((line) => withMatch(line, ingredients)),
    };
  }
}

/** Exact match links the line; a similar one is only suggested; otherwise a new ingredient will be created. */
function withMatch(
  line: ParsedIngredientLine,
  ingredients: Ingredient[],
): ImportPreviewLine {
  if (line.skipped || !line.name) {
    return { ...line, match: { kind: "new" } };
  }

  const normalized = normalizeIngredientName(line.name);
  const exact = ingredients.find(
    (ingredient) => ingredient.normalizedName === normalized,
  );

  if (exact) {
    return {
      ...line,
      match: { kind: "exact", ingredientId: exact.id, name: exact.name },
    };
  }

  const similar = findSimilarIngredient(ingredients, line.name);

  if (similar) {
    return {
      ...line,
      match: { kind: "similar", ingredientId: similar.id, name: similar.name },
      issues: [
        ...line.issues,
        {
          message: MESSAGE_ID.importSimilarIngredient,
          params: { name: similar.name },
        },
      ],
    };
  }

  return {
    ...line,
    match: { kind: "new" },
    issues: [...line.issues, { message: MESSAGE_ID.importNewIngredient }],
  };
}
