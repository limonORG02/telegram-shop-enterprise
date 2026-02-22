import { Prisma } from "@prisma/client";

import { AppError } from "./app-error";

export const mapPrismaError = (error: unknown): AppError | null => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (error.code === "P2002") {
    const target = Array.isArray(error.meta?.target)
      ? error.meta?.target.join(", ")
      : "unique field";

    return new AppError(`Duplicate value for ${target}`, 409);
  }

  if (error.code === "P2025") {
    return new AppError("Resource not found", 404);
  }

  return new AppError("Database error", 500);
};
