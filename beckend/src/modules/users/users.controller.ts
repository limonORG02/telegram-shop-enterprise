import { Request, Response } from "express";

import { UsersService } from "./users.service";
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from "./users.validation";

export class UsersController {
  constructor(private readonly usersService = new UsersService()) {}

  listUsers = async (req: Request, res: Response): Promise<void> => {
    const users = await this.usersService.listUsers(req.query as unknown as ListUsersQueryDto);

    res.status(200).json({
      status: "success",
      data: users.items,
      pagination: users.pagination
    });
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    const user = await this.usersService.getUserById(req.params.id);

    res.status(200).json({
      status: "success",
      data: user
    });
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    const user = await this.usersService.createUser(req.body as CreateUserDto);

    res.status(201).json({
      status: "success",
      data: user
    });
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    const user = await this.usersService.updateUser(req.params.id, req.body as UpdateUserDto);

    res.status(200).json({
      status: "success",
      data: user
    });
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    await this.usersService.deleteUser(req.params.id);

    res.status(204).send();
  };
}
