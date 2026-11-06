export interface Recipe {
  id: string;
  title: string;
  servings: number;
  tags: string[];
  sections: RecipeSection[];
  notes?: string;
  /** Where the recipe comes from: a link, a file name or free text (e.g. "Kochbuch Oma, S. 12"). */
  source?: string;
  /** "Was fehlt noch?": open to-dos block publishing (see guidelines projects/rezepte.md, D12). */
  todos?: RecipeTodo[];
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
  /** Registry entry this usage refers to. */
  ingredientId: string;
  /** Display copy of the registry name; kept in sync when the ingredient is renamed. */
  ingredient: string;
  amount?: number;
  unit?: string;
  /** Preparation hint shown after the name, e.g. "gerieben". Does not split lines when summing. */
  note?: string;
}

export interface RecipeTodo {
  id: string;
  text: string;
  done: boolean;
}

export interface RecipeCategoryReference {
  id: string;
}

export type RecipeStatus = "draft" | "published" | "archived";

export type RecipeUpdate = Partial<Omit<Recipe, "id" | "status">>;
