"use client";

import { cn } from "../lib/utils";

type AmbientGrainProps = {
  /** Marketing pages use a slightly stronger grain than the in-app shell */
  variant?: "marketing" | "app";
  className?: string;
};

export function AmbientGrain({
  variant = "marketing",
  className,
}: AmbientGrainProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0 mix-blend-multiply dark:mix-blend-overlay",
        variant === "marketing"
          ? "opacity-[0.22] dark:opacity-[0.35]"
          : "opacity-[0.14] dark:opacity-[0.28]",
        "[background-image:radial-gradient(1200px_600px_at_50%_-10%,rgba(0,0,0,0.07),transparent_60%),radial-gradient(800px_500px_at_80%_40%,rgba(0,0,0,0.035),transparent_60%)]",
        "dark:[background-image:radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.08),transparent_60%),radial-gradient(800px_500px_at_80%_40%,rgba(255,255,255,0.04),transparent_60%)]",
        className,
      )}
    />
  );
}
