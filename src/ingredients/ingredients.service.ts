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
import { UpdateIngredientDto } from "./dto/update-ingredient.dto";
import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID } from "src/messages/message-ids";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  INGREDIENT_RENAMED_EVENT,
  IngredientRenamedEvent,
} from "./events/ingredient-renamed.event";

@Injectable()
export class IngredientsService {
  constructor(
    @Inject(INGREDIENT_REPOSITORY)
    private readonly ingredientRepository: IngredientRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Remembers the unit last used with an ingredient, so the editor can preselect it. */
  async rememberLastUnit(id: string, unit: string): Promise<void> {
    await this.ingredientRepository.setLastUnit(id, unit);
  }

  async getAllIngredients(search?: string): Promise<Ingredient[]> {
    return this.ingredientRepository.getAllIngredients(search);
  }

  async getIngredientById(id: string): Promise<Ingredient> {
    const ingredient = await this.ingredientRepository.findById(id);

    if (!ingredient) {
      throw ingredientNotFound(id);
    }

    return ingredient;
  }

  async createIngredient(ingredient: CreateIngredientDto): Promise<Ingredient> {
    const newIngredient: Ingredient = {
      id: randomUUID(),
      name: ingredient.name,
      normalizedName: normalizeIngredientName(ingredient.name),
    };

    try {
      await this.ingredientRepository.createIngredient(newIngredient);
    } catch (error) {
      if (error instanceof DuplicateKeyError) {
        throw ingredientAlreadyExists(ingredient.name);
      }

      throw error;
    }

    return newIngredient;
  }

  async updateIngredient(
    id: string,
    dto: UpdateIngredientDto,
  ): Promise<Ingredient> {
    const normalizedName = normalizeIngredientName(dto.name);

    try {
      const updatedIngredient =
        await this.ingredientRepository.updateIngredient(
          id,
          dto.name,
          normalizedName,
        );

      if (!updatedIngredient) {
        throw ingredientNotFound(id);
      }

      await this.eventEmitter.emitAsync(
        INGREDIENT_RENAMED_EVENT,
        new IngredientRenamedEvent(id, updatedIngredient.name),
      );

      return updatedIngredient;
    } catch (error) {
      if (error instanceof DuplicateKeyError) {
        throw ingredientAlreadyExists(dto.name);
      }

      throw error;
    }
  }

  async deleteIngredient(id: string): Promise<void> {
    const deleted = await this.ingredientRepository.deleteIngredient(id);

    if (!deleted) {
      throw ingredientNotFound(id);
    }
  }
}

function ingredientNotFound(id: string): NotFoundException {
  return new NotFoundException(
    apiError(MESSAGE_ID.ingredientNotFound, { params: { id } }),
  );
}

function ingredientAlreadyExists(name: string): ConflictException {
  return new ConflictException(
    apiError(MESSAGE_ID.ingredientAlreadyExists, { params: { name } }),
  );
}
