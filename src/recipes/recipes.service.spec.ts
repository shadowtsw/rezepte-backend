import { NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";

import { RecipesService } from "./recipes.service";
import { RECIPE_REPOSITORY } from "./recipe.constants";
import { IngredientsService } from "src/ingredients/ingredients.service";
import {
  RECIPE_DELETED_EVENT,
  RecipeDeletedEvent,
} from "./events/recipe-deleted.event";

describe("RecipesService", () => {
  let service: RecipesService;
  let recipeRepository: { deleteRecipe: jest.Mock };
  let eventEmitter: { emitAsync: jest.Mock };

  beforeEach(async () => {
    recipeRepository = { deleteRecipe: jest.fn() };
    eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: RECIPE_REPOSITORY, useValue: recipeRepository },
        { provide: IngredientsService, useValue: {} },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
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
