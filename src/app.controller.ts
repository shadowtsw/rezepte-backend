import { Controller, Get, Inject } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    //* test custom injections
    @Inject("TEST_SOMETHING") private readonly test: string,
    @Inject("TEST_SOMETHING_NEW") private readonly testNew: string,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
