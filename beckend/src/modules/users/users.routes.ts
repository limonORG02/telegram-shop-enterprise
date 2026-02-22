import { Router } from "express";

const usersRouter = Router();

// Placeholder routes for module scaffolding.
usersRouter.all("*", (_req, res) => {
  res.status(501).json({
    message: "Users module scaffolded. Endpoints are not implemented yet."
  });
});

export default usersRouter;
