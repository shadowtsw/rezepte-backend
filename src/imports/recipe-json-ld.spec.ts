import { decodeEntities, extractRecipeFromHtml } from "./recipe-json-ld";

function page(...jsonLd: string[]): string {
  return `<html><head><title>x</title>${jsonLd
    .map((json) => `<script type="application/ld+json">${json}</script>`)
    .join("")}</head><body>…</body></html>`;
}

describe("extractRecipeFromHtml", () => {
  it("reads name, yield and ingredients of a plain Recipe", () => {
    const html = page(
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Kartoffelgratin",
        recipeYield: "4 Portionen",
        recipeIngredient: ["1 kg Kartoffeln, festkochend", "200 ml Sahne"],
        recipeInstructions: [{ "@type": "HowToStep", text: "Schälen" }],
      }),
    );

    expect(extractRecipeFromHtml(html)).toEqual({
      title: "Kartoffelgratin",
      servings: 4,
      ingredients: ["1 kg Kartoffeln, festkochend", "200 ml Sahne"],
    });
  });

  it("finds the recipe inside @graph, next to other scripts", () => {
    const html = page(
      JSON.stringify({ "@type": "WebSite", name: "Blog" }),
      JSON.stringify({
        "@graph": [
          { "@type": "BreadcrumbList" },
          {
            "@type": ["Recipe", "NewsArticle"],
            name: "Dal &amp; Reis",
            recipeYield: ["2", "2 Teller"],
            recipeIngredient: [
              "250 g rote Linsen",
              "  Salz <b>nach</b>   Geschmack ",
            ],
          },
        ],
      }),
    );

    expect(extractRecipeFromHtml(html)).toEqual({
      title: "Dal & Reis",
      servings: 2,
      ingredients: ["250 g rote Linsen", "Salz nach Geschmack"],
    });
  });

  it("tolerates broken JSON in other scripts and raw line breaks", () => {
    const html = page(
      "{ not json",
      '{"@type":"Recipe","name":"Brot","recipeIngredient":["500 g Mehl\n(Type 550)"]}',
    );

    expect(extractRecipeFromHtml(html)?.ingredients).toEqual([
      "500 g Mehl (Type 550)",
    ]);
  });

  it("returns null without a recipe or without ingredients", () => {
    expect(
      extractRecipeFromHtml("<html><body>Kein Rezept</body></html>"),
    ).toBeNull();
    expect(
      extractRecipeFromHtml(
        page(JSON.stringify({ "@type": "Recipe", name: "Leer" })),
      ),
    ).toBeNull();
  });
});

describe("decodeEntities", () => {
  it("decodes named and numeric entities", () => {
    expect(
      decodeEntities("&frac12; TL &#8211; Salz &#x26; M&uuml;sli &unknown;"),
    ).toBe("½ TL – Salz & Müsli &unknown;");
  });

  it("keeps invalid code points as written", () => {
    expect(decodeEntities("a &#99999999; b")).toBe("a &#99999999; b");
  });
});
