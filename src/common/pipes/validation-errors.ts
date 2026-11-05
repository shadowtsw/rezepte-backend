import { BadRequestException } from "@nestjs/common";
import type { ValidationError } from "class-validator";

import { apiError, type ApiErrorPayload } from "src/common/api/api-response";
import { isKnownMessageId } from "src/messages/catalog";
import { MESSAGE_ID, type MessageId } from "src/messages/message-ids";

type FieldError = NonNullable<ApiErrorPayload["fields"]>[number];

/** Builds a `VALIDATION_FAILED` error with one entry per failed constraint. */
export function createValidationException(
  errors: ValidationError[],
): BadRequestException {
  const fields = errors.flatMap((error) => collectFieldErrors(error, ""));

  return new BadRequestException(
    apiError(MESSAGE_ID.validationFailed, { fields }),
  );
}

function collectFieldErrors(
  error: ValidationError,
  parentPath: string,
): FieldError[] {
  const field = parentPath ? `${parentPath}.${error.property}` : error.property;
  const constraintNames = Object.keys(error.constraints ?? {});
  const ownErrors = constraintNames.map((constraintName) => ({
    field,
    message: toMessageId(constraintName),
  }));
  const childErrors = (error.children ?? []).flatMap((child) =>
    collectFieldErrors(child, field),
  );

  return [...ownErrors, ...childErrors];
}

/** class-validator names constraints in camelCase (`isString`); message IDs are UPPER_SNAKE_CASE. */
function toMessageId(constraintName: string): MessageId {
  const candidate = constraintName
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toUpperCase();

  return isKnownMessageId(candidate) ? candidate : MESSAGE_ID.invalidValue;
}
