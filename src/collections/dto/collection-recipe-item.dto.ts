import { Equals, IsInt, IsOptional, IsUUID, Min } from "class-validator";

export class CollectionRecipeItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @Equals("recipe")
  type!: "recipe";

  @IsUUID()
  recipeId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  servings?: number;
}
