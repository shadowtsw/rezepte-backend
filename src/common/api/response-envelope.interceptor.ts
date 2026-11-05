import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
  RequestMethod,
} from "@nestjs/common";
import { HTTP_CODE_METADATA, METHOD_METADATA } from "@nestjs/common/constants";
import { Reflector } from "@nestjs/core";
import { map, type Observable } from "rxjs";

import { MESSAGE_ID, type MessageId } from "src/messages/message-ids";
import type { ApiResponse } from "./api-response";
import { RESPONSE_MESSAGE_KEY } from "./response-message.decorator";

const CREATED_STATUS: number = HttpStatus.CREATED;

/** Wraps every successful handler result into `{ message, error: false, data }`. */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse> {
    const messageId = this.resolveMessageId(context);

    return next.handle().pipe(
      map((data: unknown) => ({
        message: messageId,
        error: false,
        data: data ?? null,
      })),
    );
  }

  private resolveMessageId(context: ExecutionContext): MessageId {
    const handler = context.getHandler();
    const explicitMessageId = this.reflector.get<MessageId | undefined>(
      RESPONSE_MESSAGE_KEY,
      handler,
    );

    if (explicitMessageId) {
      return explicitMessageId;
    }

    return this.isCreatedStatus(handler) ? MESSAGE_ID.created : MESSAGE_ID.ok;
  }

  // Nest answers POST with 201 unless @HttpCode says otherwise.
  private isCreatedStatus(
    handler: ReturnType<ExecutionContext["getHandler"]>,
  ): boolean {
    const explicitStatus = this.reflector.get<number | undefined>(
      HTTP_CODE_METADATA,
      handler,
    );
    const method = this.reflector.get<RequestMethod>(METHOD_METADATA, handler);
    const isPost = method === RequestMethod.POST;

    if (explicitStatus === undefined) {
      return isPost;
    }

    return explicitStatus === CREATED_STATUS;
  }
}
