import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/http/async-handler";
import { validate } from "../../shared/validation/validate.middleware";

import { BonusController } from "./bonus.controller";
import { redeemBonusBodySchema } from "./bonus.validation";

const bonusRouter = Router();
const bonusController = new BonusController();

bonusRouter.post(
  "/redeem",
  authenticate,
  validate({ body: redeemBonusBodySchema }),
  asyncHandler(bonusController.redeemBonus)
);

export default bonusRouter;
