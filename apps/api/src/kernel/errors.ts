export type HttpStatus =
  | 400
  | 401
  | 403
  | 404
  | 409
  | 410
  | 422
  | 429
  | 500;

export class DomainError extends Error {
  readonly code: string;
  readonly status: HttpStatus;

  constructor(code: string, message: string, status: HttpStatus = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
  }
}

export class NotFoundError extends DomainError {
  constructor(what: string) {
    super(`${what}.not_found`, `${what} not found`, 404);
  }
}

export class ForbiddenError extends DomainError {
  constructor(reason = "forbidden") {
    super(reason, "forbidden", 403);
  }
}

export class UnauthorizedError extends DomainError {
  constructor() {
    super("unauthorized", "unauthorized", 401);
  }
}

export class ConflictError extends DomainError {
  constructor(code: string, message: string) {
    super(code, message, 409);
  }
}

export class ValidationError extends DomainError {
  constructor(code: string, message: string) {
    super(code, message, 422);
  }
}
