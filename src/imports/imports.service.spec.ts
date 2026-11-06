import type { IngredientsService } from "src/ingredients/ingredients.service";
import { ImportsService } from "./imports.service";
import { FetchPageError } from "./safe-fetch";

const registry = [
  { id: "onion", name: "Zwiebel", normalizedName: "zwiebel" },
  { id: "cream", name: "Sahne", normalizedName: "sahne" },
];

const ingredientsService = {
  getAllIngredients: jest.fn().mockResolvedValue(registry),
};

function serviceWithPage(fetchPage: (url: string) => Promise<string>) {
  return new ImportsService(
    ingredientsService as unknown as IngredientsService,
    fetchPage,
  );
}

describe("ImportsService.parseText", () => {
  const service = serviceWithPage(() => Promise.reject(new Error("unused")));

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

describe("ImportsService.parseLink", () => {
  const recipePage = `<script type="application/ld+json">${JSON.stringify({
    "@type": "Recipe",
    name: "Zwiebelsuppe",
    recipeYield: "4",
    recipeIngredient: ["500 g Zwiebeln", "1 l Brühe"],
  })}</script>`;

  it("builds the preview from the page, with the link as source", async () => {
    const preview = await serviceWithPage(() =>
      Promise.resolve(recipePage),
    ).parseLink(" https://www.chefkoch.de/rezepte/1/zwiebelsuppe.html ");

    expect(preview).toMatchObject({
      title: "Zwiebelsuppe",
      servings: 4,
      source: "https://www.chefkoch.de/rezepte/1/zwiebelsuppe.html",
    });
    expect(
      preview.lines.map((line) => [line.amount, line.unit, line.name]),
    ).toEqual([
      [500, "g", "Zwiebeln"],
      [1, "l", "Brühe"],
    ]);
    expect(preview.lines[0]?.match).toMatchObject({ kind: "similar" });
  });

  it("answers 422 without recipe data", async () => {
    await expect(
      serviceWithPage(() => Promise.resolve("<html></html>")).parseLink(
        "https://blog.example.org/",
      ),
    ).rejects.toMatchObject({
      status: 422,
      response: { message: "IMPORT_NO_RECIPE" },
    });
  });

  it("answers 400 for blocked links and 502 when the page fails", async () => {
    await expect(
      serviceWithPage(() =>
        Promise.reject(new FetchPageError("blocked")),
      ).parseLink("http://192.168.178.1/"),
    ).rejects.toMatchObject({
      status: 400,
      response: { message: "IMPORT_LINK_BLOCKED" },
    });
    await expect(
      serviceWithPage(() =>
        Promise.reject(new FetchPageError("unreachable")),
      ).parseLink("https://example.org/"),
    ).rejects.toMatchObject({
      status: 502,
      response: { message: "IMPORT_LINK_UNREACHABLE" },
    });
  });
});
