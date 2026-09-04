import { Ingredient } from "../ingredient.model";

export interface IngredientRepository {
  getAllIngredients(search?: string): Promise<Ingredient[]>;
  findById(id: string): Promise<Ingredient | undefined>;
  createIngredient(ingredient: Ingredient): Promise<Ingredient>;
  findByNormalizedName(normalizedName: string): Promise<Ingredient | undefined>;
}
