import { Injectable, Inject } from "@nestjs/common";
import { Collection, MongoServerError } from "mongodb";
import { RecipeCategory } from "../category.model";
import { CategoryRepository } from "./category.repository";
import { CATEGORY_COLLECTION } from "../category.constants";
import { DuplicateKeyError } from "src/common/errors/duplicate-key.error";

@Injectable()
export class MongoCategoriesRepository implements CategoryRepository {
  constructor(
    @Inject(CATEGORY_COLLECTION)
    private readonly collection: Collection<RecipeCategory>,
  ) {}

  async getAllCategories(): Promise<RecipeCategory[]> {
    return this.collection.find({}).toArray();
  }

  async findById(id: string): Promise<RecipeCategory | undefined> {
    const category = await this.collection.findOne({ id });

    return category ?? undefined;
  }

  async createCategory(category: RecipeCategory): Promise<RecipeCategory> {
    try {
      await this.collection.insertOne(category);

      return category;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new DuplicateKeyError(
          `Category with ID ${category.id} already exists`,
        );
      }

      throw error;
    }
  }

  async updateCategory(
    id: string,
    category: RecipeCategory,
  ): Promise<RecipeCategory | undefined> {
    const updatedDocument = await this.collection.findOneAndUpdate(
      { id },
      { $set: category },
      { returnDocument: "after" },
    );

    return updatedDocument ?? undefined;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ id });

    return result.deletedCount === 1;
  }
}
