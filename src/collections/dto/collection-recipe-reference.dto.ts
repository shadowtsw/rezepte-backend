import { IsInt, IsOptional, IsUUID, Min } from "class-validator";

export class CollectionRecipeReferenceDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  recipeId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;
}
