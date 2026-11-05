import { Controller, Get, Header, Query } from "@nestjs/common";

import { getCatalog, type Catalog } from "./catalog";

@Controller("messages")
export class MessagesController {
  /**
   * The full text catalog of one language. Express adds an ETag, and `no-cache` makes the browser
   * revalidate it on every load, which costs only a `304` while nothing changed.
   */
  @Get()
  @Header("Cache-Control", "no-cache")
  getCatalog(@Query("lang") language?: string): Catalog {
    return getCatalog(language);
  }
}
