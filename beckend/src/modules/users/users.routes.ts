import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler";
import { validate } from "../../shared/validation/validate.middleware";

import { UsersController } from "./users.controller";
import {
  createUserBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  userIdParamsSchema
} from "./users.validation";

const usersRouter = Router();
const usersController = new UsersController();

usersRouter.get(
  "/",
  validate({ query: listUsersQuerySchema }),
  asyncHandler(usersController.listUsers)
);
usersRouter.get(
  "/:id",
  validate({ params: userIdParamsSchema }),
  asyncHandler(usersController.getUserById)
);
usersRouter.post(
  "/",
  validate({ body: createUserBodySchema }),
  asyncHandler(usersController.createUser)
);
usersRouter.patch(
  "/:id",
  validate({ params: userIdParamsSchema, body: updateUserBodySchema }),
  asyncHandler(usersController.updateUser)
);
usersRouter.delete(
  "/:id",
  validate({ params: userIdParamsSchema }),
  asyncHandler(usersController.deleteUser)
);

export default usersRouter;
