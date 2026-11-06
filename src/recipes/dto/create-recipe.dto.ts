import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";

import { UNITS } from "../units";

class IngredientUsageDto {
  @IsString()
  id!: string;

  @IsUUID()
  ingredientId!: string;

  @IsString()
  ingredient!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  // An empty unit means "no unit" (e.g. "2 Eier").
  @Transform(({ value }: { value: unknown }) =>
    value === "" ? undefined : value,
  )
  @IsOptional()
  @IsIn(UNITS)
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
