import { ArrayMaxSize, IsArray, IsString } from "class-validator";

const MAX_CATEGORIES = 500;

export class UpdateCategoryOrderDto {
  /** Category ids in the new order; categories not listed keep their order after these. */
  @IsArray()
  @ArrayMaxSize(MAX_CATEGORIES)
  @IsString({ each: true })
  ids!: string[];
}
