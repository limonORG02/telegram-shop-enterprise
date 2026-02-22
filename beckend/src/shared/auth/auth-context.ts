import { Request } from "express";

import { AppError } from "../errors/app-error";

import { AuthenticatedUser } from "./auth.types";

interface RequestWithAuth extends Request {
  authUser?: AuthenticatedUser;
}

export const setAuthUser = (req: Request, authUser: AuthenticatedUser): void => {
  (req as RequestWithAuth).authUser = authUser;
};

export const getAuthUser = (req: Request): AuthenticatedUser => {
  const authUser = (req as RequestWithAuth).authUser;

  if (!authUser) {
    throw new AppError("Authentication required", 401);
  }

  return authUser;
};
