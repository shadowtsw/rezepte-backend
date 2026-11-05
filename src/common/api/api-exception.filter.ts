import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

import { isKnownMessageId } from "src/messages/catalog";
import { MESSAGE_ID, type MessageId } from "src/messages/message-ids";
import type { ApiResponse } from "./api-response";

/** Statuses from here on are server errors: logged, and never expose details. */
const FIRST_SERVER_ERROR_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

const FALLBACK_MESSAGE_ID_BY_STATUS: Partial<Record<number, MessageId>> = {
  [HttpStatus.BAD_REQUEST]: MESSAGE_ID.validationFailed,
  [HttpStatus.NOT_FOUND]: MESSAGE_ID.notFound,
  [HttpStatus.CONFLICT]: MESSAGE_ID.conflict,
};

/**
 * Turns every error into `{ message, error: true, data }` with the native HTTP status.
 * Exceptions created with `apiError(...)` keep their message ID and details;
 * anything else (framework errors, unexpected crashes) gets a generic ID by status.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= FIRST_SERVER_ERROR_STATUS) {
      this.logger.error(exception);
    }

    response.status(status).json(this.toApiResponse(exception, status));
  }

  private toApiResponse(exception: unknown, status: number): ApiResponse {
    const payload =
      exception instanceof HttpException ? exception.getResponse() : null;

    if (!hasKnownMessageId(payload)) {
      return { message: fallbackMessageId(status), error: true, data: null };
    }

    const { message, ...details } = payload;
    const hasDetails = Object.keys(details).length > 0;

    return { message, error: true, data: hasDetails ? details : null };
  }
}

function hasKnownMessageId(
  payload: unknown,
): payload is { message: MessageId } & Record<string, unknown> {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  return isKnownMessageId((payload as { message?: unknown }).message);
}

function fallbackMessageId(status: number): MessageId {
  if (status >= FIRST_SERVER_ERROR_STATUS) {
    return MESSAGE_ID.internalError;
  }

  return FALLBACK_MESSAGE_ID_BY_STATUS[status] ?? MESSAGE_ID.requestFailed;
}
