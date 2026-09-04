import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { Ingredient } from "./ingredient.model";
import { CreateIngredientDto } from "./dto/create-ingredient.dto";
import type { IngredientRepository } from "./repositories/ingredient.repository";
import { INGREDIENT_REPOSITORY } from "./ingredient.constants";
import { DuplicateKeyError } from "src/common/errors/duplicate-key.error";
import { normalizeIngredientName } from "./ingredient.utils";

@Injectable()
export class IngredientsService {
  constructor(
    @Inject(INGREDIENT_REPOSITORY)
    private readonly ingredientRepository: IngredientRepository,
  ) {}

  async getAllIngredients(search?: string): Promise<Ingredient[]> {
    return this.ingredientRepository.getAllIngredients(search);
  }

  async getIngredientById(id: string): Promise<Ingredient> {
    const ingredient = await this.ingredientRepository.findById(id);

    if (!ingredient) {
      throw new NotFoundException(`Ingredient with ID ${id} not found`);
    }

    return ingredient;
  }

  async createIngredient(
    ingredient: CreateIngredientDto,
  ): Promise<{ message: string; newIngredient: Ingredient }> {
    const newIngredient: Ingredient = {
      id: randomUUID(),
      name: ingredient.name,
      normalizedName: normalizeIngredientName(ingredient.name),
    };

    try {
      await this.ingredientRepository.createIngredient(newIngredient);
    } catch (error) {
      if (error instanceof DuplicateKeyError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }

    return {
      message: "Ingredient created successfully",
      newIngredient,
    };
  }

  async findOrCreateIngredient(name: string): Promise<Ingredient> {
    const normalizedName = normalizeIngredientName(name);

    const existingIngredient =
      await this.ingredientRepository.findByNormalizedName(normalizedName);

    if (existingIngredient) {
      return existingIngredient;
    }

    const newIngredient: Ingredient = {
      id: randomUUID(),
      name: name.trim(),
      normalizedName,
    };

    try {
      return await this.ingredientRepository.createIngredient(newIngredient);
    } catch (error) {
      if (error instanceof DuplicateKeyError) {
        const existingIngredient =
          await this.ingredientRepository.findByNormalizedName(normalizedName);

        if (existingIngredient) {
          return existingIngredient;
        }
      }

      throw error;
    }
  }
}
