export interface RecipeCategory {
  id: string;
  name: string;
  /** Sort order in drawer and picker; missing for categories saved before sorting existed. */
  position?: number;
}

/** A category as GET /categories returns it. */
export interface CategoryWithCount extends RecipeCategory {
  /** Recipes in this category, all statuses (drafts and archived count too). */
  recipeCount: number;
}
