import { IsInt, IsString } from "class-validator";

export class CreateRecipeDto {
  @IsString()
  title!: string;

  @IsInt()
  servings!: number;
}
