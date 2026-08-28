import { Recipe, RecipeUpdate } from "../recipe.model";

export interface RecipeRepository {
  getAllRecipes(): Promise<Recipe[]>;
  findById(id: string): Promise<Recipe | undefined>;
  saveRecipe(recipe: Recipe): Promise<Recipe>;
  deleteRecipe(id: string): Promise<boolean>;
  updateRecipe(id: string, changes: RecipeUpdate): Promise<Recipe | undefined>;
  publishRecipe(id: string): Promise<Recipe | undefined>;
  archiveRecipe(id: string): Promise<Recipe | undefined>;
  draftRecipe(id: string): Promise<Recipe | undefined>;
}
