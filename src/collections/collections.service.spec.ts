import {
  ConflictException,
  HttpException,
  NotFoundException,
} from "@nestjs/common";

import type { RecipesService } from "src/recipes/recipes.service";
import type { Recipe, RecipeStatus } from "src/recipes/recipe.model";
import type { RecipeCollection } from "./collection.model";
import { CollectionsService } from "./collections.service";
import type { UpdateCollectionItemsDto } from "./dto/update-collection-items.dto";
import type { CollectionRepository } from "./repositories/collection.repository";

const COLLECTION_ID = "collection-1";
const PUBLISHED_RECIPE_ID = "recipe-published";
const DRAFT_RECIPE_ID = "recipe-draft";

/** Resolves with the `apiError` payload of the HttpException the promise rejects with. */
async function errorPayloadOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof HttpException) {
      return error.getResponse();
    }
  }

  throw new Error("Expected the promise to reject with an HttpException");
}

function buildRecipe(id: string, status: RecipeStatus): Recipe {
  return {
    id,
    title: id,
    servings: 1,
    tags: [],
    categories: [],
    sections: [],
    status,
    version: 1,
  };
}

function buildCollection(
  overrides: Partial<RecipeCollection> = {},
): RecipeCollection {
  return {
    id: COLLECTION_ID,
    name: "Week 48",
    version: 2,
    items: [
      { id: "item-single", type: "recipe", recipeId: PUBLISHED_RECIPE_ID },
      {
        id: "item-group",
        type: "group",
        name: "Saturday menu",
        recipes: [{ id: "item-in-group", recipeId: PUBLISHED_RECIPE_ID }],
      },
    ],
    ...overrides,
  };
}

