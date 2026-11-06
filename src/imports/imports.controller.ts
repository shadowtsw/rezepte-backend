import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";

import { ParseImportDto } from "./dto/parse-import.dto";
import { ParseLinkDto } from "./dto/parse-link.dto";
import type { ImportPreview } from "./import-preview";
import { ImportsService } from "./imports.service";

@Controller("imports")
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  /** Returns the preview of an import; nothing is saved, hence 200 instead of 201. */
  @Post("parse")
  @HttpCode(HttpStatus.OK)
  parse(@Body() dto: ParseImportDto): Promise<ImportPreview> {
    return this.importsService.parseText(dto.text);
  }

  /** Same preview from a recipe page (schema.org JSON-LD); only public addresses are loaded. */
  @Post("link")
  @HttpCode(HttpStatus.OK)
  parseLink(@Body() dto: ParseLinkDto): Promise<ImportPreview> {
    return this.importsService.parseLink(dto.url);
  }
}
