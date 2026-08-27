import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import type { RecipeRepository } from "./repositories/recipe.repository";
import { RECIPE_REPOSITORY } from "./recipe.constants";
import { Recipe } from "./recipe.model";
import { randomUUID } from "node:crypto";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";

@Injectable()
export class RecipesService {
  constructor(
    @Inject(RECIPE_REPOSITORY)
    private readonly recipeRepository: RecipeRepository,
  ) {}

  getAllRecipes(): Promise<Recipe[]> {
    // Implementation for fetching all recipes
    return this.recipeRepository.getAllRecipes();
  }

  async getRecipeById(id: string) {
    const recipe = await this.recipeRepository.findById(id);

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    return recipe;
  }

  async createRecipe(recipe: CreateRecipeDto) {
    // Implementation for creating a new recipe
    const newRecipe: Recipe = {
      ...recipe,
      id: randomUUID(),
    };

    await this.recipeRepository.saveRecipe(newRecipe);

    return { message: "Recipe created successfully", newRecipe };
  }

  async deleteRecipe(id: string) {
    const deleted = await this.recipeRepository.deleteRecipe(id);

    if (!deleted) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }
  }

  async updateRecipe(id: string, recipe: UpdateRecipeDto) {
    const updated = await this.recipeRepository.updateRecipe(id, recipe);

    if (!updated) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    return updated;
  }
}
