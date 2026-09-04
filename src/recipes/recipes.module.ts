import { Module } from "@nestjs/common";
import { RecipesController } from "./recipes.controller";
import { RecipesService } from "./recipes.service";
// import { InMemoryRecipesRepository } from "./repositories/in-memory-recipes.repository";
import {
  COLLECTION_NAME,
  RECIPE_COLLECTION,
  RECIPE_REPOSITORY,
} from "./recipe.constants";
import { MongoClient } from "mongodb";
import { Recipe } from "./recipe.model";
import { MongoRecipesRepository } from "./repositories/mongo-recipes.repository";
import { DatabaseModule } from "src/database/database.module";
import { DATABASE_NAME, MONGO_CLIENT } from "src/database/database.constants";
import { IngredientsModule } from "src/ingredients/ingredients.module";

@Module({
  imports: [DatabaseModule, IngredientsModule],
  controllers: [RecipesController],
  providers: [
    RecipesService,
    {
      provide: RECIPE_REPOSITORY,
      useClass: MongoRecipesRepository,
    },
    {
      provide: RECIPE_COLLECTION,
      useFactory: (client: MongoClient) => {
        const db = client.db(DATABASE_NAME);

        return db.collection<Recipe>(COLLECTION_NAME);
      },
      inject: [MONGO_CLIENT],
    },
  ],
  exports: [RecipesService],
})
export class RecipesModule {}
