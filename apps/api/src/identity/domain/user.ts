import { newId, type Id } from "@/kernel/id.ts";
import type { Clock } from "@/kernel/clock.ts";
import { DomainEvent } from "@/kernel/events.ts";
import {
  type OrbitThemeMode,
  type OrbitThemePalette,
  parseOrbitThemeMode,
  parseOrbitThemePalette,
} from "@orbit/shared/themes";
import { Email } from "./email.ts";

export type UserId = Id<"user">;

export class UserRegistered extends DomainEvent {
  readonly type = "identity.user.registered";
  constructor(
    readonly userId: UserId,
    readonly email: string,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class UserPreferencesUpdated extends DomainEvent {
  readonly type = "identity.user.preferences_updated";
  constructor(
    readonly userId: UserId,
    occurredAt: Date,
  ) {
    super(occurredAt);
  }
}

export class User {
  private events: DomainEvent[] = [];
  private _themeMode: OrbitThemeMode | null;
  private _themePalette: OrbitThemePalette | null;

  private constructor(
    public readonly id: UserId,
    private _email: Email,
    private _name: string,
    private _avatarTone: number,
    public readonly createdAt: Date,
    themeMode: OrbitThemeMode | null,
    themePalette: OrbitThemePalette | null,
  ) {
    this._themeMode = themeMode;
    this._themePalette = themePalette;
  }

  static register(input: { email: Email; name: string }, clock: Clock): User {
    const id = newId("user");
    const now = clock.now();
    const tone = hashTone(input.email.value);
    const user = new User(id, input.email, input.name.trim() || defaultName(input.email), tone, now, null, null);
    user.events.push(new UserRegistered(id, input.email.value, now));
    return user;
  }

  static rehydrate(props: {
    id: UserId;
    email: Email;
    name: string;
    avatarTone: number;
    createdAt: Date;
    themeMode: OrbitThemeMode | null;
    themePalette: OrbitThemePalette | null;
  }): User {
    return new User(
      props.id,
      props.email,
      props.name,
      props.avatarTone,
      props.createdAt,
      props.themeMode,
      props.themePalette,
    );
  }

  get email(): Email {
    return this._email;
  }
  get name(): string {
    return this._name;
  }
  get avatarTone(): number {
    return this._avatarTone;
  }
  get themeMode(): OrbitThemeMode | null {
    return this._themeMode;
  }
  get themePalette(): OrbitThemePalette | null {
    return this._themePalette;
  }

  rename(next: string): void {
    const trimmed = next.trim();
    if (trimmed) this._name = trimmed;
  }

  updatePreferences(
    input: {
      themeMode?: OrbitThemeMode | null;
      themePalette?: OrbitThemePalette | null;
    },
    clock: Clock,
  ): void {
    let changed = false;
    if (Object.prototype.hasOwnProperty.call(input, "themeMode")) {
      const next =
        input.themeMode === null ? null : parseOrbitThemeMode(input.themeMode);
      if (next !== this._themeMode) {
        this._themeMode = next;
        changed = true;
      }
    }
    if (Object.prototype.hasOwnProperty.call(input, "themePalette")) {
      const next =
        input.themePalette === null
          ? null
          : parseOrbitThemePalette(input.themePalette);
      if (next !== this._themePalette) {
        this._themePalette = next;
        changed = true;
      }
    }
    if (changed) {
      this.events.push(new UserPreferencesUpdated(this.id, clock.now()));
    }
  }

  pullEvents(): DomainEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}

export function hashTone(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 6;
}

function defaultName(email: Email): string {
  const local = email.value.split("@")[0] ?? email.value;
  const words = local
    .split(/[.\-_+]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(" ") || email.value;
}
