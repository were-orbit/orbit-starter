import { v7 as uuidv7 } from "uuid";

export const ID_PREFIX = {
  user: "user",
  session: "sess",
  magicLink: "ml",
  workspace: "ws",
  workspaceMember: "mbr",
  workspaceInvite: "inv",
  workspaceRole: "wsrole",
  team: "team",
  teamMember: "tmbr",
  teamInvite: "tinv",
  teamRole: "trole",
  billingCustomer: "bcus",
  subscription: "sub",
  subscriptionItem: "subi",
  billingEvent: "bevt",
  waitlistEntry: "wl",
  appAuditEntry: "al",
  workspaceAuditEntry: "wal",
} as const;

export type IdKind = keyof typeof ID_PREFIX;

declare const ID_BRAND: unique symbol;
export type Id<K extends IdKind> = string & { readonly [ID_BRAND]: K };

export function newId<K extends IdKind>(kind: K): Id<K> {
  return `${ID_PREFIX[kind]}_${uuidv7().replace(/-/g, "")}` as Id<K>;
}

export function isId<K extends IdKind>(kind: K, value: string): value is Id<K> {
  return value.startsWith(`${ID_PREFIX[kind]}_`);
}

export function assertId<K extends IdKind>(kind: K, value: string): Id<K> {
  if (!isId(kind, value)) {
    throw new Error(`expected ${kind} id, got ${value}`);
  }
  return value;
}
