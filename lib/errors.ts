export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationAppError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, 400);
  }
}

export class AuthenticationAppError extends AppError {
  constructor(message = "غير مصرح لك بالوصول.") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class RateLimitAppError extends AppError {
  constructor(message = "تم تجاوز عدد المحاولات المسموح به مؤقتًا.") {
    super("RATE_LIMITED", message, 429);
  }
}
