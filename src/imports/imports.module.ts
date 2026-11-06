import { Module } from "@nestjs/common";

import { IngredientsModule } from "src/ingredients/ingredients.module";
import { ImportsController } from "./imports.controller";
import { ImportsService } from "./imports.service";

@Module({
  imports: [IngredientsModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
