import { Equals, IsOptional, IsUUID } from "class-validator";

export class CollectionRecipeItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @Equals("recipe")
  type!: "recipe";

  @IsUUID()
  recipeId!: string;
}
