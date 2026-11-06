# API

In production the reverse proxy serves the API under `/api/...`. Locally the Vite dev proxy strips `/api` and forwards to `localhost:3000`.

## Response format

Every response follows the message-response concept (guidelines `general/api-design.md`):

```json
{ "message": "RECIPE_CREATED", "error": false, "data": { "id": "…" } }
{ "message": "RECIPE_NOT_FOUND", "error": true, "data": { "params": { "id": "…" } } }
{ "message": "VALIDATION_FAILED", "error": true, "data": { "fields": [{ "field": "title", "message": "IS_STRING" }] } }
```

- HTTP status codes are native. Action endpoints (`/publish`, `/archive`, `/draft`, `POST /collections/:id/recipes`)
  answer `200`, creates `201`, deletes `200` with `data: null`.
- The tables below describe `data`.

## Messages

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/messages?lang=de` | `data` = `{ [messageId]: text }`; unknown languages fall back to `de`; `ETag` + `no-cache` |

IDs live in `src/messages/message-ids.ts`, texts in `src/messages/catalog.de.ts`.

## Recipes

Unknown properties in request bodies are stripped. `id`, `status` and `version` cannot be set via PATCH/PUT.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/recipes` | query: `categoryId`, `uncategorized=true`, `status` |
| GET | `/recipes/:id` | 404 if missing |
| GET | `/recipes/:id/ingredients` | summed ingredients (see below) |
| POST | `/recipes` | creates as `draft`, `version: 1` |
| PATCH | `/recipes/:id` | partial update, never changes `status` |
| PUT | `/recipes/:id` | identical to PATCH by design (partial update) |
| DELETE | `/recipes/:id` | |
| POST | `/recipes/:id/publish` | status → `published`; `409 RECIPE_OPEN_TODOS` `{ count }` while to-dos are open |
| POST | `/recipes/:id/archive` | status → `archived` |
| POST | `/recipes/:id/draft` | status → `draft` |

### To-dos

`todos?: { id, text, done }[]` (max 50, text max 200): the list "Was fehlt noch?" of a recipe. Saved with the recipe
(PATCH/PUT). Unchecked to-dos block `POST /recipes/:id/publish`; published recipes may still have to-dos.

### Ingredient usages

`{ id, ingredientId, ingredient, amount?, unit? }`. `ingredientId` (required) refers to the ingredient registry;
`ingredient` is a display copy of its name, set by the server on save and updated when the ingredient is renamed.
`unit` must be one of `recipes/units.ts` or empty (no unit). Unknown ingredient ids give `INGREDIENT_NOT_FOUND`.

### `GET /recipes/:id/ingredients`

```json
[{ "key": "…|mass", "ingredientId": "…", "name": "rote Linsen", "amount": 1.25, "unit": "kg", "approximate": false,
   "parts": [{ "amount": 250, "unit": "g", "origin": { "stepId": "__unassigned__" } },
             { "amount": 1, "unit": "kg", "origin": { "stepId": "step-1" } }] }]
```

Same ingredient and kind of unit are summed, converting g/kg, ml/l, TL/EL (`src/recipes/ingredient-summary.ts`).
`amount: null` means "nach Bedarf". `GET /collections/:id/ingredients` uses the same function.

## Imports

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/imports/parse` | body `{ text }` (max. 20 000 characters); returns a preview, **saves nothing** (`200`) |

Preview: `{ title, servings, source, lines }`. Each line: `{ original, skipped, amount, unit, name, note, issues, match }`.
- `skipped`: headings like "Für den Teig:".
- `issues`: why the line should be checked, as message IDs with params (`IMPORT_RANGE {from,to}`,
  `IMPORT_UNKNOWN_UNIT {unit}`, `IMPORT_MARKED_UNSURE`, `IMPORT_SEVERAL_INGREDIENTS`, `IMPORT_NAME_MISSING`,
  `IMPORT_SIMILAR_INGREDIENT {name}`, `IMPORT_NEW_INGREDIENT`).
- `match`: `{ kind: "exact" | "similar", ingredientId, name }` or `{ kind: "new" }`. Similar entries are only suggested.

Parser: `src/imports/parse-ingredient-line.ts` and `parse-recipe-text.ts` (standard format with `Titel:`, `Portionen:`,
`Quelle:`, `Zutaten:`, and free notes). Unit synonyms in `src/imports/unit-synonyms.ts`.

## Categories

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/categories` | sorted by `position`, each with `recipeCount` (all statuses) |
| GET | `/categories/:id` | |
| POST | `/categories` | `id` optional, generated if missing; goes to the end; duplicate id → 409 |
| PUT | `/categories/order` | body `{ ids }` in the new order; unknown ids are ignored, missing ones follow in their old order; returns the list |
| PUT | `/categories/:id` | rename |
| DELETE | `/categories/:id` | also removes the category from all recipes (`$pull`) |
| GET | `/categories/:id/recipes` | returns only `id` and `title` |

Names are trimmed, 1–60 characters and unique ignoring case: `409 CATEGORY_NAME_TAKEN { name }` names the existing
category. Categories saved before sorting existed have no `position`; they sort after the others by name, and the
first create saves their current order.

## Ingredients

| Method | Path |
| --- | --- |
| GET | `/ingredients` |
| GET | `/ingredients/:id` |
| POST | `/ingredients` |

## Collections

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/collections` | |
| GET | `/collections/:id` | |
| POST | `/collections` | |
| PATCH | `/collections/:id` | rename |
| DELETE | `/collections/:id` | |
| POST | `/collections/:id/recipes` | body `{ recipeId }`; only published recipes; appends a new item |
| PUT | `/collections/:id/items` | body `{ version, items }`; replaces the whole structure |
| GET | `/collections/:id/ingredients` | summed ingredients, scaled to each entry's servings; optional `?groupId=` (unknown group: `COLLECTION_GROUP_NOT_FOUND`); parts have `origin: { recipeId, servings }` |

### `PUT /collections/:id/items`

```json
{
  "version": 3,
  "items": [
    { "id": "…", "type": "recipe", "recipeId": "…", "servings": 4 },
    {
      "id": "…",
      "type": "group",
      "name": "Samstagsmenü",
      "recipes": [{ "id": "…", "recipeId": "…" }]
    }
  ]
}
```

- `id` may be omitted for new items; the server generates it.
- `409` when `version` is outdated, item IDs repeat, an existing item changes type or `recipeId`, or a new recipe is not published.
- Duplicate `recipeId`s are allowed.
- `servings` (integer ≥ 1) is optional per entry; when missing, the recipe's own servings apply. It is not stored then.
- On success `version` increments and the updated collection is returned.
