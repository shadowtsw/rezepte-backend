import { Module } from "@nestjs/common";
import { RecipesController } from "./recipes.controller";
import { RecipesService } from "./recipes.service";
import { InMemoryRecipesRepository } from "./repositories/in-memory-recipes.repository";
import { RECIPE_REPOSITORY } from "./recipe.constants";

@Module({
  controllers: [RecipesController],
  providers: [
    RecipesService,
    {
      provide: RECIPE_REPOSITORY,
      useClass: InMemoryRecipesRepository,
    },
  ],
})
export class RecipesModule {}
