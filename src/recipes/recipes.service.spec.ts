import { Test, TestingModule } from "@nestjs/testing";

import { RecipesService } from "./recipes.service";
import { RECIPE_REPOSITORY } from "./recipe.constants";
import { IngredientsService } from "src/ingredients/ingredients.service";

describe("RecipesService", () => {
  let service: RecipesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        { provide: RECIPE_REPOSITORY, useValue: {} },
        { provide: IngredientsService, useValue: {} },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
