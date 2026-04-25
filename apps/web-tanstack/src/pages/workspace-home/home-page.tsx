import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@orbit/ui/card";
import { Button } from "@orbit/ui/button";
import { Link } from "@tanstack/react-router";
import { useWorkspaceSlug } from "@/lib/use-workspace-slug";

export function WorkspaceHomePage(): React.ReactElement {
  const slug = useWorkspaceSlug() ?? "";
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          This is your workspace home. Jump into what you were working on.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Organize people into teams.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  to="/d/$workspaceSlug/teams"
                  params={{ workspaceSlug: slug }}
                >
                  Open teams
                </Link>
              }
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>Manage your plan and invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  to="/d/$workspaceSlug/billing"
                  params={{ workspaceSlug: slug }}
                >
                  Open billing
                </Link>
              }
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Workspace-wide configuration.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  to="/d/$workspaceSlug/workspace/settings/$section"
                  params={{ workspaceSlug: slug, section: "general" }}
                >
                  Open settings
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
