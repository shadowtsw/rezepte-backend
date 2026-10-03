import type {
  CollectionRecipeItem,
  RecipeCollection,
} from "../collection.model";

export interface CollectionRepository {
  getAllCollections(): Promise<RecipeCollection[]>;

  findById(id: string): Promise<RecipeCollection | undefined>;

  createCollection(collection: RecipeCollection): Promise<RecipeCollection>;

  updateCollectionName(
    id: string,
    name: string,
  ): Promise<RecipeCollection | undefined>;

  deleteCollection(id: string): Promise<boolean>;

  addRecipe(
    collectionId: string,
    item: CollectionRecipeItem,
  ): Promise<RecipeCollection | undefined>;
}
