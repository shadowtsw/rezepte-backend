import { RecipeCategory } from "./category.model";

/**
 * Category order and name rules (guidelines projects/rezepte.md, D11). Pure functions, so the
 * service stays small and the rules are tested without a database.
 */

/** Names are unique ignoring case and surrounding spaces ("suppen" = "Suppen"). */
export function normalizeCategoryName(name: string): string {
  return name.trim().toLocaleLowerCase("de");
}

/** The other category that already uses this name, if any. */
export function findNameConflict(
  categories: RecipeCategory[],
  name: string,
  ownId?: string,
): RecipeCategory | undefined {
  const normalized = normalizeCategoryName(name);

  return categories.find(
    (category) =>
      category.id !== ownId &&
      normalizeCategoryName(category.name) === normalized,
  );
}

/** By position; categories saved before sorting existed (no position) follow, by name. */
export function sortCategories(categories: RecipeCategory[]): RecipeCategory[] {
  return [...categories].sort((a, b) => {
    const byPosition =
      (a.position ?? Number.MAX_SAFE_INTEGER) -
      (b.position ?? Number.MAX_SAFE_INTEGER);

    return byPosition || a.name.localeCompare(b.name, "de");
  });
}

/** Position for a new category: after all others. */
export function nextPosition(categories: RecipeCategory[]): number {
  const positions = categories
    .map((category) => category.position)
    .filter((position): position is number => position !== undefined);

  return positions.length ? Math.max(...positions) + 1 : categories.length;
}

/**
 * Full new order: the requested ids first (unknown ids and repeats ignored), then every category the request
 * did not mention, in its current order. So a category created meanwhile on another device is not lost.
 */
export function orderedIds(
  categories: RecipeCategory[],
  requestedIds: string[],
): string[] {
  const known = new Set(categories.map((category) => category.id));
  const requested = [...new Set(requestedIds)].filter((id) => known.has(id));
  const mentioned = new Set(requested);
  const rest = sortCategories(categories)
    .map((category) => category.id)
    .filter((id) => !mentioned.has(id));

  return [...requested, ...rest];
}
