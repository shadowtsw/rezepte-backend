import { RecipeCategory } from "../category.model";

export interface CategoryRepository {
  getAllCategories(): Promise<RecipeCategory[]>;
  findById(id: string): Promise<RecipeCategory | undefined>;
  createCategory(category: RecipeCategory): Promise<RecipeCategory>;
  updateCategory(
    id: string,
    category: RecipeCategory,
  ): Promise<RecipeCategory | undefined>;
  deleteCategory(id: string): Promise<boolean>;
}
