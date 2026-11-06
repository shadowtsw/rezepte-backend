import { NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";

import { RecipesService } from "./recipes.service";
import { RECIPE_REPOSITORY } from "./recipe.constants";
import type { Recipe } from "./recipe.model";
import { IngredientsService } from "src/ingredients/ingredients.service";
import type { Ingredient } from "src/ingredients/ingredient.model";
import { IngredientRenamedEvent } from "src/ingredients/events/ingredient-renamed.event";
import {
  RECIPE_DELETED_EVENT,
  RecipeDeletedEvent,
} from "./events/recipe-deleted.event";
import type { CreateRecipeDto } from "./dto/create-recipe.dto";

const LENTILS_ID = "11111111-1111-4111-8111-111111111111";
const SALT_ID = "33333333-3333-4333-8333-333333333333";

const registry: Record<string, Ingredient> = {
  [LENTILS_ID]: {
    id: LENTILS_ID,
    name: "rote Linsen",
    normalizedName: "rote linsen",
  },
  [SALT_ID]: { id: SALT_ID, name: "Salz", normalizedName: "salz" },
};

function recipeWithUsages(
  usages: { ingredientId: string; ingredient: string; unit?: string }[],
): CreateRecipeDto {
  return {
    title: "Dal",
    servings: 2,
    tags: [],
    categories: [],
    sections: [
      {
        id: "section",
        title: "",
        steps: [
          {
            id: "step",
            title: "",
            instruction: "",
            ingredients: usages.map((usage, index) => ({
              id: `usage-${index}`,
              ...usage,
            })),
          },
        ],
      },
    ],
  };
}

describe("RecipesService", () => {
  let service: RecipesService;
  let recipeRepository: {
    deleteRecipe: jest.Mock;
    saveRecipe: jest.Mock;
    renameIngredientInRecipes: jest.Mock;
  };
  let ingredientsService: {
    getIngredientById: jest.Mock;
    rememberLastUnit: jest.Mock;
  };
  let eventEmitter: { emitAsync: jest.Mock };

  beforeEach(async () => {
    recipeRepository = {
      deleteRecipe: jest.fn(),
      saveRecipe: jest.fn((recipe: Recipe) => Promise.resolve(recipe)),
      renameIngredientInRecipes: jest.fn(),
    };
    ingredientsService = {
      getIngredientById: jest.fn((id: string) => Promise.resolve(registry[id])),
      rememberLastUnit: jest.fn(),
    };
    eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: RECIPE_REPOSITORY, useValue: recipeRepository },
        { provide: IngredientsService, useValue: ingredientsService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
  });

  describe("linking ingredients on save", () => {
    it("takes id and name from the registry", async () => {
      const created = await service.createRecipe(
        recipeWithUsages([
          { ingredientId: LENTILS_ID, ingredient: "Linsen (alt)", unit: "g" },
        ]),
      );

      expect(created.sections[0]?.steps[0]?.ingredients[0]).toMatchObject({
        ingredientId: LENTILS_ID,
        ingredient: "rote Linsen",
      });
    });

    it("remembers the unit, but not for usages without unit", async () => {
      await service.createRecipe(
        recipeWithUsages([
          { ingredientId: LENTILS_ID, ingredient: "rote Linsen", unit: "g" },
          { ingredientId: SALT_ID, ingredient: "Salz" },
        ]),
      );

      expect(ingredientsService.rememberLastUnit.mock.calls).toEqual([
        [LENTILS_ID, "g"],
      ]);
    });
  });

  it("updates name copies when an ingredient is renamed", async () => {
    await service.handleIngredientRenamed(
      new IngredientRenamedEvent(LENTILS_ID, "Linsen, rot"),
    );

    expect(recipeRepository.renameIngredientInRecipes.mock.calls).toEqual([
      [LENTILS_ID, "Linsen, rot"],
    ]);
  });

  describe("deleteRecipe", () => {
    it("emits recipe.deleted after deleting", async () => {
      recipeRepository.deleteRecipe.mockResolvedValue(true);

      await service.deleteRecipe("recipe-1");

      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        RECIPE_DELETED_EVENT,
        new RecipeDeletedEvent("recipe-1"),
      );
    });

    it("throws NotFoundException and emits nothing when the recipe does not exist", async () => {
      recipeRepository.deleteRecipe.mockResolvedValue(false);

      await expect(service.deleteRecipe("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
    });
  });
});
