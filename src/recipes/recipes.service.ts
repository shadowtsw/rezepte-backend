import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import type { RecipeRepository } from "./repositories/recipe.repository";
import { RECIPE_REPOSITORY } from "./recipe.constants";
import {
  IngredientUsage,
  Recipe,
  RecipeSection,
  RecipeStatus,
  RecipeStep,
} from "./recipe.model";
import { isUnit } from "./units";
import {
  type IngredientContribution,
  type IngredientSummaryLine,
  summarizeIngredients,
} from "./ingredient-summary";
import { randomUUID } from "node:crypto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";
import { DuplicateKeyError } from "src/common/errors/duplicate-key.error";
import { IngredientsService } from "src/ingredients/ingredients.service";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import {
  INGREDIENT_RENAMED_EVENT,
  IngredientRenamedEvent,
} from "src/ingredients/events/ingredient-renamed.event";
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

  /** Like getRecipeById, but returns undefined instead of throwing for a missing recipe. */
  async findRecipe(id: string): Promise<Recipe | undefined> {
    return this.recipeRepository.findById(id);
  }

  async createRecipe(recipe: CreateRecipeDto): Promise<Recipe> {
    const newRecipe: Recipe = {
      ...recipe,
      id: recipe.id ?? randomUUID(),
      status: "draft",
      version: 1,
    };

    newRecipe.sections = await this.linkIngredients(newRecipe.sections);

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
    const changes = recipe.sections
      ? { ...recipe, sections: await this.linkIngredients(recipe.sections) }
      : recipe;

    const updated = await this.recipeRepository.updateRecipe(id, changes);

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

  /** All ingredients of a recipe, summed (same ingredient and kind of unit), with the steps they come from. */
  async getIngredientSummary(id: string): Promise<IngredientSummaryLine[]> {
    const recipe = await this.getRecipeById(id);
    const contributions: IngredientContribution[] = recipe.sections.flatMap(
      (section) =>
        section.steps.flatMap((step) =>
          step.ingredients.map((usage) => ({
            ingredientId: usage.ingredientId,
            name: usage.ingredient,
            amount: usage.amount ?? undefined,
            unit: usage.unit || undefined,
            note: usage.note || undefined,
            factor: 1,
            origin: { stepId: step.id },
          })),
        ),
    );

    return summarizeIngredients(contributions);
  }

  @OnEvent(INGREDIENT_RENAMED_EVENT, { suppressErrors: false })
  async handleIngredientRenamed(event: IngredientRenamedEvent): Promise<void> {
    await this.recipeRepository.renameIngredientInRecipes(
      event.ingredientId,
      event.name,
    );
  }

  /** Links every ingredient usage to the registry and takes the registry's name as display copy. */
  private async linkIngredients(
    sections: RecipeSection[],
  ): Promise<RecipeSection[]> {
    const linkedSections: RecipeSection[] = [];

    for (const section of sections) {
      linkedSections.push({
        ...section,
        steps: await this.linkStepIngredients(section.steps),
      });
    }

    return linkedSections;
  }

  private async linkStepIngredients(
    steps: RecipeStep[],
  ): Promise<RecipeStep[]> {
    const linkedSteps: RecipeStep[] = [];

    for (const step of steps) {
      linkedSteps.push({
        ...step,
        ingredients: await this.linkUsages(step.ingredients),
      });
    }

    return linkedSteps;
  }

  // One after another: a few lookups per recipe, no need to run them in parallel.
  private async linkUsages(
    usages: IngredientUsage[],
  ): Promise<IngredientUsage[]> {
    const linkedUsages: IngredientUsage[] = [];

    for (const usage of usages) {
      const ingredient = await this.ingredientsService.getIngredientById(
        usage.ingredientId,
      );

      if (isUnit(usage.unit)) {
        await this.ingredientsService.rememberLastUnit(
          ingredient.id,
          usage.unit,
        );
      }

      linkedUsages.push({
        ...usage,
        ingredientId: ingredient.id,
        ingredient: ingredient.name,
      });
    }

    return linkedUsages;
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
