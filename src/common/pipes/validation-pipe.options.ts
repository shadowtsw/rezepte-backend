import type { ValidationPipeOptions } from "@nestjs/common";

/**
 * Options for the global ValidationPipe.
 * `whitelist` strips every property that is not declared in the DTO,
 * so clients cannot write fields like `status` through PATCH.
 */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
};
