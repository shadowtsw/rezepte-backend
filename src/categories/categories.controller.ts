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
import { CategoryWithCount, RecipeCategory } from "./category.model";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryOrderDto } from "./dto/update-category-order.dto";
import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  getAllCategories(): Promise<CategoryWithCount[]> {
    return this.categoriesService.getAllCategories();
  }

  @Get(":id")
  async getCategoryById(@Param("id") id: string) {
    return this.categoriesService.getCategoryById(id);
  }

  @Post()
  @ResponseMessage(MESSAGE_ID.categoryCreated)
  async createCategory(@Body() category: CreateCategoryDto) {
    return this.categoriesService.createCategory(category);
  }

  // Before ":id", otherwise "order" would be taken as a category id.
  @Put("order")
  @ResponseMessage(MESSAGE_ID.categoryOrderSaved)
  async updateOrder(@Body() dto: UpdateCategoryOrderDto) {
    return this.categoriesService.updateOrder(dto.ids);
  }

  @Put(":id")
  @ResponseMessage(MESSAGE_ID.categoryUpdated)
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
  @ResponseMessage(MESSAGE_ID.categoryDeleted)
  async deleteCategory(@Param("id") id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}
