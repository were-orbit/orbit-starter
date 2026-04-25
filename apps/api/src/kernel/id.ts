import {
  ID_PREFIX,
  type Id,
  type IdKind,
  assertId,
  isId,
  newId,
} from "@orbit/shared/ids";
import { z } from "zod";

export { ID_PREFIX, type Id, type IdKind, assertId, isId, newId };

export function zPrefixedId<K extends IdKind>(kind: K) {
  const prefix = `${ID_PREFIX[kind]}_`;
  return z
    .string()
    .refine(
      (value): value is Id<K> => value.startsWith(prefix) && value.length > prefix.length,
      { message: `expected ${kind} id starting with '${prefix}'` },
    ) as unknown as z.ZodType<Id<K>>;
}
