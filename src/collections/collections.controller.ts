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
import { CollectionsService } from "./collections.service";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";
import { AddRecipeToCollectionDto } from "./dto/add-recipe-to-collection.dto";
import { UpdateCollectionItemsDto } from "./dto/update-collection-items.dto";

@Controller("collections")
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  getAllCollections() {
    return this.collectionsService.getAllCollections();
  }

  @Get(":id")
  getCollectionById(@Param("id") id: string) {
    return this.collectionsService.getCollectionById(id);
  }

  @Post()
  createCollection(@Body() dto: CreateCollectionDto) {
    return this.collectionsService.createCollection(dto);
  }

  @Patch(":id")
  updateCollection(@Param("id") id: string, @Body() dto: UpdateCollectionDto) {
    return this.collectionsService.updateCollection(id, dto);
  }

  @Delete(":id")
  deleteCollection(@Param("id") id: string): Promise<void> {
    return this.collectionsService.deleteCollection(id);
  }

  @Post(":id/recipes")
  addRecipeToCollection(
    @Param("id") id: string,
    @Body() dto: AddRecipeToCollectionDto,
  ) {
    return this.collectionsService.addRecipeToCollection(id, dto);
  }

  @Put(":id/items")
  updateCollectionItems(
    @Param("id") id: string,
    @Body() dto: UpdateCollectionItemsDto,
  ) {
    return this.collectionsService.updateCollectionItems(id, dto);
  }
}
