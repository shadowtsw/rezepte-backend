import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { RecipesService } from "./recipes.service";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { Recipe } from "./recipe.model";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";

@Controller("recipes")
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  getAllRecipes(): Promise<Recipe[]> {
    return this.recipesService.getAllRecipes();
  }

  @Get(":id")
  getRecipeById(@Param("id") id: string) {
    // Implementation for fetching a recipe by ID
    return this.recipesService.getRecipeById(id);
  }

  @Post()
  createRecipe(@Body() recipe: CreateRecipeDto) {
    return this.recipesService.createRecipe(recipe);
  }

  @Delete(":id")
  deleteRecipe(@Param("id") id: string) {
    return this.recipesService.deleteRecipe(id);
  }

  @Put(":id")
  @Patch(":id")
  updateRecipe(@Param("id") id: string, @Body() recipe: UpdateRecipeDto) {
    return this.recipesService.updateRecipe(id, recipe);
  }
}
