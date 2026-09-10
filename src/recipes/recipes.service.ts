import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import type { RecipeRepository } from "./repositories/recipe.repository";
import { RECIPE_REPOSITORY } from "./recipe.constants";
import { Recipe, RecipeStatus } from "./recipe.model";
import { randomUUID } from "node:crypto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";
import { DuplicateKeyError } from "src/common/errors/duplicate-key.error";
import { IngredientsService } from "src/ingredients/ingredients.service";

@Injectable()
export class RecipesService {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipeRepository: RecipeRepository,
    private readonly ingredientsService: IngredientsService,
  ) {}

  getAllRecipes(
    categoryId?: string,
    uncategorized?: boolean,
    status?: RecipeStatus,
  ): Promise<Recipe[]> {
    return this.recipeRepository.getAllRecipes(
      categoryId,
      uncategorized,
      status,
    );
  }

  async getRecipeById(id: string) {
    const recipe = await this.recipeRepository.findById(id);

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    return recipe;
  }

  async createRecipe(recipe: CreateRecipeDto) {
    const newRecipe: Recipe = {
      ...recipe,
      id: recipe.id ?? randomUUID(),
      status: "draft",
      version: 1,
    };

    for (const section of newRecipe.sections) {
      for (const step of section.steps) {
        for (const ingredient of step.ingredients) {
          await this.ingredientsService.findOrCreateIngredient(
            ingredient.ingredient,
          );
        }
      }
    }

    try {
      await this.recipeRepository.saveRecipe(newRecipe);
    } catch (error) {
      if (error instanceof DuplicateKeyError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }

    return { message: "Recipe created successfully", newRecipe };
  }

  async deleteRecipe(id: string) {
    const deleted = await this.recipeRepository.deleteRecipe(id);

    if (!deleted) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }
  }

  async updateRecipe(id: string, recipe: UpdateRecipeDto) {
    if (recipe.sections) {
      for (const section of recipe.sections) {
        for (const step of section.steps) {
          for (const ingredient of step.ingredients) {
            await this.ingredientsService.findOrCreateIngredient(
              ingredient.ingredient,
            );
          }
        }
      }
    }

    const updated = await this.recipeRepository.updateRecipe(id, recipe);

    if (!updated) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    return { message: "Recipe updated successfully", updatedRecipe: updated };
  }

  async publishRecipe(id: string): Promise<{
    message: string;
    updatedRecipe: Recipe;
  }> {
    const updated = await this.recipeRepository.publishRecipe(id);

    if (!updated) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    return { message: "Recipe published successfully", updatedRecipe: updated };
  }

  async archiveRecipe(id: string): Promise<{
    message: string;
    updatedRecipe: Recipe;
  }> {
    const updated = await this.recipeRepository.archiveRecipe(id);

    if (!updated) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    return { message: "Recipe archived successfully", updatedRecipe: updated };
  }

  async draftRecipe(id: string): Promise<{
    message: string;
    updatedRecipe: Recipe;
  }> {
    const updated = await this.recipeRepository.draftRecipe(id);

    if (!updated) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    return {
      message: "Recipe set to draft successfully",
      updatedRecipe: updated,
    };
  }

  async getRecipesByCategory(
    categoryId: string,
  ): Promise<Pick<Recipe, "id" | "title">[]> {
    return this.recipeRepository.getRecipesByCategory(categoryId);
  }

  async removeCategoryFromRecipes(categoryId: string): Promise<void> {
    await this.recipeRepository.removeCategoryFromRecipes(categoryId);
  }
}
