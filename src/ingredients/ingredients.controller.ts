import { Controller, Get, Param, Post, Query, Body } from "@nestjs/common";
import { IngredientsService } from "./ingredients.service";
import { CreateIngredientDto } from "./dto/create-ingredient.dto";

@Controller("ingredients")
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get()
  async getAllIngredients(@Query("search") search?: string) {
    return this.ingredientsService.getAllIngredients(search);
  }

  @Get(":id")
  async getIngredientById(@Param("id") id: string) {
    return this.ingredientsService.getIngredientById(id);
  }

  @Post()
  async createIngredient(@Body() ingredient: CreateIngredientDto) {
    return this.ingredientsService.createIngredient(ingredient);
  }
}
