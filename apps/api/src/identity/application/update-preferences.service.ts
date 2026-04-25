import type { UserId } from "@/identity/domain/user.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { Clock } from "@/kernel/clock.ts";
import { NotFoundError } from "@/kernel/errors.ts";
import type { OrbitThemeMode, OrbitThemePalette } from "@orbit/shared/themes";

export interface UpdatePreferencesCommand {
  userId: UserId;
  themeMode?: OrbitThemeMode | null;
  themePalette?: OrbitThemePalette | null;
}

/**
 * Updates the authenticated user's UI preferences (theme mode and
 * palette). Only fields explicitly present on the input are changed;
 * missing fields are left untouched. Passing `null` clears to default.
 *
 * Validation of the enum strings is delegated to the aggregate's
 * `updatePreferences` method, which uses `parseOrbitThemeMode` /
 * `parseOrbitThemePalette` to throw on unknown values.
 */
export class UpdatePreferencesService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: UpdatePreferencesCommand): Promise<void> {
    await this.uow.run(async (tx) => {
      const user = await tx.users.findById(cmd.userId);
      if (!user) {
        throw new NotFoundError("user");
      }
      const patch: Parameters<typeof user.updatePreferences>[0] = {};
      if (Object.prototype.hasOwnProperty.call(cmd, "themeMode")) {
        patch.themeMode = cmd.themeMode ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(cmd, "themePalette")) {
        patch.themePalette = cmd.themePalette ?? null;
      }
      user.updatePreferences(patch, this.clock);
      await tx.users.save(user);
      tx.events.addMany(user.pullEvents());
    });
  }
}
