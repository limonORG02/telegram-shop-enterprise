import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/http/async-handler";

import { AdminController } from "./admin.controller";

const adminRouter = Router();
const adminController = new AdminController();

adminRouter.get(
  "/stats",
  authenticate,
  authorizeRoles([UserRole.ADMIN]),
  asyncHandler(adminController.getStats)
);

export default adminRouter;
