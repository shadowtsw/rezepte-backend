import { Test, TestingModule } from "@nestjs/testing";

import { CategoriesService } from "./categories.service";
import { CATEGORY_REPOSITORY } from "./category.constants";
import { RecipeCategory } from "./category.model";
import { RecipesService } from "src/recipes/recipes.service";

describe("CategoriesService", () => {
  let service: CategoriesService;
  let stored: RecipeCategory[];
  let categoryRepository: {
    getAllCategories: jest.Mock;
    createCategory: jest.Mock;
    updateCategory: jest.Mock;
    updatePositions: jest.Mock;
  };

  beforeEach(async () => {
    stored = [
      { id: "soups", name: "Suppen", position: 1 },
      { id: "cakes", name: "Kuchen", position: 0 },
      { id: "old", name: "Aufläufe" },
    ];
    categoryRepository = {
      getAllCategories: jest.fn(() => Promise.resolve(stored)),
      createCategory: jest.fn((category: RecipeCategory) =>
        Promise.resolve(category),
      ),
      updateCategory: jest.fn((id: string, category: RecipeCategory) =>
        Promise.resolve(category),
      ),
      updatePositions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CATEGORY_REPOSITORY, useValue: categoryRepository },
        {
          provide: RecipesService,
          useValue: {
            countRecipesByCategory: () => Promise.resolve({ soups: 7 }),
          },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it("lists categories in order with their recipe count", async () => {
    const categories = await service.getAllCategories();

    expect(categories.map((c) => [c.id, c.recipeCount])).toEqual([
      ["cakes", 0],
      ["soups", 7],
      ["old", 0],
    ]);
  });

  it("puts a new category at the end, saving missing positions first", async () => {
    const created = await service.createCategory({ name: "Salate" });

    expect(categoryRepository.updatePositions).toHaveBeenCalledWith([
      "cakes",
      "soups",
      "old",
    ]);
    expect(created).toMatchObject({ name: "Salate", position: 3 });
  });

  it("uses the next position when all categories have one", async () => {
    stored = stored.filter((category) => category.id !== "old");

    const created = await service.createCategory({ name: "Salate" });

    expect(categoryRepository.updatePositions).not.toHaveBeenCalled();
    expect(created).toMatchObject({ position: 2 });
  });

  it("rejects a name that exists in another case", async () => {
    await expect(
      service.createCategory({ name: "suppen" }),
    ).rejects.toMatchObject({
      status: 409,
      response: {
        message: "CATEGORY_NAME_TAKEN",
        params: { name: "Suppen" },
      },
    });
    expect(categoryRepository.createCategory).not.toHaveBeenCalled();
  });

  it("allows renaming a category to another case of its own name", async () => {
    await service.updateCategory("soups", { id: "soups", name: "SUPPEN" });

    await expect(
      service.updateCategory("cakes", { id: "cakes", name: "Suppen" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("saves the order and keeps categories that were not mentioned", async () => {
    await service.updateOrder(["old", "soups"]);

    expect(categoryRepository.updatePositions).toHaveBeenCalledWith([
      "old",
      "soups",
      "cakes",
    ]);
  });
});
