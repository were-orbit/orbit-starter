import type { ReactNode } from "react";

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h2>
      <p className="mt-1 max-w-prose text-[13px] text-muted-foreground leading-relaxed [text-wrap:pretty]">
        {description}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
