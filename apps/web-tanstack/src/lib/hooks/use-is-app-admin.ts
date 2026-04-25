// +feature:auth-admin
import { useMeUser } from "@/lib/use-me-user";

export function useIsAppAdmin(): boolean {
  const me = useMeUser();
  return me?.role === "admin";
}

export function useImpersonatedBy(): string | null {
  const me = useMeUser();
  return me?.impersonatedBy ?? null;
}
// -feature:auth-admin
