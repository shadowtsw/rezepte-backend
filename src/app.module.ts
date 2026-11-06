import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RecipesModule } from "./recipes/recipes.module";
import { ConfigModule } from "@nestjs/config";
import { CategoriesModule } from "./categories/categories.module";
import { IngredientsModule } from "./ingredients/ingredients.module";
import { CollectionsModule } from "./collections/collections.module";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { MessagesModule } from "./messages/messages.module";
import { ImportsModule } from "./imports/imports.module";
import { ResponseEnvelopeInterceptor } from "./common/api/response-envelope.interceptor";
import { ApiExceptionFilter } from "./common/api/api-exception.filter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    RecipesModule,
    CategoriesModule,
    IngredientsModule,
    CollectionsModule,
    MessagesModule,
    ImportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Message-response concept: every response is { message, error, data }.
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    //* test custom injections
    { provide: "TEST_SOMETHING", useValue: "This is a test value" },
    { provide: "TEST_SOMETHING_NEW", useValue: "This is a new test value" },
  ],
})
export class AppModule {}
