import { Module } from "@nestjs/common";
import { RecipesController } from "./recipes.controller";
import { RecipesService } from "./recipes.service";
// import { InMemoryRecipesRepository } from "./repositories/in-memory-recipes.repository";
import {
  COLLECTION_NAME,
  DATABASE_NAME,
  MONGO_CLIENT,
  RECIPE_COLLECTION,
  RECIPE_REPOSITORY,
} from "./recipe.constants";
import { ConfigService } from "@nestjs/config";
import { MongoClient } from "mongodb";
import { Recipe } from "./recipe.model";
import { MongoRecipesRepository } from "./repositories/mongo-recipes.repository";

@Module({
  controllers: [RecipesController],
  providers: [
    RecipesService,
    {
      provide: RECIPE_REPOSITORY,
      useClass: MongoRecipesRepository,
    },
    {
      provide: MONGO_CLIENT,

      useFactory: async (configService: ConfigService) => {
        const mongoUri = configService.get<string>("MONGO_URI");

        const client = new MongoClient(mongoUri ?? "");

        await client.connect();

        return client;
      },

      inject: [ConfigService],
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
})
export class RecipesModule {}
