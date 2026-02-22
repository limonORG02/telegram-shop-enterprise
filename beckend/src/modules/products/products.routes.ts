import { Router } from "express";

const productsRouter = Router();

// Placeholder routes for module scaffolding.
productsRouter.all("*", (_req, res) => {
  res.status(501).json({
    message: "Products module scaffolded. Endpoints are not implemented yet."
  });
});

export default productsRouter;
