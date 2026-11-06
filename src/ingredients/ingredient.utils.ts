export function normalizeIngredientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const MIN_SIMILAR_LENGTH = 4;
const PLURAL_ENDINGS = ["n", "en", "e", "s"];

/**
 * A registry entry that differs only by a German plural or singular ending ("Zwiebeln" / "Zwiebel").
 * Same rule as the frontend hint (utils/ingredientNames.ts). Exact matches are not "similar".
 */
export function findSimilarIngredient<T extends { name: string }>(
  ingredients: T[],
  name: string,
): T | undefined {
  const needle = normalizeIngredientName(name);

  if (needle.length < MIN_SIMILAR_LENGTH) {
    return undefined;
  }

  return ingredients.find((ingredient) => {
    const candidate = normalizeIngredientName(ingredient.name);

    return PLURAL_ENDINGS.some(
      (ending) =>
        needle === candidate + ending || candidate === needle + ending,
    );
  });
}
