import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { RecipesService } from "./recipes.service";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import { Recipe } from "./recipe.model";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";

@Controller("recipes")
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  getAllRecipes(
    @Query("categoryId") categoryId?: string,
    @Query("uncategorized") uncategorized?: string,
  ): Promise<Recipe[]> {
    return this.recipesService.getAllRecipes(
      categoryId,
      uncategorized === "true",
    );
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

  @Patch(":id")
  updateRecipePatch(@Param("id") id: string, @Body() recipe: UpdateRecipeDto) {
    return this.recipesService.updateRecipe(id, recipe);
  }

  @Put(":id")
  updateRecipePut(@Param("id") id: string, @Body() recipe: UpdateRecipeDto) {
    return this.recipesService.updateRecipe(id, recipe);
  }

  @Post(":id/publish")
  publishRecipe(@Param("id") id: string) {
    return this.recipesService.publishRecipe(id);
  }

  @Post(":id/archive")
  archiveRecipe(@Param("id") id: string) {
    return this.recipesService.archiveRecipe(id);
  }

  @Post(":id/draft")
  draftRecipe(@Param("id") id: string) {
    return this.recipesService.draftRecipe(id);
  }
}
