import {
  type IngredientContribution,
  summarizeIngredients,
} from "./ingredient-summary";

const LENTILS = "lentils-id";
const CUMIN = "cumin-id";

function part(
  overrides: Partial<IngredientContribution> & { name: string },
): IngredientContribution {
  return { factor: 1, origin: { stepId: "step-1" }, ...overrides };
}

function line(contributions: IngredientContribution[], name: string) {
  return summarizeIngredients(contributions).find(
    (entry) => entry.name === name,
  );
}

describe("summarizeIngredients", () => {
  it("sums the same ingredient and unit and keeps every part with its origin", () => {
    const lentils = line(
      [
        part({
          ingredientId: LENTILS,
          name: "rote Linsen",
          amount: 250,
          unit: "g",
          origin: { stepId: "unassigned" },
        }),
        part({
          ingredientId: LENTILS,
          name: "rote Linsen",
          amount: 500,
          unit: "g",
          origin: { stepId: "step-1" },
        }),
      ],
      "rote Linsen",
    );

    expect(lentils).toMatchObject({
      amount: 750,
      unit: "g",
      approximate: false,
    });
    expect(lentils?.parts).toEqual([
      { amount: 250, unit: "g", note: null, origin: { stepId: "unassigned" } },
      { amount: 500, unit: "g", note: null, origin: { stepId: "step-1" } },
    ]);
  });

  it("converts within a kind and picks a readable unit", () => {
    const contributions = [
      part({
        ingredientId: LENTILS,
        name: "rote Linsen",
        amount: 800,
        unit: "g",
      }),
      part({
        ingredientId: LENTILS,
        name: "rote Linsen",
        amount: 0.4,
        unit: "kg",
      }),
    ];

    expect(line(contributions, "rote Linsen")).toMatchObject({
      amount: 1.2,
      unit: "kg",
    });
  });

  it("adds teaspoons and tablespoons", () => {
    const halfTeaspoonAndTablespoon = [
      part({
        ingredientId: CUMIN,
        name: "Kreuzkümmel",
        amount: 0.5,
        unit: "TL",
      }),
      part({ ingredientId: CUMIN, name: "Kreuzkümmel", amount: 1, unit: "EL" }),
    ];
    const twoTablespoons = [
      part({ ingredientId: CUMIN, name: "Kreuzkümmel", amount: 3, unit: "TL" }),
      part({ ingredientId: CUMIN, name: "Kreuzkümmel", amount: 1, unit: "EL" }),
    ];

    expect(line(halfTeaspoonAndTablespoon, "Kreuzkümmel")).toMatchObject({
      amount: 3.5,
      unit: "TL",
    });
    expect(line(twoTablespoons, "Kreuzkümmel")).toMatchObject({
      amount: 2,
      unit: "EL",
    });
  });

  it("keeps different kinds of units apart", () => {
    const lines = summarizeIngredients([
      part({ ingredientId: "sugar", name: "Zucker", amount: 80, unit: "g" }),
      part({ ingredientId: "sugar", name: "Zucker", amount: 2, unit: "EL" }),
    ]);

    expect(lines).toHaveLength(2);
  });

  it("counts units without conversion and sums the same counted unit", () => {
    const lines = summarizeIngredients([
      part({
        ingredientId: "onion",
        name: "Zwiebel",
        amount: 2,
        unit: "Stück",
      }),
      part({
        ingredientId: "onion",
        name: "Zwiebel",
        amount: 1,
        unit: "Stück",
      }),
      part({
        ingredientId: "garlic",
        name: "Knoblauch",
        amount: 2,
        unit: "Zehe",
      }),
      part({ ingredientId: "eggs", name: "Eier", amount: 3 }),
    ]);

    expect(
      lines.map(({ name, amount, unit }) => ({ name, amount, unit })),
    ).toEqual([
      { name: "Eier", amount: 3, unit: null },
      { name: "Knoblauch", amount: 2, unit: "Zehe" },
      { name: "Zwiebel", amount: 3, unit: "Stück" },
    ]);
  });

  it("shows ingredients without amount once as 'nach Bedarf'", () => {
    const salt = line(
      [
        part({ ingredientId: "salt", name: "Salz" }),
        part({ ingredientId: "salt", name: "Salz" }),
      ],
      "Salz",
    );

    expect(salt).toMatchObject({ amount: null, unit: null });
    expect(salt?.parts).toHaveLength(2);
  });

  it("scales by servings and marks rounded totals", () => {
    const eggs = line(
      [
        part({
          ingredientId: "eggs",
          name: "Eier",
          amount: 3,
          factor: 4 / 3,
          origin: { recipeId: "pancakes", servings: 4 },
        }),
      ],
      "Eier",
    );
    const flour = line(
      [
        part({
          ingredientId: "flour",
          name: "Mehl",
          amount: 250,
          unit: "g",
          factor: 1.5,
        }),
      ],
      "Mehl",
    );

    expect(eggs).toMatchObject({ amount: 4, approximate: false });
    expect(
      line(
        [part({ ingredientId: "eggs", name: "Eier", amount: 3, factor: 0.5 })],
        "Eier",
      ),
    ).toMatchObject({
      amount: 1.5,
      approximate: false,
    });
    expect(
      line(
        [
          part({
            ingredientId: "eggs",
            name: "Eier",
            amount: 1,
            factor: 1 / 3,
          }),
        ],
        "Eier",
      ),
    ).toMatchObject({
      amount: 0.5,
      approximate: true,
    });
    expect(flour).toMatchObject({ amount: 375, unit: "g" });
  });

  it("matches usages without id by normalized name", () => {
    const lines = summarizeIngredients([
      part({ name: "Zwiebel", amount: 1, unit: "Stück" }),
      part({ name: " zwiebel ", amount: 1, unit: "Stück" }),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ amount: 2 });
  });

  it("sums 'Stück' and no unit on one line", () => {
    const eggs = line(
      [
        part({ ingredientId: "eggs", name: "Eier", amount: 2 }),
        part({ ingredientId: "eggs", name: "Eier", amount: 3, unit: "Stück" }),
      ],
      "Eier",
    );
    const onlyWithoutUnit = line(
      [part({ ingredientId: "eggs", name: "Eier", amount: 2 })],
      "Eier",
    );

    expect(eggs).toMatchObject({ amount: 5, unit: "Stück" });
    expect(onlyWithoutUnit).toMatchObject({ amount: 2, unit: null });
  });

  it("keeps the note per part without splitting the line", () => {
    const cheese = line(
      [
        part({
          ingredientId: "gouda",
          name: "Gouda",
          amount: 100,
          unit: "g",
          note: "gerieben",
        }),
        part({ ingredientId: "gouda", name: "Gouda", amount: 50, unit: "g" }),
      ],
      "Gouda",
    );

    expect(cheese).toMatchObject({ amount: 150, unit: "g" });
    expect(cheese?.parts.map((entry) => entry.note)).toEqual([
      "gerieben",
      null,
    ]);
  });
});
