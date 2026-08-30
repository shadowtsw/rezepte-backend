import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { RecipeCategory } from "./category.model";
import { CreateCategoryDto } from "./dto/create-category.dto";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  getAllCategories(): Promise<RecipeCategory[]> {
    return this.categoriesService.getAllCategories();
  }

  @Get(":id")
  async getCategoryById(@Param("id") id: string) {
    return this.categoriesService.getCategoryById(id);
  }

  @Post()
  async createCategory(@Body() category: CreateCategoryDto) {
    return this.categoriesService.createCategory(category);
  }

  @Put(":id")
  async updateCategory(
    @Param("id") id: string,
    @Body() dto: CreateCategoryDto,
  ) {
    const category: RecipeCategory = {
      id,
      name: dto.name,
    };

    return this.categoriesService.updateCategory(id, category);
  }

  @Get(":id/recipes")
  async getRecipesByCategory(@Param("id") id: string) {
    return this.categoriesService.getRecipesByCategory(id);
  }

  @Delete(":id")
  async deleteCategory(@Param("id") id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}
