type MarkProps = { className?: string };

const base = "h-3.5 w-3.5";

export function NextMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 7v10M16 7l-.001 6.5" />
      <path d="M8 7l9 13" />
    </svg>
  );
}

export function TanStackMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      className={className ?? base}
      aria-hidden
    >
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

export function HonoMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden
    >
      <path d="M12 2c2.5 3.5 6 6.5 6 11a6 6 0 0 1-12 0c0-2 1-3.5 2-5 0 1.5.8 2.5 2 2.5 0-3 .5-6 2-8.5Z" />
    </svg>
  );
}

export function PrismaMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden
    >
      <path d="M8 3 4 19a1 1 0 0 0 1.3 1.2l13-4.2a1 1 0 0 0 .5-1.5L9.4 2.6A1 1 0 0 0 8 3Z" />
    </svg>
  );
}

export function StripeMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className ?? base}
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

export function BetterAuthMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden
    >
      <path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function ResendMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

export function TailwindMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden
    >
      <path d="M3 13c1.5-3 3.5-4.5 6-4.5 3.5 0 4.25 2.25 6.75 2.25 1.5 0 2.75-.75 3.75-2.25" />
      <path d="M3 18c1.5-3 3.5-4.5 6-4.5 3.5 0 4.25 2.25 6.75 2.25 1.5 0 2.75-.75 3.75-2.25" />
    </svg>
  );
}

export function PostgresMark({ className }: MarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? base}
      aria-hidden
    >
      <ellipse cx="12" cy="5" rx="8" ry="2.5" />
      <path d="M4 5v9c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5" />
      <path d="M12 16.5v4" />
    </svg>
  );
}
