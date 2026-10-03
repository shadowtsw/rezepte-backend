import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { COLLECTION_REPOSITORY } from "./collection.constants";
import type {
  CollectionRecipeItem,
  RecipeCollection,
} from "./collection.model";
import type { CollectionRepository } from "./repositories/collection.repository";
import type { CreateCollectionDto } from "./dto/create-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";
import { RecipesService } from "src/recipes/recipes.service";
import { AddRecipeToCollectionDto } from "./dto/add-recipe-to-collection.dto";

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

    const recipeAlreadyExists = collection.items.some((item) => {
      if (item.type === "recipe") {
        return item.recipeId === dto.recipeId;
      }

      return item.recipes.some((recipe) => recipe.recipeId === dto.recipeId);
    });

    if (recipeAlreadyExists) {
      throw new ConflictException(
        `Recipe with ID ${dto.recipeId} already exists in collection`,
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
}
