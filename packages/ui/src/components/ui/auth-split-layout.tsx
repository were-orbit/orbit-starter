import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { ThemeToggle } from "../theme-toggle";

type AuthSplitLayoutProps = {
  left: ReactNode;
  right: ReactNode;
  className?: string;
  frameClassName?: string;
  leftClassName?: string;
  rightClassName?: string;
};

export function AuthSplitLayout({
  left,
  right,
  className,
  frameClassName,
  leftClassName,
  rightClassName,
}: AuthSplitLayoutProps) {
  return (
    <div
      className={cn(
        "relative h-svh overflow-hidden bg-background text-foreground 2xl:flex 2xl:h-auto 2xl:min-h-svh 2xl:items-center 2xl:justify-center 2xl:overflow-visible 2xl:p-6",
        className,
      )}
    >
      <ThemeToggle className="absolute top-6 right-6 z-30" />
      <div
        className={cn(
          "relative mx-auto flex h-full w-full max-w-[1600px]",
          "2xl:h-auto 2xl:min-h-0 2xl:w-[min(94vw,calc(92svh*16/9))] 2xl:max-w-none 2xl:aspect-[16/9]",
          "2xl:overflow-hidden 2xl:rounded-2xl 2xl:border 2xl:border-border/70 2xl:bg-background/95 2xl:shadow-[0_25px_80px_-24px_rgba(0,0,0,0.75)]",
          frameClassName,
        )}
      >
        <div
          className={cn(
            "relative hidden flex-1 overflow-hidden border-border/60 border-r lg:block",
            leftClassName,
          )}
        >
          {left}
        </div>
        <div
          className={cn(
            "relative flex w-full flex-col items-center justify-center overflow-y-auto px-6 py-10 lg:w-[560px] lg:px-14",
            rightClassName,
          )}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
