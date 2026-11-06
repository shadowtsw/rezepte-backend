export interface RecipeCollection {
  id: string;
  name: string;
  version: number;
  items: CollectionItem[];
}

export type CollectionItem = CollectionRecipeItem | CollectionGroupItem;

export interface CollectionRecipeItem {
  id: string;
  type: "recipe";
  recipeId: string;
  /** Servings for this entry; missing means the recipe's own servings. */
  servings?: number;
}

export interface CollectionGroupItem {
  id: string;
  type: "group";
  name: string;
  recipes: CollectionRecipeReference[];
}

export interface CollectionRecipeReference {
  id: string;
  recipeId: string;
  /** Servings for this entry; missing means the recipe's own servings. */
  servings?: number;
}
