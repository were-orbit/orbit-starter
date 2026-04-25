import { createFileRoute } from "@tanstack/react-router";
import { BannedPage } from "@/pages/banned";

export const Route = createFileRoute("/banned")({
  component: BannedPage,
});
