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
| `IngredientsModule` | `src/ingredients` | `ingredients` | ingredient registry with `lastUnit`; recipes link usages via `resolveIngredient` on save |
| `ImportsModule` | `src/imports` | – | recipe import: parsers and `POST /imports/parse` (preview only) |
| `MessagesModule` | `src/messages` | – | message IDs, text catalog per language, `GET /messages` |
| `CollectionsModule` | `src/collections` | `recipe_collections` | ordered items (recipe or group); uses `RecipesService` to check status |

Database name is fixed in `src/database/database.constants.ts` (`rezepteapp`).

## Data model (short)

See `src/**/*.model.ts` for the full types.

- **Recipe**: `id`, `title`, `servings`, `tags`, `categories: { id }[]`, `sections`, `notes?`, `status`, `version`
  - **Section**: `id`, `title`, `steps`
  - **Step**: `id`, `title`, `instruction`, `duration?`, `ingredients`
  - **IngredientUsage**: `id`, `ingredientId`, `ingredient` (name copy), `amount?`, `unit?` (fixed list in `recipes/units.ts`). The `id` identifies this usage in the step
    (same ingredient can appear several times); it is not the ID from the `ingredients` registry.
- **Category**: `id`, `name`
- **Collection**: `id`, `name`, `version`, `items`
  - item `{ id, type: "recipe", recipeId }` or `{ id, type: "group", name, recipes: { id, recipeId }[] }`

## Events

Modules that must react to changes elsewhere listen to events (`@nestjs/event-emitter`) instead of importing each other.

| Event | Emitted by | Listeners |
| --- | --- | --- |
| `recipe.deleted` (`RecipeDeletedEvent`) | `RecipesService.deleteRecipe` | `CollectionsService.handleRecipeDeleted` removes references |
| `ingredient.renamed` (`IngredientRenamedEvent`) | `IngredientsService.updateIngredient` | `RecipesService.handleIngredientRenamed` updates name copies |

Emit with `emitAsync` and listen with `suppressErrors: false`, so the request waits for listeners and sees their errors.

## Cross-cutting

- **Message-response envelope** (`common/api/`): `ResponseEnvelopeInterceptor` wraps results, `ApiExceptionFilter`
  wraps errors, both registered as `APP_INTERCEPTOR` / `APP_FILTER` in `AppModule`.
  - Controllers set success IDs with `@ResponseMessage(MESSAGE_ID.…)`; otherwise `OK` / `CREATED`.
  - Services return plain domain objects and throw Nest exceptions with `apiError(MESSAGE_ID.…, { params })`.
  - Validation errors become `VALIDATION_FAILED` with `data.fields` (`common/pipes/validation-errors.ts`).
  - New ID: add it to `message-ids.ts` and a text to every catalog (the `Catalog` type enforces it).

- `common/interceptors/logging.interceptor.ts`: logs method, URL, status, duration for every request.
- `common/errors/duplicate-key.error.ts`: repositories map Mongo `E11000` to this; services turn it into `409`.
- Repositories never return Mongo's `_id`: reads use the `WITHOUT_MONGO_ID` projection, inserts use a copy.
- Global `ValidationPipe` (`common/pipes/validation-pipe.options.ts`) with `transform` and `whitelist`:
  properties not declared in the DTO are stripped silently (e.g. `status`, `version` on PATCH).

## Known gaps

- `AppController` still has experimental test injections (`TEST_SOMETHING*`).
