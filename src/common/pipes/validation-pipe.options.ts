import type { ValidationPipeOptions } from "@nestjs/common";

import { createValidationException } from "./validation-errors";

/**
 * Options for the global ValidationPipe.
 * `whitelist` strips every property that is not declared in the DTO,
 * so clients cannot write fields like `status` through PATCH.
 * Errors become `VALIDATION_FAILED` with `data.fields` (see message-response concept).
 */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  exceptionFactory: createValidationException,
};
