import { Router } from "express";

const ordersRouter = Router();

// Placeholder routes for module scaffolding.
ordersRouter.all("*", (_req, res) => {
  res.status(501).json({
    message: "Orders module scaffolded. Endpoints are not implemented yet."
  });
});

export default ordersRouter;
