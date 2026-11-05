import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RecipeCategory } from "./category.model";
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

  getAllCategories(): Promise<RecipeCategory[]> {
    return this.categoryRepository.getAllCategories();
  }

  async getCategoryById(id: string): Promise<RecipeCategory> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw categoryNotFound(id);
    }

    return category;
  }

  async createCategory(category: CreateCategoryDto): Promise<RecipeCategory> {
    const newCategory: RecipeCategory = {
      ...category,
      id: category.id ?? randomUUID(),
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

  async updateCategory(
    id: string,
    category: RecipeCategory,
  ): Promise<RecipeCategory> {
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

function categoryNotFound(id: string): NotFoundException {
  return new NotFoundException(
    apiError(MESSAGE_ID.categoryNotFound, { params: { id } }),
  );
}
