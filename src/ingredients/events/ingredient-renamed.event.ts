export const INGREDIENT_RENAMED_EVENT = "ingredient.renamed";

/** Emitted after an ingredient was renamed, so recipes can update their display copies of the name. */
export class IngredientRenamedEvent {
  constructor(
    readonly ingredientId: string,
    readonly name: string,
  ) {}
}
