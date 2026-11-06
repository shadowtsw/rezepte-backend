export interface Recipe {
  id: string;
  title: string;
  servings: number;
  tags: string[];
  sections: RecipeSection[];
  notes?: string;
  status: RecipeStatus;
  version: number;
  categories: RecipeCategoryReference[];
}

export interface RecipeSection {
  id: string;
  title: string;
  steps: RecipeStep[];
}

export interface RecipeStep {
  id: string;
  title: string;
  instruction: string;
  duration?: number;
  ingredients: IngredientUsage[];
}

export interface IngredientUsage {
  id: string;
  /** Registry entry this usage refers to. Optional until all clients send it (D1b, step 1). */
  ingredientId?: string;
  /** Display copy of the registry name; kept in sync when the ingredient is renamed. */
  ingredient: string;
  amount?: number;
  unit?: string;
}

export interface RecipeCategoryReference {
  id: string;
}

export type RecipeStatus = "draft" | "published" | "archived";

export type RecipeUpdate = Partial<Omit<Recipe, "id" | "status">>;
