export class ValidationError extends Error {
  readonly status = 400;
}

export class ConflictError extends Error {
  readonly status = 409;
}

export class NotFoundError extends Error {
  readonly status = 404;
}
