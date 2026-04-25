import { createFileRoute } from "@tanstack/react-router";
import { WaitlistPage } from "@/pages/waitlist";

export const Route = createFileRoute("/waitlist")({
  component: WaitlistPage,
});
