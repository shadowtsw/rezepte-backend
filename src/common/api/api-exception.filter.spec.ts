import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { MESSAGE_ID } from "src/messages/message-ids";
import { ApiExceptionFilter } from "./api-exception.filter";
import { apiError } from "./api-response";

function captureResponse(exception: unknown) {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);

  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  new ApiExceptionFilter().catch(exception, host);

  const [status] = response.status.mock.calls[0] as [number];
  const [body] = response.json.mock.calls[0] as [unknown];

  return { status, body };
}

describe("ApiExceptionFilter", () => {
  it("keeps the message ID and details of apiError payloads", () => {
    const exception = new NotFoundException(
      apiError(MESSAGE_ID.recipeNotFound, { params: { id: "recipe-1" } }),
    );

    expect(captureResponse(exception)).toEqual({
      status: 404,
      body: {
        message: "RECIPE_NOT_FOUND",
        error: true,
        data: { params: { id: "recipe-1" } },
      },
    });
  });

  it("sends data null when the payload has no details", () => {
    const exception = new ConflictException(
      apiError(MESSAGE_ID.collectionVersionConflict),
    );

    expect(captureResponse(exception).body).toEqual({
      message: "COLLECTION_VERSION_CONFLICT",
      error: true,
      data: null,
    });
  });

  it("falls back to a generic ID for free-text messages", () => {
    const exception = new BadRequestException("Unexpected token in JSON");

    expect(captureResponse(exception)).toEqual({
      status: 400,
      body: { message: "VALIDATION_FAILED", error: true, data: null },
    });
  });

  it("uses REQUEST_FAILED for other client errors", () => {
    const { status, body } = captureResponse(new ForbiddenException());

    expect(status).toBe(403);
    expect(body).toEqual({
      message: "REQUEST_FAILED",
      error: true,
      data: null,
    });
  });

  it("answers unexpected errors with 500 and no details", () => {
    const logError = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);

    const { status, body } = captureResponse(new Error("database is down"));

    expect(status).toBe(500);
    expect(body).toEqual({
      message: "INTERNAL_ERROR",
      error: true,
      data: null,
    });
    expect(logError.mock.calls).toHaveLength(1);
    logError.mockRestore();
  });
});
