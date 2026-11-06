import { parseIngredientLine } from "./parse-ingredient-line";

/** The parts a test usually checks, without the original line. */
function parsed(line: string) {
  const { amount, unit, name, note, skipped } = parseIngredientLine(line);

  return { amount, unit, name, note, skipped };
}

function issueIds(line: string): string[] {
  return parseIngredientLine(line).issues.map((issue) => issue.message);
}

describe("parseIngredientLine", () => {
  describe("standard format", () => {
    it.each([
      [
        "1 kg Kartoffeln, festkochend",
        { amount: 1, unit: "kg", name: "Kartoffeln, festkochend", note: null },
      ],
      ["200 ml Sahne", { amount: 200, unit: "ml", name: "Sahne", note: null }],
      [
        "100 g Gouda (gerieben)",
        { amount: 100, unit: "g", name: "Gouda", note: "gerieben" },
      ],
      [
        "1 Zehe Knoblauch (gepresst)",
        { amount: 1, unit: "Zehe", name: "Knoblauch", note: "gepresst" },
      ],
      [
        "0,5 TL Muskat",
        { amount: 0.5, unit: "TL", name: "Muskat", note: null },
      ],
      ["2 Eier", { amount: 2, unit: null, name: "Eier", note: null }],
      ["Salz", { amount: null, unit: null, name: "Salz", note: null }],
    ])("reads %j", (line, expected) => {
      expect(parsed(line)).toEqual({ ...expected, skipped: false });
    });

    it("keeps lines marked with '?' and reports them", () => {
      expect(parsed("? 1 Becher Schmand")).toMatchObject({
        amount: 1,
        unit: "Becher",
        name: "Schmand",
      });
      expect(issueIds("? 1 Becher Schmand")).toEqual(["IMPORT_MARKED_UNSURE"]);
    });
  });

  describe("amounts", () => {
    it.each([
      ["1.5 l Milch", 1.5],
      ["1/4 l Sahne", 0.25],
      ["½ TL Salz", 0.5],
      ["1½ EL Zucker", 1.5],
      ["1 ½ EL Zucker", 1.5],
      ["1kg Mehl", 1],
    ])("reads the amount of %j", (line, amount) => {
      expect(parseIngredientLine(line).amount).toBe(amount);
    });

    it("takes the upper value of a range and reports it", () => {
      const line = parseIngredientLine("2-3 Zwiebeln");

      expect(line).toMatchObject({ amount: 3, name: "Zwiebeln" });
      expect(line.issues).toEqual([
        { message: "IMPORT_RANGE", params: { from: "2", to: "3" } },
      ]);
    });

    it.each(["etwas Butter", "Pfeffer nach Geschmack", "evtl. Chili"])(
      "treats %j as no amount",
      (line) => {
        expect(parseIngredientLine(line).amount).toBeNull();
      },
    );
  });

  describe("units", () => {
    it.each([
      ["2 Esslöffel Öl", "EL"],
      ["2 EL. Öl", "EL"],
      ["200 gr Mehl", "g"],
      ["1 Pck. Backpulver", "Packung"],
      ["3 Stk Äpfel", "Stück"],
      ["1 Msp. Zimt", "Messerspitze"],
    ])("maps %j to %s", (line, unit) => {
      expect(parseIngredientLine(line).unit).toBe(unit);
    });

    it("does not convert unknown units and reports them", () => {
      const line = parseIngredientLine("1 Tasse Reis");

      expect(line).toMatchObject({ amount: 1, unit: null, name: "Reis" });
      expect(line.issues).toEqual([
        { message: "IMPORT_UNKNOWN_UNIT", params: { unit: "Tasse" } },
      ]);
    });

    it("does not take the first word of a name as unit when there is no amount", () => {
      expect(parsed("Glas Gurken")).toMatchObject({
        unit: null,
        name: "Glas Gurken",
      });
    });
  });

  describe("notes", () => {
    it.each([
      ["2 Zwiebeln, fein gewürfelt", "Zwiebeln", "fein gewürfelt"],
      ["1 Tasse geriebener Gouda", "Gouda", "gerieben"],
      ["etwas Butter für die Form", "Butter", "für die Form"],
    ])("splits the note off %j", (line, name, note) => {
      expect(parseIngredientLine(line)).toMatchObject({ name, note });
    });
  });

  describe("special lines", () => {
    it("skips headings", () => {
      expect(parsed("Für den Teig:")).toMatchObject({ skipped: true });
    });

    it("reports several ingredients in one line", () => {
      expect(issueIds("Salz und Pfeffer")).toEqual([
        "IMPORT_SEVERAL_INGREDIENTS",
      ]);
    });

    it("reports a line without ingredient name", () => {
      expect(issueIds("200 g")).toEqual(["IMPORT_NAME_MISSING"]);
    });
  });
});
