import { UserRole } from "@prisma/client";
import { NextFunction, Request, RequestHandler, Response } from "express";
import * as jwt from "jsonwebtoken";
import { ZodError, z } from "zod";

import { env } from "../config/env";
import { getAuthUser, setAuthUser } from "../shared/auth/auth-context";
import { JwtAccessPayload } from "../shared/auth/auth.types";
import { AppError } from "../shared/errors/app-error";

const jwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(["CUSTOMER", "ADMIN", "MANAGER"]),
  telegramId: z.string().regex(/^\d+$/)
});

const readBearerToken = (authHeader?: string): string => {
  if (!authHeader) {
    throw new AppError("Authorization header is required", 401);
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    throw new AppError("Invalid authorization header format", 401);
  }

  return token;
};

const verifyToken = (token: string): JwtAccessPayload => {
  if (!env.jwtAccessSecret) {
    throw new AppError("JWT access token secret is not configured", 500);
  }

  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, env.jwtAccessSecret, {
      issuer: env.serviceName
    });
  } catch (_error) {
    throw new AppError("Invalid or expired access token", 401);
  }

  if (typeof decoded === "string") {
    throw new AppError("Invalid token payload", 401);
  }

  let parsedPayload: z.infer<typeof jwtPayloadSchema>;
  try {
    parsedPayload = jwtPayloadSchema.parse(decoded);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError("Invalid token payload", 401, error.flatten());
    }

    throw error;
  }

  return {
    ...parsedPayload,
    iat: decoded.iat,
    exp: decoded.exp,
    iss: decoded.iss
  };
};

export const authenticate: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const token = readBearerToken(req.header("authorization"));
    const payload = verifyToken(token);

    setAuthUser(req, {
      id: payload.sub,
      role: payload.role,
      telegramId: payload.telegramId
    });

    next();
  } catch (error) {
    next(error);
  }
};

export const authorizeRoles = (allowedRoles: UserRole[]): RequestHandler => {
  return (req, _res, next) => {
    try {
      const authUser = getAuthUser(req);

      if (!allowedRoles.includes(authUser.role)) {
        throw new AppError("Insufficient permissions", 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
