import { ConflictException, NotFoundException } from "@nestjs/common";

import type { RecipesService } from "src/recipes/recipes.service";
import type { Recipe, RecipeStatus } from "src/recipes/recipe.model";
import type { RecipeCollection } from "./collection.model";
import { CollectionsService } from "./collections.service";
import type { UpdateCollectionItemsDto } from "./dto/update-collection-items.dto";
import type { CollectionRepository } from "./repositories/collection.repository";

const COLLECTION_ID = "collection-1";
const PUBLISHED_RECIPE_ID = "recipe-published";
const DRAFT_RECIPE_ID = "recipe-draft";

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
  let recipesService: { getRecipeById: jest.Mock };
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
