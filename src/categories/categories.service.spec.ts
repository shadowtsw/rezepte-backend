import { Test, TestingModule } from "@nestjs/testing";

import { CategoriesService } from "./categories.service";
import { CATEGORY_REPOSITORY } from "./category.constants";
import { RecipesService } from "src/recipes/recipes.service";

describe("CategoriesService", () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CATEGORY_REPOSITORY, useValue: {} },
        { provide: RecipesService, useValue: {} },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
