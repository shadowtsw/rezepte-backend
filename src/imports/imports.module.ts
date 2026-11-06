import { Module } from "@nestjs/common";

import { IngredientsModule } from "src/ingredients/ingredients.module";
import { ImportsController } from "./imports.controller";
import { ImportsService } from "./imports.service";
import { PAGE_FETCHER } from "./imports.constants";
import { fetchPublicPage } from "./safe-fetch";

@Module({
  imports: [IngredientsModule],
  controllers: [ImportsController],
  providers: [
    ImportsService,
    { provide: PAGE_FETCHER, useValue: (url: string) => fetchPublicPage(url) },
  ],
})
export class ImportsModule {}
