import { HttpCode, Post, Get, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { lastValueFrom, of } from "rxjs";

import { MESSAGE_ID } from "src/messages/message-ids";
import { ResponseEnvelopeInterceptor } from "./response-envelope.interceptor";
import { ResponseMessage } from "./response-message.decorator";

class ExampleController {
  @Get()
  read() {}

  @Post()
  create() {}

  @Post("action")
  @HttpCode(200)
  action() {}

  @Post("explicit")
  @ResponseMessage(MESSAGE_ID.recipeCreated)
  explicit() {}
}

async function envelope(handlerName: keyof ExampleController, data: unknown) {
  const interceptor = new ResponseEnvelopeInterceptor(new Reflector());
  // Read the method without detaching it, so its route metadata stays attached.
  const handler = Object.getOwnPropertyDescriptor(
    ExampleController.prototype,
    handlerName,
  )?.value as () => void;
  const context = { getHandler: () => handler } as unknown as ExecutionContext;

  return lastValueFrom(
    interceptor.intercept(context, { handle: () => of(data) }),
  );
}

describe("ResponseEnvelopeInterceptor", () => {
  it("wraps data with OK for reads", async () => {
    await expect(envelope("read", [1])).resolves.toEqual({
      message: "OK",
      error: false,
      data: [1],
    });
  });

  it("uses CREATED for POST endpoints answering 201", async () => {
    await expect(envelope("create", {})).resolves.toMatchObject({
      message: "CREATED",
    });
  });

  it("uses OK for POST endpoints with @HttpCode(200)", async () => {
    await expect(envelope("action", {})).resolves.toMatchObject({
      message: "OK",
    });
  });

  it("uses the ID from @ResponseMessage", async () => {
    await expect(envelope("explicit", {})).resolves.toMatchObject({
      message: "RECIPE_CREATED",
    });
  });

  it("turns undefined results into data null", async () => {
    await expect(envelope("read", undefined)).resolves.toMatchObject({
      data: null,
    });
  });
});
