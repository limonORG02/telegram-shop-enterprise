import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler";
import { validate } from "../../shared/validation/validate.middleware";

import { AuthController } from "./auth.controller";
import { telegramSignInBodySchema } from "./auth.validation";

const authRouter = Router();
const authController = new AuthController();

authRouter.post(
  "/telegram/sign-in",
  validate({ body: telegramSignInBodySchema }),
  asyncHandler(authController.signInWithTelegram)
);

export default authRouter;
