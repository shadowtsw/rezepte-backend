import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class IngredientUsageDto {
  @IsString()
  id!: string;

  // Optional for now: clients without it are matched by name (D1b, step 1).
  @IsOptional()
  @IsUUID()
  ingredientId?: string;

  @IsString()
  ingredient!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

class RecipeStepDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsString()
  instruction!: string;

  @IsOptional()
  @IsInt()
  duration?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientUsageDto)
  ingredients!: IngredientUsageDto[];
}

class RecipeSectionDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeStepDto)
  steps!: RecipeStepDto[];
}

class RecipeCategoryReferenceDto {
  @IsString()
  id!: string;
}

export class CreateRecipeDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  title!: string;

  @IsInt()
  servings!: number;

  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeCategoryReferenceDto)
  categories!: RecipeCategoryReferenceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeSectionDto)
  sections!: RecipeSectionDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
