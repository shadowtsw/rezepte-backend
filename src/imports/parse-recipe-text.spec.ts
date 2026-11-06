import { parseRecipeText } from "./parse-recipe-text";

const STANDARD = `Titel: Kartoffelgratin
Portionen: 4
Quelle: Kochbuch Oma, S. 12
Zutaten:
1 kg Kartoffeln, festkochend
200 ml Sahne
? 1 Becher Schmand
Salz`;

const FREE_NOTE = `Kartoffelgratin für 4

Für den Belag:
1kg Kartoffeln festkochend
1/4 l Sahne
Salz und Pfeffer`;

describe("parseRecipeText", () => {
  it("reads the standard format with header lines", () => {
    const result = parseRecipeText(STANDARD);

    expect(result).toMatchObject({
      title: "Kartoffelgratin",
      servings: 4,
      source: "Kochbuch Oma, S. 12",
    });
    expect(result.lines.map((line) => line.name)).toEqual([
      "Kartoffeln, festkochend",
      "Sahne",
      "Schmand",
      "Salz",
    ]);
  });

  it("takes title and servings from the first line of a free note and skips headings", () => {
    const result = parseRecipeText(FREE_NOTE);

    expect(result).toMatchObject({
      title: "Kartoffelgratin",
      servings: 4,
      source: null,
    });
    expect(
      result.lines.map((line) => (line.skipped ? "(skipped)" : line.name)),
    ).toEqual([
      "(skipped)",
      "Kartoffeln festkochend",
      "Sahne",
      "Salz und Pfeffer",
    ]);
  });

  it("ignores lines before 'Zutaten:' that are no headers", () => {
    const result = parseRecipeText(
      "Mein Lieblingsrezept\nTitel: Dal\nZutaten:\n250 g rote Linsen",
    );

    expect(result.title).toBe("Dal");
    expect(result.lines).toHaveLength(1);
  });

  it("treats a plain list as ingredients only", () => {
    const result = parseRecipeText("200 g Mehl\n2 Eier");

    expect(result.title).toBeNull();
    expect(result.lines.map((line) => line.name)).toEqual(["Mehl", "Eier"]);
  });

  it("accepts '(für 6 Personen)' and ignores invalid servings", () => {
    expect(parseRecipeText("Linsensuppe (für 6 Personen)\nSalz").servings).toBe(
      6,
    );
    expect(parseRecipeText("Portionen: viele\nSalz").servings).toBeNull();
  });
});
