import { IsOptional, IsUUID } from "class-validator";

export class CollectionRecipeReferenceDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  recipeId!: string;
}
