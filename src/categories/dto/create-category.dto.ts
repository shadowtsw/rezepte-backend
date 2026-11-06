import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

export const MAX_CATEGORY_NAME_LENGTH = 60;

export class CreateCategoryDto {
  @IsOptional()
  // @IsUUID() not necessary
  id?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CATEGORY_NAME_LENGTH)
  name!: string;
}
