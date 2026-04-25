import { useQuery } from "@tanstack/react-query";
import type { UserDTO } from "@orbit/shared/dto";
import { meQueryOptions } from "@/lib/queries/session";

export function useMeUser(): UserDTO | undefined {
  const { data } = useQuery(meQueryOptions);
  return data?.user;
}
