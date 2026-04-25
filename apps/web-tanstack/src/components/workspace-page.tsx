import type { ReactNode } from "react";

export function WorkspacePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-background">
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:px-6">
        {children}
      </div>
    </div>
  );
}
