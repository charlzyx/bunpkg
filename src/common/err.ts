import { InternalServerError, NotFoundError, ParseError } from "elysia";

class PathValidationError extends Error {
  code = "PathValidationError";
  status = 400;
}

class UnAuthorizedError extends Error {
  code = "UnAuthorizedError";
  status = 401;
}

class ForbiddenError extends Error {
  code = "ForbiddenError";
  status = 403;
}

class TarballSizeLimitedError extends Error {
  code = "TgzSizeLimitError";
  status = 500;
}

class BanPackageError extends Error {
  code = "BanPackageError";
  status = 404;
}

const TypedError = {
  NotFoundError,
  InternalServerError,
  ParseError,
  PathValidationError,
  UnAuthorizedError,
  ForbiddenError,
  TarballSizeLimitedError,
  BanPackageError,
};

export enum ErrorCodes {
  NotFoundError = "NotFoundError",
  InternalServerError = "InternalServerError",
  ParseError = "ParseError",
  PathValidationError = "PathValidationError",
  UnAuthorizedError = "UnAuthorizedError",
  ForbiddenError = "ForbiddenError",
  TarballSizeLimitedError = "TarballSizeLimitedError",
  BanPackageError = "BanPackageError",
}

export const markError = (
  code: keyof typeof TypedError,
  ...labels: (string | undefined)[]
) => {
  const msg = labels.pop();
  const Factory = TypedError[code] ?? Error;

  return new Factory(`[${code}]::${labels.join(" - ")} | ${msg ?? ""}`);
};
