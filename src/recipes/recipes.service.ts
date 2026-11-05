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
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  RECIPE_DELETED_EVENT,
  RecipeDeletedEvent,
} from "./events/recipe-deleted.event";
import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID } from "src/messages/message-ids";

@Injectable()
export class RecipesService {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipeRepository: RecipeRepository,
    private readonly ingredientsService: IngredientsService,
    private readonly eventEmitter: EventEmitter2,
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

  async getRecipeById(id: string): Promise<Recipe> {
    const recipe = await this.recipeRepository.findById(id);

    if (!recipe) {
      throw recipeNotFound(id);
    }

    return recipe;
  }

  async createRecipe(recipe: CreateRecipeDto): Promise<Recipe> {
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
        throw new ConflictException(
          apiError(MESSAGE_ID.recipeAlreadyExists, {
            params: { id: newRecipe.id },
          }),
        );
      }

      throw error;
    }

    return newRecipe;
  }

  async deleteRecipe(id: string): Promise<void> {
    const deleted = await this.recipeRepository.deleteRecipe(id);

    if (!deleted) {
      throw recipeNotFound(id);
    }

    // emitAsync waits for all listeners, so the response is sent after the cleanup.
    await this.eventEmitter.emitAsync(
      RECIPE_DELETED_EVENT,
      new RecipeDeletedEvent(id),
    );
  }

  async updateRecipe(id: string, recipe: UpdateRecipeDto): Promise<Recipe> {
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
      throw recipeNotFound(id);
    }

    return updated;
  }

  async publishRecipe(id: string): Promise<Recipe> {
    const updated = await this.recipeRepository.publishRecipe(id);

    if (!updated) {
      throw recipeNotFound(id);
    }

    return updated;
  }

  async archiveRecipe(id: string): Promise<Recipe> {
    const updated = await this.recipeRepository.archiveRecipe(id);

    if (!updated) {
      throw recipeNotFound(id);
    }

    return updated;
  }

  async draftRecipe(id: string): Promise<Recipe> {
    const updated = await this.recipeRepository.draftRecipe(id);

    if (!updated) {
      throw recipeNotFound(id);
    }

    return updated;
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

function recipeNotFound(id: string): NotFoundException {
  return new NotFoundException(
    apiError(MESSAGE_ID.recipeNotFound, { params: { id } }),
  );
}
