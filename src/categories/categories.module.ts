import { Module } from "@nestjs/common";
import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";
import {
  CATEGORY_COLLECTION,
  CATEGORY_COLLECTION_NAME,
  CATEGORY_REPOSITORY,
} from "./category.constants";
import { MongoCategoriesRepository } from "./repositories/mongo-categories.repository";
import { DatabaseModule } from "src/database/database.module";
import { MongoClient } from "mongodb";
import { RecipeCategory } from "./category.model";
import { DATABASE_NAME, MONGO_CLIENT } from "src/database/database.constants";
import { RecipesModule } from "src/recipes/recipes.module";

@Module({
  imports: [DatabaseModule, RecipesModule],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    {
      provide: CATEGORY_REPOSITORY,
      useClass: MongoCategoriesRepository,
    },
    {
      provide: CATEGORY_COLLECTION,
      useFactory: (client: MongoClient) => {
        const db = client.db(DATABASE_NAME);

        return db.collection<RecipeCategory>(CATEGORY_COLLECTION_NAME);
      },
      inject: [MONGO_CLIENT],
    },
  ],
})
export class CategoriesModule {}
