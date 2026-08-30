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
import { randomUUID } from "crypto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { DuplicateKeyError } from "src/common/errors/duplicate-key.error";

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
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    return category;
  }

  async createCategory(
    category: CreateCategoryDto,
  ): Promise<{ message: string; newCategory: RecipeCategory }> {
    console.log(category);

    const newCategory: RecipeCategory = {
      ...category,
      id: category.id ?? randomUUID(),
    };

    try {
      await this.categoryRepository.createCategory(newCategory);
    } catch (error) {
      if (error instanceof DuplicateKeyError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }

    return { message: "Category created successfully", newCategory };
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
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    return updatedCategory;
  }

  async getRecipesByCategory(categoryId: string) {
    const category = await this.categoryRepository.findById(categoryId);

    if (!category) {
      throw new NotFoundException(`Category with id "${categoryId}" not found`);
    }

    return this.recipesService.getRecipesByCategory(categoryId);
  }

  async removeCategoryFromRecipes(categoryId: string): Promise<void> {
    await this.recipesService.removeCategoryFromRecipes(categoryId);
  }

  async deleteCategory(id: string): Promise<boolean> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    await this.recipesService.removeCategoryFromRecipes(id);

    return this.categoryRepository.deleteCategory(id);
  }
}