describe("CollectionsService", () => {
  let collectionRepository: jest.Mocked<CollectionRepository>;
  let recipesService: { getRecipeById: jest.Mock; findRecipe?: jest.Mock };
  let service: CollectionsService;

  beforeEach(() => {
    collectionRepository = {
      getAllCollections: jest.fn(),
      findById: jest.fn(),
      createCollection: jest.fn(),
      updateCollectionName: jest.fn(),
      deleteCollection: jest.fn(),
      addRecipe: jest.fn(),
      updateCollectionItems: jest.fn(),
      removeRecipeReferences: jest.fn(),
    };

    recipesService = {
      getRecipeById: jest.fn((id: string) => {
        const status = id === DRAFT_RECIPE_ID ? "draft" : "published";
        return Promise.resolve(buildRecipe(id, status));
      }),
    };

    service = new CollectionsService(
      collectionRepository,
      recipesService as unknown as RecipesService,
    );
  });

  describe("createCollection", () => {
    it("trims the name and starts with version 1 and no items", async () => {
      collectionRepository.createCollection.mockImplementation((collection) =>
        Promise.resolve(collection),
      );

      const created = await service.createCollection({ name: "  Christmas " });

      expect(created.name).toBe("Christmas");
      expect(created.version).toBe(1);
      expect(created.items).toEqual([]);
    });
  });

  describe("updateCollection and deleteCollection", () => {
    it("throws NotFoundException when renaming a missing collection", async () => {
      collectionRepository.updateCollectionName.mockResolvedValue(undefined);

      await expect(
        service.updateCollection("missing", { name: "x" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws NotFoundException when deleting a missing collection", async () => {
      collectionRepository.deleteCollection.mockResolvedValue(false);

      await expect(service.deleteCollection("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("getIngredientSummary", () => {
    const EGGS_ID = "eggs-id";
    const pancakes: Recipe = {
      ...buildRecipe("pancakes", "published"),
      servings: 4,
      sections: [
        {
          id: "s",
          title: "",
          steps: [
            {
              id: "t",
              title: "",
              instruction: "",
              ingredients: [
                {
                  id: "u1",
                  ingredientId: EGGS_ID,
                  ingredient: "Eier",
                  amount: 3,
                },
                {
                  id: "u2",
                  ingredientId: "flour-id",
                  ingredient: "Mehl",
                  amount: 250,
                  unit: "g",
                },
              ],
            },
          ],
        },
      ],
    };

    beforeEach(() => {
      recipesService.findRecipe = jest.fn((id: string) =>
        Promise.resolve(id === "pancakes" ? pancakes : undefined),
      );
      collectionRepository.findById.mockResolvedValue(
        buildCollection({
          items: [
            { id: "single", type: "recipe", recipeId: "pancakes", servings: 8 },
            {
              id: "group",
              type: "group",
              name: "Frühstück",
              recipes: [
                { id: "in-group", recipeId: "pancakes" },
                { id: "deleted", recipeId: "gone" },
              ],
            },
          ],
        }),
      );
    });

    it("sums the whole collection, scaled to each entry's servings", async () => {
      const lines = await service.getIngredientSummary(COLLECTION_ID);
      const eggs = lines.find((line) => line.name === "Eier");

      // 3 eggs for 4 servings: 6 for the entry with 8 servings, 3 for the one without own servings.
      expect(eggs).toMatchObject({ amount: 9, unit: null });
      expect(eggs?.parts.map((part) => part.origin)).toEqual([
        { recipeId: "pancakes", servings: 8 },
        { recipeId: "pancakes", servings: 4 },
      ]);
      expect(lines.find((line) => line.name === "Mehl")).toMatchObject({
        amount: 750,
        unit: "g",
      });
    });

    it("loads each recipe once and skips recipes that no longer exist", async () => {
      await service.getIngredientSummary(COLLECTION_ID);

      expect(recipesService.findRecipe).toHaveBeenCalledTimes(2);
    });

    it("sums only one group", async () => {
      const lines = await service.getIngredientSummary(COLLECTION_ID, "group");

      expect(lines.find((line) => line.name === "Eier")).toMatchObject({
        amount: 3,
      });
    });

    it("throws COLLECTION_GROUP_NOT_FOUND for an unknown group", async () => {
      await expect(
        errorPayloadOf(service.getIngredientSummary(COLLECTION_ID, "missing")),
      ).resolves.toEqual({
        message: "COLLECTION_GROUP_NOT_FOUND",
        params: { groupId: "missing" },
      });
    });
  });

  describe("handleRecipeDeleted", () => {
    it("removes the recipe's references from all collections", async () => {
      await service.handleRecipeDeleted({ recipeId: PUBLISHED_RECIPE_ID });

      expect(collectionRepository.removeRecipeReferences.mock.calls).toEqual([
        [PUBLISHED_RECIPE_ID],
      ]);
    });
  });

  describe("addRecipeToCollection", () => {
    it("adds a published recipe as a new item with its own id", async () => {
      collectionRepository.findById.mockResolvedValue(buildCollection());
      collectionRepository.addRecipe.mockResolvedValue(buildCollection());

      await service.addRecipeToCollection(COLLECTION_ID, {
        recipeId: PUBLISHED_RECIPE_ID,
      });

      const addedItem = collectionRepository.addRecipe.mock.calls[0][1];
      expect(addedItem.type).toBe("recipe");
      expect(addedItem.recipeId).toBe(PUBLISHED_RECIPE_ID);
      expect(addedItem.id).toEqual(expect.any(String));
    });

    it("allows a recipe that is already in the collection", async () => {
      collectionRepository.findById.mockResolvedValue(buildCollection());
      collectionRepository.addRecipe.mockResolvedValue(buildCollection());

      await expect(
        service.addRecipeToCollection(COLLECTION_ID, {
          recipeId: PUBLISHED_RECIPE_ID,
        }),
      ).resolves.toBeDefined();
    });

    it("throws ConflictException for a recipe that is not published", async () => {
      await expect(
        service.addRecipeToCollection(COLLECTION_ID, {
          recipeId: DRAFT_RECIPE_ID,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(collectionRepository.addRecipe.mock.calls).toHaveLength(0);
    });

    it("throws NotFoundException when the collection does not exist", async () => {
      collectionRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.addRecipeToCollection("missing", {
          recipeId: PUBLISHED_RECIPE_ID,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("updateCollectionItems", () => {
    beforeEach(() => {
      collectionRepository.findById.mockResolvedValue(buildCollection());
      collectionRepository.updateCollectionItems.mockImplementation(
        (id, version, items) =>
          Promise.resolve(buildCollection({ version: version + 1, items })),
      );
    });

    function updateItems(items: UpdateCollectionItemsDto["items"]) {
      return service.updateCollectionItems(COLLECTION_ID, {
        version: 2,
        items,
      });
    }

    it("saves a reordered structure and returns the new version", async () => {
      const updated = await updateItems([
        {
          id: "item-group",
          type: "group",
          name: "Saturday menu",
          recipes: [{ id: "item-in-group", recipeId: PUBLISHED_RECIPE_ID }],
        },
        { id: "item-single", type: "recipe", recipeId: PUBLISHED_RECIPE_ID },
      ]);

      expect(updated.version).toBe(3);
      expect(updated.items.map((item) => item.id)).toEqual([
        "item-group",
        "item-single",
      ]);
    });

    it("generates ids for new items and new group entries", async () => {
      const updated = await updateItems([
        { type: "recipe", recipeId: PUBLISHED_RECIPE_ID },
        {
          type: "group",
          name: "New group",
          recipes: [{ recipeId: PUBLISHED_RECIPE_ID }],
        },
      ]);

      const [newRecipeItem, newGroupItem] = updated.items;
      expect(newRecipeItem.id).toEqual(expect.any(String));
      expect(newGroupItem.id).toEqual(expect.any(String));
      expect(
        newGroupItem.type === "group" && newGroupItem.recipes[0].id,
      ).toEqual(expect.any(String));
    });

    it("keeps servings per entry and leaves them out when not set", async () => {
      const updated = await updateItems([
        {
          id: "item-single",
          type: "recipe",
          recipeId: PUBLISHED_RECIPE_ID,
          servings: 4,
        },
        {
          id: "item-group",
          type: "group",
          name: "Saturday menu",
          recipes: [
            { id: "item-in-group", recipeId: PUBLISHED_RECIPE_ID, servings: 6 },
            { recipeId: PUBLISHED_RECIPE_ID },
          ],
        },
      ]);

      const [single, group] = updated.items;
      expect(single).toMatchObject({ servings: 4 });
      expect(group.type === "group" && group.recipes[0]).toMatchObject({
        servings: 6,
      });
      expect(group.type === "group" && group.recipes[1]).not.toHaveProperty(
        "servings",
      );
    });

    it("allows the same recipe several times", async () => {
      const updated = await updateItems([
        { id: "item-single", type: "recipe", recipeId: PUBLISHED_RECIPE_ID },
        { type: "recipe", recipeId: PUBLISHED_RECIPE_ID },
        { type: "recipe", recipeId: PUBLISHED_RECIPE_ID },
      ]);

      expect(updated.items).toHaveLength(3);
    });

    it("dissolves a group by moving its recipes to the top level", async () => {
      const updated = await updateItems([
        { id: "item-single", type: "recipe", recipeId: PUBLISHED_RECIPE_ID },
        { id: "item-in-group", type: "recipe", recipeId: PUBLISHED_RECIPE_ID },
      ]);

      expect(updated.items.every((item) => item.type === "recipe")).toBe(true);
    });

    it("keeps existing recipes even if they are no longer published", async () => {
      recipesService.getRecipeById.mockResolvedValue(
        buildRecipe(PUBLISHED_RECIPE_ID, "archived"),
      );

      await expect(
        updateItems([
          { id: "item-single", type: "recipe", recipeId: PUBLISHED_RECIPE_ID },
        ]),
      ).resolves.toBeDefined();
      expect(recipesService.getRecipeById).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when the collection does not exist", async () => {
      collectionRepository.findById.mockResolvedValue(undefined);

      await expect(updateItems([])).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ConflictException when the version is outdated", async () => {
      await expect(
        service.updateCollectionItems(COLLECTION_ID, { version: 1, items: [] }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("sends message IDs with params for its errors", async () => {
      const outdatedVersion = service.updateCollectionItems(COLLECTION_ID, {
        version: 1,
        items: [],
      });
      const unpublishedRecipe = updateItems([
        { type: "recipe", recipeId: DRAFT_RECIPE_ID },
      ]);

      await expect(errorPayloadOf(outdatedVersion)).resolves.toEqual({
        message: "COLLECTION_VERSION_CONFLICT",
        params: { id: COLLECTION_ID, currentVersion: 2 },
      });
      await expect(errorPayloadOf(unpublishedRecipe)).resolves.toEqual({
        message: "COLLECTION_RECIPE_NOT_PUBLISHED",
        params: { recipeId: DRAFT_RECIPE_ID },
      });
    });

    it("throws ConflictException when the collection changed during the update", async () => {
      collectionRepository.updateCollectionItems.mockResolvedValue(undefined);

      await expect(updateItems([])).rejects.toBeInstanceOf(ConflictException);
    });

    it("throws ConflictException when a new item points to an unpublished recipe", async () => {
      await expect(
        updateItems([{ type: "recipe", recipeId: DRAFT_RECIPE_ID }]),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("throws ConflictException when item ids repeat", async () => {
      await expect(
        updateItems([
          { id: "item-single", type: "recipe", recipeId: PUBLISHED_RECIPE_ID },
          { id: "item-single", type: "recipe", recipeId: PUBLISHED_RECIPE_ID },
        ]),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("throws ConflictException when an existing item changes its type", async () => {
      await expect(
        updateItems([
          {
            id: "item-single",
            type: "group",
            name: "Was a recipe",
            recipes: [],
          },
        ]),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("throws ConflictException when an existing item points to another recipe", async () => {
      await expect(
        updateItems([
          { id: "item-single", type: "recipe", recipeId: "other-recipe" },
        ]),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
