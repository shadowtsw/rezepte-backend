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
  ingredient: string;
  amount?: number;
  unit?: string;
}

export interface RecipeCategoryReference {
  id: string;
}

export type RecipeStatus = "draft" | "published" | "archived";

export type RecipeUpdate = Partial<Omit<Recipe, "id" | "status">>;
