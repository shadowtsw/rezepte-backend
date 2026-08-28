import { Injectable } from "@nestjs/common";
import { RecipeRepository } from "./recipe.repository";
import { Recipe, RecipeUpdate } from "../recipe.model";

@Injectable()
export class InMemoryRecipesRepository implements RecipeRepository {
  private recipes: Recipe[] = [
    // {
    //   id: "1",
    //   title: "Pizza",
    //   servings: 2,
    // },
    // {
    //   id: "2",
    //   title: "Carbonara",
    //   servings: 4,
    // },
    // {
    //   id: "3",
    //   title: "Lasagne",
    //   servings: 6,
    // },
  ];

  getAllRecipes(): Promise<Recipe[]> {
    return Promise.resolve(this.recipes);
  }

  findById(id: string): Promise<Recipe | undefined> {
    const recipe = this.recipes.find((recipe) => recipe.id === id);

    return Promise.resolve(recipe);
  }

  saveRecipe(recipe: Recipe): Promise<Recipe> {
    this.recipes.push(recipe);
    return Promise.resolve(recipe);
  }

  deleteRecipe(id: string): Promise<boolean> {
    const index = this.recipes.findIndex((recipe) => recipe.id === id);

    if (index === -1) {
      return Promise.resolve(false);
    }

    this.recipes.splice(index, 1);

    return Promise.resolve(true);
  }

  updateRecipe(id: string, recipe: RecipeUpdate): Promise<Recipe | undefined> {
    const index = this.recipes.findIndex((target) => target.id === id);

    if (index === -1) {
      return Promise.resolve(undefined);
    }

    const updated: Recipe = { ...this.recipes[index], ...recipe };

    this.recipes[index] = updated;

    return Promise.resolve(updated);
  }

  async publishRecipe(id: string): Promise<Recipe | undefined> {
    // const updatedDocument = await this.collection.findOneAndUpdate(
    //   { id },
    //   { $set: { status: "published" } },
    //   { returnDocument: "after" },
    // );

    // return updatedDocument ?? undefined;
    return Promise.resolve(undefined);
  }

  async archiveRecipe(id: string): Promise<Recipe | undefined> {
    // const updatedDocument = await this.collection.findOneAndUpdate(
    //   { id },
    //   { $set: { status: "published" } },
    //   { returnDocument: "after" },
    // );

    // return updatedDocument ?? undefined;
    return Promise.resolve(undefined);
  }

  async draftRecipe(id: string): Promise<Recipe | undefined> {
    // const updatedDocument = await this.collection.findOneAndUpdate(
    //   { id },
    //   { $set: { status: "published" } },
    //   { returnDocument: "after" },
    // );

    // return updatedDocument ?? undefined;
    return Promise.resolve(undefined);
  }
}
