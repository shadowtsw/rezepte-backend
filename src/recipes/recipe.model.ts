export interface Recipe {
  id: string;
  title: string;
  servings: number;
}

export interface RecipeUpdate {
  title?: string;
  servings?: number;
}
