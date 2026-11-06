import { IsString, MaxLength, MinLength } from "class-validator";

/** A pasted recipe; long enough for any recipe, short enough to stay cheap. */
const MAX_TEXT_LENGTH = 20000;

export class ParseImportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_TEXT_LENGTH)
  text!: string;
}
