import { Module } from "@nestjs/common";
import type { MongoClient } from "mongodb";
import { DatabaseModule } from "../database/database.module";
import { DATABASE_NAME, MONGO_CLIENT } from "../database/database.constants";
import {
  COLLECTION_COLLECTION,
  COLLECTION_REPOSITORY,
  RECIPE_COLLECTION_NAME,
} from "./collection.constants";
import type { RecipeCollection } from "./collection.model";
import { MongoCollectionsRepository } from "./repositories/mongo-collections.repository";
import { CollectionsService } from "./collections.service";
import { CollectionsController } from "./collections.controller";
import { RecipesModule } from "src/recipes/recipes.module";

@Module({
  imports: [DatabaseModule, RecipesModule],
  controllers: [CollectionsController],
  providers: [
    {
      provide: COLLECTION_COLLECTION,
      useFactory: (client: MongoClient) => {
        const db = client.db(DATABASE_NAME);

        return db.collection<RecipeCollection>(RECIPE_COLLECTION_NAME);
      },
      inject: [MONGO_CLIENT],
    },
    {
      provide: COLLECTION_REPOSITORY,
      useClass: MongoCollectionsRepository,
    },
    CollectionsService,
  ],
})
export class CollectionsModule {}
