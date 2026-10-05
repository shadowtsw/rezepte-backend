import { Inject, Injectable } from "@nestjs/common";
import type { Collection } from "mongodb";
import { COLLECTION_COLLECTION } from "../collection.constants";
import type {
  CollectionItem,
  CollectionRecipeItem,
  RecipeCollection,
} from "../collection.model";
import type { CollectionRepository } from "./collection.repository";

@Injectable()
export class MongoCollectionsRepository implements CollectionRepository {
  constructor(
    @Inject(COLLECTION_COLLECTION)
    private readonly collection: Collection<RecipeCollection>,
  ) {}

  async getAllCollections(): Promise<RecipeCollection[]> {
    return this.collection.find({}).toArray();
  }

  async findById(id: string): Promise<RecipeCollection | undefined> {
    const collection = await this.collection.findOne({ id });

    return collection ?? undefined;
  }

  async createCollection(
    collection: RecipeCollection,
  ): Promise<RecipeCollection> {
    await this.collection.insertOne(collection);

    return collection;
  }

  async updateCollectionName(
    id: string,
    name: string,
  ): Promise<RecipeCollection | undefined> {
    const updatedCollection = await this.collection.findOneAndUpdate(
      { id },
      {
        $set: { name },
        $inc: { version: 1 },
      },
      { returnDocument: "after" },
    );

    return updatedCollection ?? undefined;
  }

  async deleteCollection(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ id });

    return result.deletedCount === 1;
  }

  async addRecipe(
    collectionId: string,
    item: CollectionRecipeItem,
  ): Promise<RecipeCollection | undefined> {
    const updatedCollection = await this.collection.findOneAndUpdate(
      { id: collectionId },
      {
        $push: { items: item },
        $inc: { version: 1 },
      },
      { returnDocument: "after" },
    );

    return updatedCollection ?? undefined;
  }

  async updateCollectionItems(
    id: string,
    version: number,
    items: CollectionItem[],
  ): Promise<RecipeCollection | undefined> {
    const updatedCollection = await this.collection.findOneAndUpdate(
      {
        id,
        version,
      },
      {
        $set: {
          items,
        },
        $inc: {
          version: 1,
        },
      },
      {
        returnDocument: "after",
      },
    );

    return updatedCollection ?? undefined;
  }

  async removeRecipeReferences(recipeId: string): Promise<void> {
    await this.collection.updateMany(
      {
        $or: [
          {
            items: {
              $elemMatch: {
                type: "recipe",
                recipeId,
              },
            },
          },
          {
            items: {
              $elemMatch: {
                type: "group",
                "recipes.recipeId": recipeId,
              },
            },
          },
        ],
      },
      [
        {
          $set: {
            items: {
              $map: {
                input: {
                  $filter: {
                    input: "$items",
                    as: "item",
                    cond: {
                      $not: {
                        $and: [
                          { $eq: ["$$item.type", "recipe"] },
                          { $eq: ["$$item.recipeId", recipeId] },
                        ],
                      },
                    },
                  },
                },
                as: "item",
                in: {
                  $cond: [
                    { $eq: ["$$item.type", "group"] },
                    {
                      $mergeObjects: [
                        "$$item",
                        {
                          recipes: {
                            $filter: {
                              input: "$$item.recipes",
                              as: "recipe",
                              cond: {
                                $ne: ["$$recipe.recipeId", recipeId],
                              },
                            },
                          },
                        },
                      ],
                    },
                    "$$item",
                  ],
                },
              },
            },
            version: {
              $add: ["$version", 1],
            },
          },
        },
      ],
    );
  }
}
