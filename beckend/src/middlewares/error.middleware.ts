import { ErrorRequestHandler } from "express";

import logger from "../logger";
import { AppError } from "../shared/errors/app-error";

interface ErrorResponse {
  status: "error";
  message: string;
  details?: unknown;
}

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  const error = err instanceof AppError ? err : new AppError("Internal server error", 500);

  if (!(err instanceof AppError)) {
    logger.error("Unhandled error", { err });
  } else {
    logger.warn("Operational error", {
      message: err.message,
      statusCode: err.statusCode,
      details: err.details
    });
  }

  const response: ErrorResponse = {
    status: "error",
    message: error.message
  };

  if (error.details) {
    response.details = error.details;
  }

  res.status(error.statusCode).json(response);
};
