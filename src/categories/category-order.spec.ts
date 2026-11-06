import {
  findNameConflict,
  nextPosition,
  normalizeCategoryName,
  orderedIds,
  sortCategories,
} from "./category-order";

const categories = [
  { id: "soups", name: "Suppen", position: 1 },
  { id: "cakes", name: "Kuchen", position: 0 },
  { id: "old-b", name: "Braten" },
  { id: "old-a", name: "Aufläufe" },
];

describe("category names", () => {
  it("compares ignoring case and spaces", () => {
    expect(normalizeCategoryName("  Süße Teige ")).toBe("süße teige");
    expect(findNameConflict(categories, "suppen ")?.id).toBe("soups");
  });

  it("lets a category keep its own name, e.g. when changing the case", () => {
    expect(findNameConflict(categories, "SUPPEN", "soups")).toBeUndefined();
  });
});

describe("sortCategories and nextPosition", () => {
  it("sorts by position, then categories without position by name", () => {
    expect(sortCategories(categories).map((c) => c.id)).toEqual([
      "cakes",
      "soups",
      "old-a",
      "old-b",
    ]);
  });

  it("puts new categories after all others", () => {
    expect(nextPosition(categories)).toBe(2);
    expect(nextPosition([{ id: "x", name: "X" }])).toBe(1);
    expect(nextPosition([])).toBe(0);
  });
});

describe("orderedIds", () => {
  it("takes the requested order and appends categories not mentioned", () => {
    expect(orderedIds(categories, ["old-b", "soups"])).toEqual([
      "old-b",
      "soups",
      "cakes",
      "old-a",
    ]);
  });

  it("ignores unknown and repeated ids", () => {
    expect(
      orderedIds(categories, ["gone", "soups", "soups", "cakes", "old-a"]),
    ).toEqual(["soups", "cakes", "old-a", "old-b"]);
  });
});
