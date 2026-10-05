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
  RecipeCollection,
} from "./collection.model";
import type { CollectionRepository } from "./repositories/collection.repository";
import type { CreateCollectionDto } from "./dto/create-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";
import { RecipesService } from "src/recipes/recipes.service";
import { AddRecipeToCollectionDto } from "./dto/add-recipe-to-collection.dto";
import { UpdateCollectionItemsDto } from "./dto/update-collection-items.dto";

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
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    return collection;
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
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    return updatedCollection;
  }

  async deleteCollection(id: string): Promise<void> {
    const deleted = await this.collectionRepository.deleteCollection(id);

    if (!deleted) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }
  }

  async addRecipeToCollection(
    collectionId: string,
    dto: AddRecipeToCollectionDto,
  ): Promise<RecipeCollection> {
    const recipe = await this.recipesService.getRecipeById(dto.recipeId);

    if (recipe.status !== "published") {
      throw new ConflictException(
        `Recipe with ID ${dto.recipeId} is not published`,
      );
    }

    const collection = await this.collectionRepository.findById(collectionId);

    if (!collection) {
      throw new NotFoundException(
        `Collection with ID ${collectionId} not found`,
      );
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
      throw new NotFoundException(
        `Collection with ID ${collectionId} not found`,
      );
    }

    return updatedCollection;
  }

  async updateCollectionItems(id: string, dto: UpdateCollectionItemsDto) {
    // 1. Aktuelle Collection laden
    const collection = await this.collectionRepository.findById(id);

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    // 2. Version prüfen
    if (collection.version !== dto.version) {
      throw new ConflictException(
        `Collection has been modified. Expected version ${dto.version}, current version is ${collection.version}`,
      );
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
        throw new ConflictException(
          `Collection item with ID ${item.id} cannot change from group to recipe`,
        );
      }

      if (item.type === "group" && existingRecipeItems.has(item.id)) {
        throw new ConflictException(
          `Collection item with ID ${item.id} cannot change from recipe to group`,
        );
      }
    }

    // 6. Bestehende Recipe-IDs dürfen nicht ausgetauscht werden
    for (const item of items) {
      const recipes = item.type === "recipe" ? [item] : item.recipes;

      for (const recipe of recipes) {
        const existingRecipeId = existingRecipeItems.get(recipe.id);

        if (existingRecipeId && existingRecipeId !== recipe.recipeId) {
          throw new ConflictException(
            `Collection item with ID ${recipe.id} cannot reference another recipe`,
          );
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
        "Item IDs must be unique within a collection",
      );
    }

    // 9. Neue Recipe-Einträge müssen auf veröffentlichte Rezepte zeigen
    for (const item of newRecipeItems) {
      const recipe = await this.recipesService.getRecipeById(item.recipeId);

      if (recipe.status !== "published") {
        throw new ConflictException(
          `Recipe with ID ${item.recipeId} is not published`,
        );
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
        throw new NotFoundException(`Collection with ID ${id} not found`);
      }

      throw new ConflictException(
        `Collection has been modified. Expected version ${dto.version}, current version is ${currentCollection.version}`,
      );
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
        };
      }

      return {
        id: item.id ?? randomUUID(),
        type: "group",
        name: item.name,
        recipes: item.recipes.map((recipe) => ({
          id: recipe.id ?? randomUUID(),
          recipeId: recipe.recipeId,
        })),
      };
    });
  }
}
