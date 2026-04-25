import { Link } from "@tanstack/react-router";
import { Button } from "@orbit/ui/button";
import { CHECKOUT_URLS } from "@/lib/checkout";
import { DocsSearch } from "@/components/docs-search";

type NavItem = { label: string; to: string; active?: boolean };

const NAV: NavItem[] = [
  { label: "Features", to: "/features" },
  { label: "Tech Stack", to: "/tech-stack" },
  { label: "Configure", to: "/configure" },
  { label: "Pricing", to: "/pricing" },
  { label: "Docs", to: "/docs" },
  { label: "Changelog", to: "/changelog" },
];

export function SiteHeader({ active }: { active?: string }) {
  return (
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-12">
      <Link to="/" className="flex items-center gap-2 text-sm">
        <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
        <span className="tracking-[0.2em] uppercase">Orbit</span>
      </Link>

      <nav className="hidden items-center gap-8 text-muted-foreground text-sm md:flex">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={
              active === item.to
                ? "text-foreground"
                : "transition-colors hover:text-foreground"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {active === "/docs" && (
          <div className="hidden md:block">
            <DocsSearch />
          </div>
        )}
        <a
          href="https://github.com/were-orbit/orbit-starter"
          className="hidden items-center justify-center rounded-md border border-border/70 p-2 text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
          target="_blank"
          rel="noreferrer"
          aria-label="View Orbit on GitHub"
        >
          <GithubMark className="h-3.5 w-3.5" />
        </a>
        <Button
          variant="default"
          size="sm"
          render={<a href={CHECKOUT_URLS.builder}>Get access</a>}
        />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 border-t border-border/60 px-6 py-8 text-[11px] text-muted-foreground uppercase tracking-[0.25em] md:flex-row md:items-center md:px-12">
      <div className="flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/70" />
        Orbit · 2026
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <a
          href="https://github.com"
          className="transition-colors hover:text-foreground"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <Link to="/docs" className="transition-colors hover:text-foreground">
          Docs
        </Link>
        <Link to="/changelog" className="transition-colors hover:text-foreground">
          Changelog
        </Link>
        <Link to="/pricing" className="transition-colors hover:text-foreground">
          Pricing
        </Link>
      </div>
    </footer>
  );
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.69-3.87-1.37-3.87-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.75.4-1.27.74-1.56-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.77.12 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.69 5.4-5.26 5.69.41.36.78 1.06.78 2.15v3.18c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}
