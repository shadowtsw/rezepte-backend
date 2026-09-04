import { Injectable, Inject } from "@nestjs/common";
import { Collection, MongoServerError } from "mongodb";
import { Ingredient } from "../ingredient.model";
import { IngredientRepository } from "./ingredient.repository";
import { INGREDIENT_COLLECTION } from "../ingredient.constants";
import { DuplicateKeyError } from "src/common/errors/duplicate-key.error";
import { normalizeIngredientName } from "../ingredient.utils";

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

    return this.collection.find(filter).toArray();
  }

  async findById(id: string): Promise<Ingredient | undefined> {
    const ingredient = await this.collection.findOne({ id });
    return ingredient ?? undefined;
  }

  async findByNormalizedName(
    normalizedName: string,
  ): Promise<Ingredient | undefined> {
    const ingredient = await this.collection.findOne({
      normalizedName,
    });

    return ingredient ?? undefined;
  }

  async createIngredient(ingredient: Ingredient): Promise<Ingredient> {
    try {
      await this.collection.insertOne(ingredient);
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
}
