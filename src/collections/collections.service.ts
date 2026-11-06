import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { COLLECTION_REPOSITORY } from "./collection.constants";
import type {
  CollectionItem,
  CollectionRecipeItem,
  CollectionRecipeReference,
  RecipeCollection,
} from "./collection.model";
import type { CollectionRepository } from "./repositories/collection.repository";
import type { CreateCollectionDto } from "./dto/create-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";
import { RecipesService } from "src/recipes/recipes.service";
import { AddRecipeToCollectionDto } from "./dto/add-recipe-to-collection.dto";
import { UpdateCollectionItemsDto } from "./dto/update-collection-items.dto";
import type { Recipe } from "src/recipes/recipe.model";
import {
  type IngredientContribution,
  type IngredientSummaryLine,
  summarizeIngredients,
} from "src/recipes/ingredient-summary";
import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID, type MessageId } from "src/messages/message-ids";
import { OnEvent } from "@nestjs/event-emitter";
import {
  RECIPE_DELETED_EVENT,
  RecipeDeletedEvent,
} from "src/recipes/events/recipe-deleted.event";

@Injectable()
export class CollectionsService {
  constructor(
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: CollectionRepository,
    private readonly recipesService: RecipesService,
  ) {}

  getAllCollections(): Promise<RecipeCollection[]> {
    return this.collectionRepository.getAllCollections();
  }

  async getCollectionById(id: string): Promise<RecipeCollection> {
    const collection = await this.collectionRepository.findById(id);

    if (!collection) {
      throw collectionNotFound(id);
    }

    return collection;
  }

  /**
   * Summed ingredients of the whole collection or of one group, scaled to each entry's servings.
   * Every entry counts, so a recipe that appears twice contributes twice.
   */
  async getIngredientSummary(
    id: string,
    groupId?: string,
  ): Promise<IngredientSummaryLine[]> {
    const collection = await this.getCollectionById(id);
    const entries = entriesOf(collection, groupId);
    const recipes = await this.loadRecipes(
      entries.map((entry) => entry.recipeId),
    );

    const contributions = entries.flatMap((entry) => {
      const recipe = recipes.get(entry.recipeId);

      return recipe ? contributionsOf(recipe, entry.servings) : [];
    });

    return summarizeIngredients(contributions);
  }

  /** Each recipe once, even if it appears several times. Recipes that no longer exist are skipped. */
  private async loadRecipes(recipeIds: string[]): Promise<Map<string, Recipe>> {
    const recipes = new Map<string, Recipe>();

    for (const recipeId of new Set(recipeIds)) {
      const recipe = await this.recipesService.findRecipe(recipeId);

      if (recipe) {
        recipes.set(recipeId, recipe);
      }
    }

    return recipes;
  }

  async createCollection(dto: CreateCollectionDto): Promise<RecipeCollection> {
    const newCollection: RecipeCollection = {
      id: randomUUID(),
      name: dto.name.trim(),
      version: 1,
      items: [],
    };

    return this.collectionRepository.createCollection(newCollection);
  }

  async updateCollection(
    id: string,
    dto: UpdateCollectionDto,
  ): Promise<RecipeCollection> {
    const updatedCollection =
      await this.collectionRepository.updateCollectionName(id, dto.name.trim());

    if (!updatedCollection) {
      throw collectionNotFound(id);
    }

    return updatedCollection;
  }

  async deleteCollection(id: string): Promise<void> {
    const deleted = await this.collectionRepository.deleteCollection(id);

    if (!deleted) {
      throw collectionNotFound(id);
    }
  }

  // suppressErrors: false lets a failed cleanup reach the DELETE request instead of being swallowed.
  @OnEvent(RECIPE_DELETED_EVENT, { suppressErrors: false })
  async handleRecipeDeleted(event: RecipeDeletedEvent): Promise<void> {
    await this.collectionRepository.removeRecipeReferences(event.recipeId);
  }

  async addRecipeToCollection(
    collectionId: string,
    dto: AddRecipeToCollectionDto,
  ): Promise<RecipeCollection> {
    const recipe = await this.recipesService.getRecipeById(dto.recipeId);

    if (recipe.status !== "published") {
      throw recipeNotPublished(dto.recipeId);
    }

    const collection = await this.collectionRepository.findById(collectionId);

    if (!collection) {
      throw collectionNotFound(collectionId);
    }

    const item: CollectionRecipeItem = {
      id: randomUUID(),
      type: "recipe",
      recipeId: dto.recipeId,
    };

    const updatedCollection = await this.collectionRepository.addRecipe(
      collectionId,
      item,
    );

    if (!updatedCollection) {
      throw collectionNotFound(collectionId);
    }

    return updatedCollection;
  }

