# API

In production the reverse proxy serves the API under `/api/...`. Locally the Vite dev proxy strips `/api` and forwards to `localhost:3000`.

## Recipes

Unknown properties in request bodies are stripped. `id`, `status` and `version` cannot be set via PATCH/PUT.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/recipes` | query: `categoryId`, `uncategorized=true`, `status` |
| GET | `/recipes/:id` | 404 if missing |
| POST | `/recipes` | creates as `draft`, `version: 1` |
| PATCH | `/recipes/:id` | partial update, never changes `status`; returns `{ message, updatedRecipe }` |
| PUT | `/recipes/:id` | identical to PATCH by design (partial update) |
| DELETE | `/recipes/:id` | |
| POST | `/recipes/:id/publish` | status → `published` |
| POST | `/recipes/:id/archive` | status → `archived` |
| POST | `/recipes/:id/draft` | status → `draft` |

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
    { "id": "…", "type": "recipe", "recipeId": "…" },
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
- On success `version` increments and the updated collection is returned.
