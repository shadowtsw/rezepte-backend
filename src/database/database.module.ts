import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongoClient } from "mongodb";
import { MONGO_CLIENT } from "./database.constants";

@Module({
  providers: [
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
  ],
  exports: [MONGO_CLIENT],
})
export class DatabaseModule {}
