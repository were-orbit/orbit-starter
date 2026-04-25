import type { Prisma } from "@/infrastructure/prisma.ts";
import { isOrbitThemeMode, isOrbitThemePalette } from "@orbit/shared/themes";
import { Email } from "../domain/email.ts";
import type { UserRepository } from "../domain/repositories.ts";
import { User, type UserId } from "../domain/user.ts";

type UserRow = {
  id: string;
  email: string;
  name: string;
  avatarTone: number;
  createdAt: Date;
  themeMode: string | null;
  themePalette: string | null;
};

function toDomain(row: UserRow): User {
  return User.rehydrate({
    id: row.id as UserId,
    email: Email.parse(row.email),
    name: row.name,
    avatarTone: row.avatarTone,
    createdAt: row.createdAt,
    themeMode: isOrbitThemeMode(row.themeMode) ? row.themeMode : null,
    themePalette: isOrbitThemePalette(row.themePalette)
      ? row.themePalette
      : null,
  });
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: Prisma) {}

  async findById(id: UserId): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    return row ? toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.db.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email.value,
        name: user.name,
        avatarTone: user.avatarTone,
        createdAt: user.createdAt,
        themeMode: user.themeMode,
        themePalette: user.themePalette,
      },
      update: {
        email: user.email.value,
        name: user.name,
        avatarTone: user.avatarTone,
        themeMode: user.themeMode,
        themePalette: user.themePalette,
      },
    });
  }
}
