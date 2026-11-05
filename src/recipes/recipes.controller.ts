import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { RecipesService } from "./recipes.service";
import { CreateRecipeDto } from "./dto/create-recipe.dto";
import type { Recipe, RecipeStatus } from "./recipe.model";
import { UpdateRecipeDto } from "./dto/update-recipe.dto";
import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";

@Controller("recipes")
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  getAllRecipes(
    @Query("categoryId") categoryId?: string,
    @Query("uncategorized") uncategorized?: string,
    @Query("status") status?: RecipeStatus,
  ): Promise<Recipe[]> {
    return this.recipesService.getAllRecipes(
      categoryId,
      uncategorized === "true",
      status,
    );
  }

  @Get(":id")
  getRecipeById(@Param("id") id: string): Promise<Recipe> {
    return this.recipesService.getRecipeById(id);
  }

  @Post()
  @ResponseMessage(MESSAGE_ID.recipeCreated)
  createRecipe(@Body() recipe: CreateRecipeDto) {
    return this.recipesService.createRecipe(recipe);
  }

  @Delete(":id")
  @ResponseMessage(MESSAGE_ID.recipeDeleted)
  deleteRecipe(@Param("id") id: string): Promise<void> {
    return this.recipesService.deleteRecipe(id);
  }

  @Patch(":id")
  @ResponseMessage(MESSAGE_ID.recipeUpdated)
  updateRecipePatch(
    @Param("id") id: string,
    @Body() recipe: UpdateRecipeDto,
  ): Promise<Recipe> {
    return this.recipesService.updateRecipe(id, recipe);
  }

  @Put(":id")
  @ResponseMessage(MESSAGE_ID.recipeUpdated)
  updateRecipePut(
    @Param("id") id: string,
    @Body() recipe: UpdateRecipeDto,
  ): Promise<Recipe> {
    return this.recipesService.updateRecipe(id, recipe);
  }

  @Post(":id/publish")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.recipePublished)
  publishRecipe(@Param("id") id: string): Promise<Recipe> {
    return this.recipesService.publishRecipe(id);
  }

  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.recipeArchived)
  archiveRecipe(@Param("id") id: string): Promise<Recipe> {
    return this.recipesService.archiveRecipe(id);
  }

  @Post(":id/draft")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.recipeSetToDraft)
  draftRecipe(@Param("id") id: string): Promise<Recipe> {
    return this.recipesService.draftRecipe(id);
  }
}
