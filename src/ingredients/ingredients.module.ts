import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { IngredientsController } from "./ingredients.controller";
import { IngredientsService } from "./ingredients.service";
import { MongoIngredientsRepository } from "./repositories/mongo-ingredients.repository";
import { DATABASE_NAME, MONGO_CLIENT } from "src/database/database.constants";
import { Ingredient } from "./ingredient.model";
import { MongoClient } from "mongodb";
import {
  COLLECTION_NAME,
  INGREDIENT_COLLECTION,
  INGREDIENT_REPOSITORY,
} from "./ingredient.constants";

@Module({
  imports: [DatabaseModule],
  controllers: [IngredientsController],
  providers: [
    IngredientsService,
    {
      provide: INGREDIENT_COLLECTION,
      useFactory: async (client: MongoClient) => {
        const db = client.db(DATABASE_NAME);
        const collection = db.collection<Ingredient>(COLLECTION_NAME);

        await collection.createIndex({ normalizedName: 1 }, { unique: true });

        return collection;
      },
      inject: [MONGO_CLIENT],
    },
    {
      provide: INGREDIENT_REPOSITORY,
      useClass: MongoIngredientsRepository,
    },
  ],
  exports: [IngredientsService],
})
export class IngredientsModule {}
