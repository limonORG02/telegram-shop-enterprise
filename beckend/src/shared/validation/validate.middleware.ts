import { RequestHandler } from "express";
import { AnyZodObject, ZodError } from "zod";

import { AppError } from "../errors/app-error";

interface ValidationSchema {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export const validate = (schema: ValidationSchema): RequestHandler => {
  return (req, _res, next) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError("Validation failed", 400, error.flatten()));
        return;
      }

      next(error);
    }
  };
};
