import type { ValidationError } from "class-validator";

import { createValidationException } from "./validation-errors";

describe("createValidationException", () => {
  it("creates VALIDATION_FAILED with nested field paths and constraint IDs", () => {
    const errors: ValidationError[] = [
      {
        property: "title",
        constraints: { isString: "title must be a string" },
      },
      {
        property: "sections",
        children: [
          {
            property: "0",
            children: [
              {
                property: "title",
                constraints: { minLength: "too short", isNotEmpty: "empty" },
              },
            ],
          },
        ],
      },
    ];

    const response = createValidationException(errors).getResponse();

    expect(response).toEqual({
      message: "VALIDATION_FAILED",
      fields: [
        { field: "title", message: "IS_STRING" },
        { field: "sections.0.title", message: "MIN_LENGTH" },
        { field: "sections.0.title", message: "IS_NOT_EMPTY" },
      ],
    });
  });

  it("maps unknown constraints to INVALID_VALUE", () => {
    const errors: ValidationError[] = [
      { property: "email", constraints: { isEmail: "invalid" } },
    ];

    const response = createValidationException(errors).getResponse();

    expect(response).toMatchObject({
      fields: [{ field: "email", message: "INVALID_VALUE" }],
    });
  });
});
