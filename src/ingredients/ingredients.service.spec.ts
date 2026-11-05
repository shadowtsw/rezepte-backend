import { Test, TestingModule } from "@nestjs/testing";

import { IngredientsService } from "./ingredients.service";
import { INGREDIENT_REPOSITORY } from "./ingredient.constants";

describe("IngredientsService", () => {
  let service: IngredientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngredientsService,
        { provide: INGREDIENT_REPOSITORY, useValue: {} },
      ],
    }).compile();

    service = module.get<IngredientsService>(IngredientsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
