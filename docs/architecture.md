# Architecture

## Layers

```
Controller → Service → Repository interface → Mongo repository → MongoDB
```

Each feature module wires its repository via an injection token, e.g. `RECIPE_REPOSITORY` → `MongoRecipesRepository`.
Services only know the interface in `repositories/<name>.repository.ts`.

## Modules

| Module | Folder | Collection | Notes |
| --- | --- | --- | --- |
| `DatabaseModule` | `src/database` | – | provides the connected `MongoClient` as `MONGO_CLIENT` (reads `MONGO_URI`) |
| `RecipesModule` | `src/recipes` | `recipes` | recipes with sections → steps → ingredient usages |
| `CategoriesModule` | `src/categories` | `categories` | uses `RecipesService` to remove category references on delete |
| `IngredientsModule` | `src/ingredients` | `ingredients` | ingredient registry; filled automatically via `findOrCreateIngredient` when recipes are created/updated |
| `CollectionsModule` | `src/collections` | `recipe_collections` | ordered items (recipe or group); uses `RecipesService` to check status |

Database name is fixed in `src/database/database.constants.ts` (`rezepteapp`).

## Data model (short)

See `src/**/*.model.ts` for the full types.

- **Recipe**: `id`, `title`, `servings`, `tags`, `categories: { id }[]`, `sections`, `notes?`, `status`, `version`
  - **Section**: `id`, `title`, `steps`
  - **Step**: `id`, `title`, `instruction`, `duration?`, `ingredients`
  - **IngredientUsage**: `id`, `ingredient` (name), `amount?`, `unit?`. The `id` identifies this usage in the step
    (same ingredient can appear several times); it is not the ID from the `ingredients` registry.
- **Category**: `id`, `name`
- **Collection**: `id`, `name`, `version`, `items`
  - item `{ id, type: "recipe", recipeId }` or `{ id, type: "group", name, recipes: { id, recipeId }[] }`

## Cross-cutting

- `common/interceptors/logging.interceptor.ts`: logs method, URL, status, duration for every request.
- `common/errors/duplicate-key.error.ts`: repositories map Mongo `E11000` to this; services turn it into `409`.
- Global `ValidationPipe` (`common/pipes/validation-pipe.options.ts`) with `transform` and `whitelist`:
  properties not declared in the DTO are stripped silently (e.g. `status`, `version` on PATCH).

## Known gaps

- Deleting a recipe does not remove its references from collections (`removeRecipeReferences` exists but is never called).
- Responses include Mongo's internal `_id` field.
- `AppController` still has experimental test injections (`TEST_SOMETHING*`).
