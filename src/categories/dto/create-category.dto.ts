import { IsOptional, IsString } from "class-validator";

export class CreateCategoryDto {
  @IsOptional()
  // @IsUUID() not necessary
  id?: string;

  @IsString()
  name!: string;
}
