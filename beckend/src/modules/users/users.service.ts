import { AppError } from "../../shared/errors/app-error";
import { mapPrismaError } from "../../shared/errors/prisma-error";

import { UsersRepository, UserRecord } from "./users.repository";
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from "./users.validation";

export interface UserResponse extends Omit<UserRecord, "telegramId"> {
  telegramId: string | null;
}

interface UsersListResponse {
  items: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class UsersService {
  constructor(private readonly usersRepository = new UsersRepository()) {}

  async listUsers(query: ListUsersQueryDto): Promise<UsersListResponse> {
    const { items, total } = await this.usersRepository.findMany(query);

    return {
      items: items.map((item) => this.toResponseUser(item)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit)
      }
    };
  }

  async getUserById(id: string): Promise<UserResponse> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return this.toResponseUser(user);
  }

  async createUser(payload: CreateUserDto): Promise<UserResponse> {
    try {
      const user = await this.usersRepository.create(payload);
      return this.toResponseUser(user);
    } catch (error) {
      const prismaError = mapPrismaError(error);
      if (prismaError) {
        throw prismaError;
      }

      throw error;
    }
  }

  async updateUser(
    id: string,
    payload: UpdateUserDto
  ): Promise<UserResponse> {
    const currentUser = await this.usersRepository.findById(id);

    if (!currentUser) {
      throw new AppError("User not found", 404);
    }

    try {
      const updatedUser = await this.usersRepository.updateById(id, payload);
      return this.toResponseUser(updatedUser);
    } catch (error) {
      const prismaError = mapPrismaError(error);
      if (prismaError) {
        throw prismaError;
      }

      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    const currentUser = await this.usersRepository.findById(id);

    if (!currentUser) {
      throw new AppError("User not found", 404);
    }

    try {
      await this.usersRepository.softDeleteById(id);
    } catch (error) {
      const prismaError = mapPrismaError(error);
      if (prismaError) {
        throw prismaError;
      }

      throw error;
    }
  }

  private toResponseUser(user: UserRecord): UserResponse {
    return {
      ...user,
      telegramId: user.telegramId ? user.telegramId.toString() : null
    };
  }
}
