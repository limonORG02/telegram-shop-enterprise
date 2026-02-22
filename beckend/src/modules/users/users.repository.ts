import { prisma } from "../../config/prisma";

export interface UserRecord {
  id: string;
  telegramId: bigint | null;
  email: string | null;
  phone: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  bonusPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UsersListFilters {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status?: string;
}

interface CreateUserData {
  telegramId?: bigint;
  email?: string;
  phone?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
  bonusPoints?: number;
}

interface UpdateUserData extends CreateUserData {}

const userSelect = {
  id: true,
  telegramId: true,
  email: true,
  phone: true,
  username: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  bonusPoints: true,
  createdAt: true,
  updatedAt: true
};

export class UsersRepository {
  async findMany(filters: UsersListFilters): Promise<{ items: UserRecord[]; total: number }> {
    const where: Record<string, unknown> = {
      deletedAt: null
    };

    if (filters.search) {
      where.OR = [
        { username: { contains: filters.search, mode: "insensitive" } },
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } }
      ];
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const skip = (filters.page - 1) * filters.limit;
    const take = filters.limit;

    const [total, items] = await prisma.$transaction([
      prisma.user.count({ where: where as never }),
      prisma.user.findMany({
        where: where as never,
        skip,
        take,
        orderBy: { createdAt: "desc" } as never,
        select: userSelect as never
      })
    ]);

    return {
      total,
      items: items as unknown as UserRecord[]
    };
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null
      } as never,
      select: userSelect as never
    });

    return (user as UserRecord | null) ?? null;
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    const user = await prisma.user.create({
      data: data as never,
      select: userSelect as never
    });

    return user as unknown as UserRecord;
  }

  async updateById(id: string, data: UpdateUserData): Promise<UserRecord> {
    const user = await prisma.user.update({
      where: { id } as never,
      data: data as never,
      select: userSelect as never
    });

    return user as unknown as UserRecord;
  }

  async softDeleteById(id: string): Promise<void> {
    await prisma.user.update({
      where: { id } as never,
      data: {
        status: "DELETED",
        deletedAt: new Date()
      } as never
    });
  }
}
