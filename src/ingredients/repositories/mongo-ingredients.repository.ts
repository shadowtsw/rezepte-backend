import { Injectable, Inject } from "@nestjs/common";
import { Collection, MongoServerError } from "mongodb";
import { Ingredient } from "../ingredient.model";
import { IngredientRepository } from "./ingredient.repository";
import { INGREDIENT_COLLECTION } from "../ingredient.constants";
import { DuplicateKeyError } from "src/common/errors/duplicate-key.error";
import { normalizeIngredientName } from "../ingredient.utils";
import { WITHOUT_MONGO_ID } from "src/database/database.constants";

@Injectable()
export class MongoIngredientsRepository implements IngredientRepository {
  constructor(
    @Inject(INGREDIENT_COLLECTION)
    private readonly collection: Collection<Ingredient>,
  ) {}

  async getAllIngredients(search?: string): Promise<Ingredient[]> {
    let filter = {};

    if (search) {
      const normalizedSearch = normalizeIngredientName(search);

      filter = {
        normalizedName: {
          $regex: `^${normalizedSearch}`,
        },
      };
    }

    return this.collection
      .find(filter, { projection: WITHOUT_MONGO_ID })
      .toArray();
  }

  async findById(id: string): Promise<Ingredient | undefined> {
    const ingredient = await this.collection.findOne(
      { id },
      { projection: WITHOUT_MONGO_ID },
    );
    return ingredient ?? undefined;
  }

  async findByNormalizedName(
    normalizedName: string,
  ): Promise<Ingredient | undefined> {
    const ingredient = await this.collection.findOne(
      { normalizedName },
      { projection: WITHOUT_MONGO_ID },
    );

    return ingredient ?? undefined;
  }

  async createIngredient(ingredient: Ingredient): Promise<Ingredient> {
    try {
      await this.collection.insertOne({ ...ingredient });
      return ingredient;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new DuplicateKeyError(
          `Ingredient with normalized name "${ingredient.normalizedName}" already exists`,
        );
      }

      throw error;
    }
  }

  async updateIngredient(
    id: string,
    name: string,
    normalizedName: string,
  ): Promise<Ingredient | undefined> {
    try {
      const updatedIngredient = await this.collection.findOneAndUpdate(
        { id },
        {
          $set: {
            name,
            normalizedName,
          },
        },
        { returnDocument: "after", projection: WITHOUT_MONGO_ID },
      );

      return updatedIngredient ?? undefined;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new DuplicateKeyError();
      }

      throw error;
    }
  }

  async setLastUnit(id: string, unit: string): Promise<void> {
    await this.collection.updateOne({ id }, { $set: { lastUnit: unit } });
  }

  async deleteIngredient(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ id });

    return result.deletedCount === 1;
  }
}
