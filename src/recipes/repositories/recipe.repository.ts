import { Recipe, RecipeStatus, RecipeUpdate } from "../recipe.model";

export interface RecipeRepository {
  getAllRecipes(
    categoryId?: string,
    uncategorized?: boolean,
    status?: RecipeStatus,
  ): Promise<Recipe[]>;
  findById(id: string): Promise<Recipe | undefined>;
  saveRecipe(recipe: Recipe): Promise<Recipe>;
  deleteRecipe(id: string): Promise<boolean>;
  updateRecipe(id: string, changes: RecipeUpdate): Promise<Recipe | undefined>;
  publishRecipe(id: string): Promise<Recipe | undefined>;
  archiveRecipe(id: string): Promise<Recipe | undefined>;
  draftRecipe(id: string): Promise<Recipe | undefined>;
  getRecipesByCategory(
    categoryId: string,
  ): Promise<Pick<Recipe, "id" | "title">[]>;
  removeCategoryFromRecipes(categoryId: string): Promise<void>;
  /** Number of recipes per category id, all statuses. Categories without recipes are missing. */
  countRecipesByCategory(): Promise<Record<string, number>>;
  /** Updates the display copy of an ingredient's name in every usage of every recipe. */
  renameIngredientInRecipes(ingredientId: string, name: string): Promise<void>;
}
