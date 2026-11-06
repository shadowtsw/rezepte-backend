import type { IngredientsService } from "src/ingredients/ingredients.service";
import { ImportsService } from "./imports.service";

const registry = [
  { id: "onion", name: "Zwiebel", normalizedName: "zwiebel" },
  { id: "cream", name: "Sahne", normalizedName: "sahne" },
];

describe("ImportsService.parseText", () => {
  const ingredientsService = {
    getAllIngredients: jest.fn().mockResolvedValue(registry),
  };
  const service = new ImportsService(
    ingredientsService as unknown as IngredientsService,
  );

  it("links exact matches, suggests similar ones and marks new ingredients", async () => {
    const preview = await service.parseText(
      "Gratin für 2\nFür die Soße:\n200 ml sahne\n2 Zwiebeln\n1 Pastinake",
    );
    const [heading, cream, onions, parsnip] = preview.lines;

    expect(preview).toMatchObject({ title: "Gratin", servings: 2 });
    expect(heading).toMatchObject({ skipped: true });
    expect(cream?.match).toEqual({
      kind: "exact",
      ingredientId: "cream",
      name: "Sahne",
    });
    expect(cream?.issues).toEqual([]);
    expect(onions?.match).toEqual({
      kind: "similar",
      ingredientId: "onion",
      name: "Zwiebel",
    });
    expect(onions?.issues).toEqual([
      { message: "IMPORT_SIMILAR_INGREDIENT", params: { name: "Zwiebel" } },
    ]);
    expect(parsnip?.match).toEqual({ kind: "new" });
    expect(parsnip?.issues).toEqual([{ message: "IMPORT_NEW_INGREDIENT" }]);
  });
});
