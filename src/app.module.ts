import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RecipesModule } from "./recipes/recipes.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RecipesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    //* test custom injections
    { provide: "TEST_SOMETHING", useValue: "This is a test value" },
    { provide: "TEST_SOMETHING_NEW", useValue: "This is a new test value" },
  ],
})
export class AppModule {}
