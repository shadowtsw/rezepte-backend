export const RECIPE_DELETED_EVENT = "recipe.deleted";

/** Emitted after a recipe was deleted, so other modules can remove their references. */
export class RecipeDeletedEvent {
  constructor(readonly recipeId: string) {}
}
