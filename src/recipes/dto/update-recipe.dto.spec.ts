import { BadRequestException, ValidationPipe } from "@nestjs/common";

import { VALIDATION_PIPE_OPTIONS } from "src/common/pipes/validation-pipe.options";
import { UpdateRecipeDto } from "./update-recipe.dto";

const validationPipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);

function validateUpdate(
  body: Record<string, unknown>,
): Promise<UpdateRecipeDto> {
  return validationPipe.transform(body, {
    type: "body",
    metatype: UpdateRecipeDto,
  }) as Promise<UpdateRecipeDto>;
}

const validSections = [
  {
    id: "section-1",
    title: "Teig",
    steps: [
      {
        id: "step-1",
        title: "Mischen",
        instruction: "Alles verrühren",
        ingredients: [
          { id: "usage-1", ingredient: "Mehl", amount: 200, unit: "g" },
        ],
      },
    ],
  },
];

describe("UpdateRecipeDto validation", () => {
  it("strips status so PATCH cannot change it", async () => {
    const result = await validateUpdate({ title: "Brot", status: "published" });

    expect(result).not.toHaveProperty("status");
    expect(result.title).toBe("Brot");
  });

  it("strips the recipe id so it cannot be changed", async () => {
    const result = await validateUpdate({
      id: "3f45c5b1-c2a3-41ad-9642-015dcace373d",
    });

    expect(result).not.toHaveProperty("id");
  });

  it("strips unknown properties", async () => {
    const result = await validateUpdate({ title: "Brot", unknownField: true });

    expect(result).not.toHaveProperty("unknownField");
  });

  it("keeps the id of ingredient usages", async () => {
    const result = await validateUpdate({ sections: validSections });
    const usage = result.sections?.[0].steps[0].ingredients[0];

    expect(usage?.id).toBe("usage-1");
  });

  it("rejects ingredient usages without id", async () => {
    const sectionsWithoutUsageId = [
      {
        ...validSections[0],
        steps: [
          {
            ...validSections[0].steps[0],
            ingredients: [{ ingredient: "Mehl" }],
          },
        ],
      },
    ];

    await expect(
      validateUpdate({ sections: sectionsWithoutUsageId }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
