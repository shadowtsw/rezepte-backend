/**
 * All message IDs the API can send in `ApiResponse.message` or in validation `fields`.
 * Every ID needs a text in each catalog (enforced by the `Catalog` type).
 */
export const MESSAGE_ID = {
  // Common (shared by all projects, see guidelines general/api-design.md)
  ok: "OK",
  created: "CREATED",
  validationFailed: "VALIDATION_FAILED",
  notFound: "NOT_FOUND",
  conflict: "CONFLICT",
  requestFailed: "REQUEST_FAILED",
  internalError: "INTERNAL_ERROR",

  // Validation constraints, used in `data.fields[].message`
  invalidValue: "INVALID_VALUE",
  equals: "EQUALS",
  isArray: "IS_ARRAY",
  isInt: "IS_INT",
  isNotEmpty: "IS_NOT_EMPTY",
  isNumber: "IS_NUMBER",
  isString: "IS_STRING",
  isUuid: "IS_UUID",
  min: "MIN",
  minLength: "MIN_LENGTH",
  nestedValidation: "NESTED_VALIDATION",

  // Recipes
  recipeNotFound: "RECIPE_NOT_FOUND",
  recipeAlreadyExists: "RECIPE_ALREADY_EXISTS",
  recipeCreated: "RECIPE_CREATED",
  recipeUpdated: "RECIPE_UPDATED",
  recipeDeleted: "RECIPE_DELETED",
  recipePublished: "RECIPE_PUBLISHED",
  recipeArchived: "RECIPE_ARCHIVED",
  recipeSetToDraft: "RECIPE_SET_TO_DRAFT",

  // Categories
  categoryNotFound: "CATEGORY_NOT_FOUND",
  categoryAlreadyExists: "CATEGORY_ALREADY_EXISTS",
  categoryCreated: "CATEGORY_CREATED",
  categoryUpdated: "CATEGORY_UPDATED",
  categoryDeleted: "CATEGORY_DELETED",

  // Ingredients
  ingredientNotFound: "INGREDIENT_NOT_FOUND",
  ingredientAlreadyExists: "INGREDIENT_ALREADY_EXISTS",
  ingredientCreated: "INGREDIENT_CREATED",
  ingredientUpdated: "INGREDIENT_UPDATED",
  ingredientDeleted: "INGREDIENT_DELETED",

  // Collections
  collectionNotFound: "COLLECTION_NOT_FOUND",
  collectionGroupNotFound: "COLLECTION_GROUP_NOT_FOUND",
  collectionVersionConflict: "COLLECTION_VERSION_CONFLICT",
  collectionRecipeNotPublished: "COLLECTION_RECIPE_NOT_PUBLISHED",
  collectionItemIdsNotUnique: "COLLECTION_ITEM_IDS_NOT_UNIQUE",
  collectionItemTypeChanged: "COLLECTION_ITEM_TYPE_CHANGED",
  collectionItemRecipeChanged: "COLLECTION_ITEM_RECIPE_CHANGED",
  collectionCreated: "COLLECTION_CREATED",
  collectionRenamed: "COLLECTION_RENAMED",
  collectionDeleted: "COLLECTION_DELETED",
  collectionRecipeAdded: "COLLECTION_RECIPE_ADDED",
  collectionItemsUpdated: "COLLECTION_ITEMS_UPDATED",
} as const;

export type MessageId = (typeof MESSAGE_ID)[keyof typeof MESSAGE_ID];
