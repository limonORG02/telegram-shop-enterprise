import { Request, Response } from "express";

import { AuthService } from "./auth.service";
import { TelegramSignInDto } from "./auth.validation";

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  signInWithTelegram = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.signInWithTelegram(req.body as TelegramSignInDto);

    res.status(200).json({
      status: "success",
      data: result
    });
  };
}
