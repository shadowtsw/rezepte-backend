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

const FLOUR_ID = "44444444-4444-4444-8444-444444444444";

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
          {
            id: "usage-1",
            ingredientId: FLOUR_ID,
            ingredient: "Mehl",
            amount: 200,
            unit: "g",
          },
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

  it("accepts decimal amounts", async () => {
    const sectionsWithDecimalAmount = buildSectionsWithAmount(0.5);

    const result = await validateUpdate({
      sections: sectionsWithDecimalAmount,
    });
    const usage = result.sections?.[0].steps[0].ingredients[0];

    expect(usage?.amount).toBe(0.5);
  });

  it("rejects negative amounts", async () => {
    const sectionsWithNegativeAmount = buildSectionsWithAmount(-1);

    await expect(
      validateUpdate({ sections: sectionsWithNegativeAmount }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("UpdateRecipeDto ingredient usages", () => {
  function usageWith(changes: Record<string, unknown>) {
    const step = validSections[0].steps[0];
    const usage = { ...step.ingredients[0], ...changes };

    return [
      { ...validSections[0], steps: [{ ...step, ingredients: [usage] }] },
    ];
  }

  it("requires the ingredient id", async () => {
    await expect(
      validateUpdate({ sections: usageWith({ ingredientId: undefined }) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("accepts only units from the fixed list", async () => {
    await expect(
      validateUpdate({ sections: usageWith({ unit: "Tasse" }) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      validateUpdate({ sections: usageWith({ unit: "Zehe" }) }),
    ).resolves.toBeDefined();
  });

  it("treats an empty unit as no unit", async () => {
    const result = await validateUpdate({ sections: usageWith({ unit: "" }) });

    expect(result.sections?.[0].steps[0].ingredients[0].unit).toBeUndefined();
  });
});

function buildSectionsWithAmount(amount: number) {
  const step = validSections[0].steps[0];
  const usage = { ...step.ingredients[0], amount };

  return [{ ...validSections[0], steps: [{ ...step, ingredients: [usage] }] }];
}
