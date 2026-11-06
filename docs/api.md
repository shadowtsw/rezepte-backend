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
| POST | `/recipes/:id/publish` | status → `published` |
| POST | `/recipes/:id/archive` | status → `archived` |
| POST | `/recipes/:id/draft` | status → `draft` |

### Ingredient usages

`{ id, ingredientId?, ingredient, amount?, unit? }`. `ingredientId` refers to the ingredient registry;
`ingredient` is a display copy of its name, set by the server on save and updated when the ingredient is renamed.
Clients without `ingredientId` are matched by name (temporary, until all clients send it).

### `GET /recipes/:id/ingredients`

```json
[{ "key": "…|mass", "ingredientId": "…", "name": "rote Linsen", "amount": 1.25, "unit": "kg", "approximate": false,
   "parts": [{ "amount": 250, "unit": "g", "origin": { "stepId": "__unassigned__" } },
             { "amount": 1, "unit": "kg", "origin": { "stepId": "step-1" } }] }]
```

Same ingredient and kind of unit are summed, converting g/kg, ml/l, TL/EL (`src/recipes/ingredient-summary.ts`).
`amount: null` means "nach Bedarf". Collections will use the same function.

## Categories

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/categories` | |
| GET | `/categories/:id` | |
| POST | `/categories` | `id` optional, generated if missing; duplicate → 409 |
| PUT | `/categories/:id` | |
| DELETE | `/categories/:id` | also removes the category from all recipes (`$pull`) |
| GET | `/categories/:id/recipes` | returns only `id` and `title` |

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
