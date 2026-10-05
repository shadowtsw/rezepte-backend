import { Transform, Type } from "class-transformer";
import {
  Equals,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from "class-validator";

import { CollectionRecipeReferenceDto } from "./collection-recipe-reference.dto";

export class CollectionGroupItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @Equals("group")
  type!: "group";

  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectionRecipeReferenceDto)
  recipes!: CollectionRecipeReferenceDto[];
}
