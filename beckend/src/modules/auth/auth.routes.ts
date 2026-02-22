import { Router } from "express";

const authRouter = Router();

// Placeholder routes for module scaffolding.
authRouter.all("*", (_req, res) => {
  res.status(501).json({
    message: "Auth module scaffolded. Endpoints are not implemented yet."
  });
});

export default authRouter;
