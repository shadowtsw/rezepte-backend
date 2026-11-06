import { BadRequestException, ValidationPipe } from "@nestjs/common";

import { VALIDATION_PIPE_OPTIONS } from "src/common/pipes/validation-pipe.options";
import { UpdateCollectionItemsDto } from "./update-collection-items.dto";

const RECIPE_ID = "83feab8f-e999-4403-8e65-d86a3c103a65";
const validationPipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);

function validate(items: unknown[]): Promise<UpdateCollectionItemsDto> {
  return validationPipe.transform(
    { version: 1, items },
    { type: "body", metatype: UpdateCollectionItemsDto },
  ) as Promise<UpdateCollectionItemsDto>;
}

describe("UpdateCollectionItemsDto validation", () => {
  it("accepts servings on single recipes and recipes in groups", async () => {
    const result = await validate([
      { type: "recipe", recipeId: RECIPE_ID, servings: 4 },
      {
        type: "group",
        name: "Samstagsmenü",
        recipes: [{ recipeId: RECIPE_ID, servings: 2 }],
      },
    ]);

    expect(result.items[0]).toMatchObject({ servings: 4 });
  });

  it("accepts entries without servings", async () => {
    await expect(
      validate([{ type: "recipe", recipeId: RECIPE_ID }]),
    ).resolves.toBeDefined();
  });

  it.each([0, -1, 1.5])("rejects servings of %p", async (servings) => {
    await expect(
      validate([{ type: "recipe", recipeId: RECIPE_ID, servings }]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects invalid servings inside a group", async () => {
    await expect(
      validate([
        {
          type: "group",
          name: "Samstagsmenü",
          recipes: [{ recipeId: RECIPE_ID, servings: 0 }],
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
