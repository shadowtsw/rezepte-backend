import { IsUUID } from "class-validator";

export class AddRecipeToCollectionDto {
  @IsUUID()
  recipeId!: string;
}