  async updateCollectionItems(id: string, dto: UpdateCollectionItemsDto) {
    // 1. Aktuelle Collection laden
    const collection = await this.collectionRepository.findById(id);

    if (!collection) {
      throw collectionNotFound(id);
    }

    // 2. Version prüfen
    if (collection.version !== dto.version) {
      throw versionConflict(id, collection.version);
    }

    // 3. Fehlende IDs erzeugen
    const items = this.createCollectionItems(dto.items);

    // 4. Bestehende Items nach ihrer ID erfassen
    const existingRecipeItems = new Map<string, string>();
    const existingGroupIds = new Set<string>();

    for (const item of collection.items) {
      if (item.type === "recipe") {
        existingRecipeItems.set(item.id, item.recipeId);
        continue;
      }

      existingGroupIds.add(item.id);

      for (const recipe of item.recipes) {
        existingRecipeItems.set(recipe.id, recipe.recipeId);
      }
    }

    const existingItemIds = new Set([
      ...existingRecipeItems.keys(),
      ...existingGroupIds,
    ]);

    // 5. Bestehende Item-IDs dürfen ihren Typ nicht ändern
    for (const item of items) {
      if (item.type === "recipe" && existingGroupIds.has(item.id)) {
        throw itemConflict(MESSAGE_ID.collectionItemTypeChanged, item.id);
      }

      if (item.type === "group" && existingRecipeItems.has(item.id)) {
        throw itemConflict(MESSAGE_ID.collectionItemTypeChanged, item.id);
      }
    }

    // 6. Bestehende Recipe-IDs dürfen nicht ausgetauscht werden
    for (const item of items) {
      const recipes = item.type === "recipe" ? [item] : item.recipes;

      for (const recipe of recipes) {
        const existingRecipeId = existingRecipeItems.get(recipe.id);

        if (existingRecipeId && existingRecipeId !== recipe.recipeId) {
          throw itemConflict(MESSAGE_ID.collectionItemRecipeChanged, recipe.id);
        }
      }
    }

    // 7. Herausfinden, welche Rezept-Einträge neu sind
    const newRecipeItems = items.flatMap((item) => {
      if (item.type === "recipe") {
        return existingItemIds.has(item.id) ? [] : [item];
      }

      return item.recipes.filter((recipe) => !existingItemIds.has(recipe.id));
    });

    // 8. Item-IDs müssen innerhalb der Collection eindeutig sein
    const itemIds = items.flatMap((item) => {
      if (item.type === "recipe") {
        return [item.id];
      }

      return [item.id, ...item.recipes.map((recipe) => recipe.id)];
    });

    const hasDuplicateItemIds = new Set(itemIds).size !== itemIds.length;

    if (hasDuplicateItemIds) {
      throw new ConflictException(
        apiError(MESSAGE_ID.collectionItemIdsNotUnique),
      );
    }

    // 9. Neue Recipe-Einträge müssen auf veröffentlichte Rezepte zeigen
    for (const item of newRecipeItems) {
      const recipe = await this.recipesService.getRecipeById(item.recipeId);

      if (recipe.status !== "published") {
        throw recipeNotPublished(item.recipeId);
      }
    }

    const updatedCollection =
      await this.collectionRepository.updateCollectionItems(
        id,
        dto.version,
        items,
      );

    if (!updatedCollection) {
      const currentCollection = await this.collectionRepository.findById(id);

      if (!currentCollection) {
        throw collectionNotFound(id);
      }

      throw versionConflict(id, currentCollection.version);
    }

    return updatedCollection;
  }

  private createCollectionItems(
    items: UpdateCollectionItemsDto["items"],
  ): CollectionItem[] {
    return items.map((item) => {
      if (item.type === "recipe") {
        return {
          id: item.id ?? randomUUID(),
          type: "recipe",
          recipeId: item.recipeId,
          ...servingsField(item.servings),
        };
      }

      return {
        id: item.id ?? randomUUID(),
        type: "group",
        name: item.name,
        recipes: item.recipes.map((recipe) => ({
          id: recipe.id ?? randomUUID(),
          recipeId: recipe.recipeId,
          ...servingsField(recipe.servings),
        })),
      };
    });
  }
}

/**
 * Leaves the field out when no servings are set: the MongoDB driver would store
 * `undefined` as `null`, and a missing field means "use the recipe's servings".
 */
function servingsField(servings: number | undefined): { servings?: number } {
  return servings === undefined ? {} : { servings };
}

type CollectionEntry = CollectionRecipeItem | CollectionRecipeReference;

function entriesOf(
  collection: RecipeCollection,
  groupId: string | undefined,
): CollectionEntry[] {
  if (!groupId) {
    return collection.items.flatMap((item) =>
      item.type === "recipe" ? [item] : item.recipes,
    );
  }

  const group = collection.items.find(
    (item) => item.type === "group" && item.id === groupId,
  );

  if (group?.type !== "group") {
    throw new NotFoundException(
      apiError(MESSAGE_ID.collectionGroupNotFound, { params: { groupId } }),
    );
  }

  return group.recipes;
}

/** The recipe's usages, scaled from the recipe's servings to the entry's servings. */
function contributionsOf(
  recipe: Recipe,
  entryServings: number | undefined,
): IngredientContribution[] {
  const servings = entryServings ?? recipe.servings;
  const factor = recipe.servings ? servings / recipe.servings : 1;

  return recipe.sections.flatMap((section) =>
    section.steps.flatMap((step) =>
      step.ingredients.map((usage) => ({
        ingredientId: usage.ingredientId,
        name: usage.ingredient,
        amount: usage.amount ?? undefined,
        unit: usage.unit || undefined,
        note: usage.note || undefined,
        factor,
        origin: { recipeId: recipe.id, servings },
      })),
    ),
  );
}

function collectionNotFound(id: string): NotFoundException {
  return new NotFoundException(
    apiError(MESSAGE_ID.collectionNotFound, { params: { id } }),
  );
}

function recipeNotPublished(recipeId: string): ConflictException {
  return new ConflictException(
    apiError(MESSAGE_ID.collectionRecipeNotPublished, { params: { recipeId } }),
  );
}

/** `currentVersion` lets the client tell how far behind it is. */
function versionConflict(
  id: string,
  currentVersion: number,
): ConflictException {
  return new ConflictException(
    apiError(MESSAGE_ID.collectionVersionConflict, {
      params: { id, currentVersion },
    }),
  );
}

function itemConflict(messageId: MessageId, itemId: string): ConflictException {
  return new ConflictException(apiError(messageId, { params: { itemId } }));
}
