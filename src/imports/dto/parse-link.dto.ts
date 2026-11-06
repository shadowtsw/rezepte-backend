import { IsString, MaxLength, MinLength } from "class-validator";

const MAX_URL_LENGTH = 2000;

/** A recipe page to read; the service checks protocol and host (see safe-fetch.ts). */
export class ParseLinkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_URL_LENGTH)
  url!: string;
}
