import { Injectable, Inject } from "@nestjs/common";
import { Collection } from "mongodb";
import { Recipe, RecipeUpdate } from "../recipe.model";
import { RecipeRepository } from "./recipe.repository";
import { RECIPE_COLLECTION } from "../recipe.constants";
import { MongoServerError } from "mongodb";
import { DuplicateKeyError } from "src/common/errors/duplicate-key.error";

@Injectable()
export class MongoRecipesRepository implements RecipeRepository {
  constructor(
    @Inject(RECIPE_COLLECTION)
    private readonly collection: Collection<Recipe>,
  ) {}

  async getAllRecipes(
    categoryId?: string,
    uncategorized?: boolean,
  ): Promise<Recipe[]> {
    let filter = {};

    if (categoryId) {
      filter = { "categories.id": categoryId };
    } else if (uncategorized) {
      filter = {
        $or: [{ categories: { $exists: false } }, { categories: { $size: 0 } }], //* old refs without categories field will be considered uncategorized
      };
    }

    return this.collection.find(filter).toArray();
  }

  async findById(id: string): Promise<Recipe | undefined> {
    const recipe = await this.collection.findOne({ id });

    return recipe ?? undefined;
  }

  async saveRecipe(recipe: Recipe): Promise<Recipe> {
    try {
      await this.collection.insertOne(recipe);

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
      { $set: recipe },
      { returnDocument: "after" },
    );

    return updatedDocument ?? undefined;
  }

  async publishRecipe(id: string): Promise<Recipe | undefined> {
    const updatedDocument = await this.collection.findOneAndUpdate(
      { id },
      { $set: { status: "published" } },
      { returnDocument: "after" },
    );

    return updatedDocument ?? undefined;
  }

  async archiveRecipe(id: string): Promise<Recipe | undefined> {
    const updatedDocument = await this.collection.findOneAndUpdate(
      { id },
      { $set: { status: "archived" } },
      { returnDocument: "after" },
    );

    return updatedDocument ?? undefined;
  }

  async draftRecipe(id: string): Promise<Recipe | undefined> {
    const updatedDocument = await this.collection.findOneAndUpdate(
      { id },
      { $set: { status: "draft" } },
      { returnDocument: "after" },
    );

    return updatedDocument ?? undefined;
  }

  async getRecipesByCategory(
    categoryId: string,
  ): Promise<Pick<Recipe, "id" | "title">[]> {
    return this.collection
      .find(
        { "categories.id": categoryId },
        {
          projection: {
            id: 1,
            title: 1,
          },
        },
      )
      .toArray();
  }

  async removeCategoryFromRecipes(categoryId: string): Promise<void> {
    await this.collection.updateMany(
      { "categories.id": categoryId },
      { $pull: { categories: { id: categoryId } } },
    );
  }
}
