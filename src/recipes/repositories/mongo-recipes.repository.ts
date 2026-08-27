import { Injectable, Inject } from "@nestjs/common";
import { Collection } from "mongodb";
import { Recipe, RecipeUpdate } from "../recipe.model";
import { RecipeRepository } from "./recipe.repository";
import { RECIPE_COLLECTION } from "../recipe.constants";

@Injectable()
export class MongoRecipesRepository implements RecipeRepository {
  constructor(
    @Inject(RECIPE_COLLECTION)
    private readonly collection: Collection<Recipe>,
  ) {}

  getAllRecipes(): Promise<Recipe[]> {
    return this.collection.find().toArray();
  }

  async findById(id: string): Promise<Recipe | undefined> {
    const recipe = await this.collection.findOne({ id });

    return recipe ?? undefined;
  }

  async saveRecipe(recipe: Recipe): Promise<Recipe> {
    await this.collection.insertOne(recipe);

    return recipe;
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
}
