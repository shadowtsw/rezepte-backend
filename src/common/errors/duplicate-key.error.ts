export class DuplicateKeyError extends Error {
  constructor(message = "Duplicate key") {
    super(message);
    this.name = "DuplicateKeyError";
  }
}
