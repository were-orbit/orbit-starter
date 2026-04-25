// +feature:auth-admin
import { useMemo } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@orbit/ui/tabs";
import { AdminUsersPanel } from "./admin-users-panel";

export function AdminPage(): React.ReactElement {
  const backHref = useMemo(() => {
    if (typeof window === "undefined") return "/";
    const last = window.localStorage.getItem("orbit:lastWorkspaceSlug");
    return last ? `/d/${last}` : "/";
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <header className="space-y-2">
        <a
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </a>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">
          App-wide user management and audit log.
        </p>
      </header>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4">
          <AdminUsersPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
// -feature:auth-admin
