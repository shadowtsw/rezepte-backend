import { HttpException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import type { Ingredient } from "./ingredient.model";
import { IngredientsService } from "./ingredients.service";
import {
  INGREDIENT_RENAMED_EVENT,
  IngredientRenamedEvent,
} from "./events/ingredient-renamed.event";
import type { IngredientRepository } from "./repositories/ingredient.repository";

const onion: Ingredient = {
  id: "8b0c7d1e-1f1a-4a52-9f0d-2c3a4b5c6d7e",
  name: "Zwiebel",
  normalizedName: "zwiebel",
};

describe("IngredientsService", () => {
  let repository: jest.Mocked<IngredientRepository>;
  let eventEmitter: { emitAsync: jest.Mock };
  let service: IngredientsService;

  beforeEach(() => {
    repository = {
      getAllIngredients: jest.fn(),
      findById: jest.fn(),
      createIngredient: jest.fn((ingredient: Ingredient) =>
        Promise.resolve(ingredient),
      ),
      findByNormalizedName: jest.fn(),
      updateIngredient: jest.fn(),
      deleteIngredient: jest.fn(),
      setLastUnit: jest.fn(),
    };
    eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };
    service = new IngredientsService(
      repository,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe("getIngredientById", () => {
    it("finds the ingredient", async () => {
      repository.findById.mockResolvedValue(onion);

      await expect(service.getIngredientById(onion.id)).resolves.toEqual(onion);
    });

    it("throws INGREDIENT_NOT_FOUND for an unknown id", async () => {
      repository.findById.mockResolvedValue(undefined);

      const failure = await service
        .getIngredientById(onion.id)
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(NotFoundException);
      expect((failure as HttpException).getResponse()).toMatchObject({
        message: "INGREDIENT_NOT_FOUND",
      });
    });
  });

  it("remembers the last unit", async () => {
    await service.rememberLastUnit(onion.id, "Stück");

    expect(repository.setLastUnit.mock.calls).toEqual([[onion.id, "Stück"]]);
  });

  it("announces a rename so recipes can update their name copies", async () => {
    const renamed = {
      ...onion,
      name: "Zwiebel, rot",
      normalizedName: "zwiebel rot",
    };
    repository.updateIngredient.mockResolvedValue(renamed);

    await service.updateIngredient(onion.id, { name: "Zwiebel, rot" });

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      INGREDIENT_RENAMED_EVENT,
      new IngredientRenamedEvent(onion.id, "Zwiebel, rot"),
    );
  });
});
