import { createFileRoute } from "@tanstack/react-router";
import { AuthCallbackPage } from "@/pages/auth-callback";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});
