import { Injectable, Inject } from "@nestjs/common";
import { Collection, Filter } from "mongodb";
import { Recipe, RecipeStatus, RecipeUpdate } from "../recipe.model";
import { RecipeRepository } from "./recipe.repository";
import { RECIPE_COLLECTION } from "../recipe.constants";
import { MongoServerError } from "mongodb";
import { DuplicateKeyError } from "src/common/errors/duplicate-key.error";
import { WITHOUT_MONGO_ID } from "src/database/database.constants";

@Injectable()
export class MongoRecipesRepository implements RecipeRepository {
  constructor(
    @Inject(RECIPE_COLLECTION)
    private readonly collection: Collection<Recipe>,
  ) {}

  async getAllRecipes(
    categoryId?: string,
    uncategorized?: boolean,
    status?: RecipeStatus,
  ): Promise<Recipe[]> {
    const filter: Filter<Recipe> = {};

    if (categoryId) {
      filter["categories.id"] = categoryId;
    } else if (uncategorized) {
      filter.$or = [
        { categories: { $exists: false } },
        { categories: { $size: 0 } },
      ];
    }

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $ne: "archived" };
    }

    return this.collection
      .find(filter, { projection: WITHOUT_MONGO_ID })
      .toArray();
  }

  async findById(id: string): Promise<Recipe | undefined> {
    const recipe = await this.collection.findOne(
      { id },
      { projection: WITHOUT_MONGO_ID },
    );

    return recipe ?? undefined;
  }

  async saveRecipe(recipe: Recipe): Promise<Recipe> {
    try {
      await this.collection.insertOne({ ...recipe });

      return recipe;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new DuplicateKeyError(
          `Recipe with ID ${recipe.id} already exists`,
        );
      }

      throw error;
    }
  }

  async deleteRecipe(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ id });

    return result.deletedCount === 1;
  }

  async updateRecipe(
    id: string,
    recipe: RecipeUpdate,
  ): Promise<Recipe | undefined> {
    const updatedDocument = await this.collection.findOneAndUpdate(
      { id },
      {
        $set: recipe,
        $inc: { version: 1 },
      },
      { returnDocument: "after", projection: WITHOUT_MONGO_ID },
    );

    return updatedDocument ?? undefined;
  }

  async publishRecipe(id: string): Promise<Recipe | undefined> {
    const updatedDocument = await this.collection.findOneAndUpdate(
      { id },
      { $set: { status: "published" } },
      { returnDocument: "after", projection: WITHOUT_MONGO_ID },
    );

    return updatedDocument ?? undefined;
  }

  async archiveRecipe(id: string): Promise<Recipe | undefined> {
    const updatedDocument = await this.collection.findOneAndUpdate(
      { id },
      { $set: { status: "archived" } },
      { returnDocument: "after", projection: WITHOUT_MONGO_ID },
    );

    return updatedDocument ?? undefined;
  }

  async draftRecipe(id: string): Promise<Recipe | undefined> {
    const updatedDocument = await this.collection.findOneAndUpdate(
      { id },
      { $set: { status: "draft" } },
      { returnDocument: "after", projection: WITHOUT_MONGO_ID },
    );

    return updatedDocument ?? undefined;
  }

  async getRecipesByCategory(
    categoryId: string,
  ): Promise<Pick<Recipe, "id" | "title">[]> {
    return this.collection
      .find(
        { "categories.id": categoryId, status: "published" },
        {
          projection: {
            ...WITHOUT_MONGO_ID,
            id: 1,
            title: 1,
          },
        },
      )
      .toArray();
  }

  async countRecipesByCategory(): Promise<Record<string, number>> {
    const groups = await this.collection
      .aggregate<{ _id: string; count: number }>([
        { $unwind: "$categories" },
        { $group: { _id: "$categories.id", count: { $sum: 1 } } },
      ])
      .toArray();

    return Object.fromEntries(groups.map((group) => [group._id, group.count]));
  }

  async removeCategoryFromRecipes(categoryId: string): Promise<void> {
    await this.collection.updateMany(
      { "categories.id": categoryId },
      { $pull: { categories: { id: categoryId } } },
    );
  }

  async renameIngredientInRecipes(
    ingredientId: string,
    name: string,
  ): Promise<void> {
    // $[] walks every section and step, $[usage] only the usages of this ingredient.
    await this.collection.updateMany(
      { "sections.steps.ingredients.ingredientId": ingredientId },
      {
        $set: {
          "sections.$[].steps.$[].ingredients.$[usage].ingredient": name,
        },
      },
      { arrayFilters: [{ "usage.ingredientId": ingredientId }] },
    );
  }
}
