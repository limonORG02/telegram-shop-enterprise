import { Router } from "express";
import { UserRole } from "@prisma/client";

import { authenticate, authorizeRoles } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../shared/http/async-handler";
import { validate } from "../../shared/validation/validate.middleware";

import { OrdersController } from "./orders.controller";
import {
  createOrderBodySchema,
  orderIdParamsSchema,
  updateOrderStatusBodySchema
} from "./orders.validation";

const ordersRouter = Router();
const ordersController = new OrdersController();

ordersRouter.post(
  "/",
  authenticate,
  validate({ body: createOrderBodySchema }),
  asyncHandler(ordersController.createOrder)
);

ordersRouter.patch(
  "/:id/status",
  authenticate,
  authorizeRoles([UserRole.ADMIN]),
  validate({ params: orderIdParamsSchema, body: updateOrderStatusBodySchema }),
  asyncHandler(ordersController.updateOrderStatus)
);

export default ordersRouter;
