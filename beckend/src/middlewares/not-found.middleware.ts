import { NextFunction, Request, Response } from "express";

import { AppError } from "../shared/errors/app-error";

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};
