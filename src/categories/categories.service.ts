import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CategoryWithCount, RecipeCategory } from "./category.model";
import {
  findNameConflict,
  nextPosition,
  orderedIds,
  sortCategories,
} from "./category-order";
import { CATEGORY_REPOSITORY } from "./category.constants";
import type { CategoryRepository } from "./repositories/category.repository";
import { RecipesService } from "src/recipes/recipes.service";
import type { Recipe } from "src/recipes/recipe.model";
import { randomUUID } from "crypto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { DuplicateKeyError } from "src/common/errors/duplicate-key.error";
import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID } from "src/messages/message-ids";

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
    private readonly recipesService: RecipesService,
  ) {}

  /** Sorted by position, each with its number of recipes. */
  async getAllCategories(): Promise<CategoryWithCount[]> {
    const [categories, counts] = await Promise.all([
      this.categoryRepository.getAllCategories(),
      this.recipesService.countRecipesByCategory(),
    ]);

    return sortCategories(categories).map((category) => ({
      ...category,
      recipeCount: counts[category.id] ?? 0,
    }));
  }

  /** Saves a new order; categories not in `ids` keep their order after them. */
  async updateOrder(ids: string[]): Promise<CategoryWithCount[]> {
    const categories = await this.categoryRepository.getAllCategories();

    await this.categoryRepository.updatePositions(orderedIds(categories, ids));

    return this.getAllCategories();
  }

  async getCategoryById(id: string): Promise<RecipeCategory> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw categoryNotFound(id);
    }

    return category;
  }

  async createCategory(category: CreateCategoryDto): Promise<RecipeCategory> {
    const existing = await this.categoryRepository.getAllCategories();

    throwOnNameConflict(existing, category.name);

    const newCategory: RecipeCategory = {
      ...category,
      id: category.id ?? randomUUID(),
      position: await this.positionAtEnd(existing),
    };

    try {
      await this.categoryRepository.createCategory(newCategory);
    } catch (error) {
      if (error instanceof DuplicateKeyError) {
        throw new ConflictException(apiError(MESSAGE_ID.categoryAlreadyExists));
      }

      throw error;
    }

    return newCategory;
  }

  /**
   * Position after all others. Categories saved before sorting existed have none and would sort after the new
   * one, so their current order is saved first.
   */
  private async positionAtEnd(categories: RecipeCategory[]): Promise<number> {
    if (categories.every((category) => category.position !== undefined)) {
      return nextPosition(categories);
    }

    await this.categoryRepository.updatePositions(orderedIds(categories, []));

    return categories.length;
  }

  async updateCategory(
    id: string,
    category: RecipeCategory,
  ): Promise<RecipeCategory> {
    throwOnNameConflict(
      await this.categoryRepository.getAllCategories(),
      category.name,
      id,
    );

    const updatedCategory = await this.categoryRepository.updateCategory(
      id,
      category,
    );

    if (!updatedCategory) {
      throw categoryNotFound(id);
    }

    return updatedCategory;
  }

  async getRecipesByCategory(
    categoryId: string,
  ): Promise<Pick<Recipe, "id" | "title">[]> {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw categoryNotFound(categoryId);
    }

    return this.recipesService.getRecipesByCategory(categoryId);
  }

  async removeCategoryFromRecipes(categoryId: string): Promise<void> {
    await this.recipesService.removeCategoryFromRecipes(categoryId);
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw categoryNotFound(id);
    }

    await this.recipesService.removeCategoryFromRecipes(id);

    await this.categoryRepository.deleteCategory(id);
  }
}

function throwOnNameConflict(
  categories: RecipeCategory[],
  name: string,
  ownId?: string,
): void {
  const conflict = findNameConflict(categories, name, ownId);

  if (conflict) {
    throw new ConflictException(
      apiError(MESSAGE_ID.categoryNameTaken, {
        params: { name: conflict.name },
      }),
    );
  }
}

function categoryNotFound(id: string): NotFoundException {
  return new NotFoundException(
    apiError(MESSAGE_ID.categoryNotFound, { params: { id } }),
  );
}
