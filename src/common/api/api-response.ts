import type { MessageId } from "src/messages/message-ids";

/** Envelope of every response (see guidelines: general/api-design.md). */
export interface ApiResponse<T = unknown> {
  message: MessageId;
  error: boolean;
  data: T | null;
}

/**
 * Payload for exceptions that carry a message ID, e.g.
 * `new NotFoundException(apiError(MESSAGE_ID.recipeNotFound, { params: { id } }))`.
 * Everything except `message` ends up in `ApiResponse.data`.
 */
export interface ApiErrorPayload {
  message: MessageId;
  params?: Record<string, string | number>;
  fields?: { field: string; message: MessageId }[];
}

export function apiError(
  message: MessageId,
  details: Omit<ApiErrorPayload, "message"> = {},
): ApiErrorPayload {
  return { message, ...details };
}
