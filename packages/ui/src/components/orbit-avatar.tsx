import type { CSSProperties } from "react";
import { cn } from "../lib/utils";
import {
  AVATAR_DOT_TONES,
  AVATAR_TONE_COUNT,
  hashAvatarSeed,
} from "../lib/avatar-tones";

export type OrbitRing = {
  radius: number;
  dotCount: number;
  rotation: number;
  dotSize: number;
  /** Angular range `[start, end]` (radians) to leave empty for an irregular arc. */
  arcGap?: [number, number];
  alpha: number;
  /** Radians per second, signed. Only used by the animated canvas variant. */
  speed: number;
};

export type OrbitPlanet = {
  ringIndex: number;
  angle: number;
  size: number;
};

export type OrbitSpec = {
  seed: string;
  toneIndex: number;
  core: { size: number; alpha: number };
  rings: OrbitRing[];
  planets: OrbitPlanet[];
  /** Sprinkle a handful of tiny off-ring stars for extra character. */
  stars: Array<{ x: number; y: number; size: number; alpha: number }>;
};

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pure, deterministic geometry for a seeded orbit avatar.
 * Coordinate space is a normalized 100x100 viewbox centered at (50,50).
 */
export function orbitGeometry(seed: string): OrbitSpec {
  const h = hashAvatarSeed(seed || "orbit");
  const rand = mulberry32(h);
  const toneIndex = h % AVATAR_TONE_COUNT;

  const ringCount = 2 + Math.floor(rand() * 3); // 2..4
  const rings: OrbitRing[] = [];
  const innerRadius = 15 + rand() * 5;
  const outerRadius = 40 + rand() * 6;
  const step = (outerRadius - innerRadius) / Math.max(1, ringCount - 1);

  for (let i = 0; i < ringCount; i++) {
    const radius = innerRadius + step * i + (rand() - 0.5) * 2.2;
    const circumference = 2 * Math.PI * radius;
    // target ~4.5 units of arc per dot, with per-ring jitter
    const spacing = 3.8 + rand() * 2.4;
    const dotCount = Math.max(
      6,
      Math.min(24, Math.round(circumference / spacing)),
    );
    const rotation = rand() * Math.PI * 2;
    const dotSize = 0.95 + rand() * 0.75;
    // keep a high floor so rings stay legible on both light and dark backgrounds;
    // only the outermost ring softens slightly.
    const alphaBase = 0.72 + rand() * 0.22;
    const alpha = Math.max(0.58, alphaBase - i * 0.04);
    // direction + speed (radians/sec); adjacent rings go opposite ways
    const dir = i % 2 === 0 ? 1 : -1;
    const speed = dir * (0.03 + rand() * 0.08);

    let arcGap: [number, number] | undefined;
    if (rand() < 0.55) {
      const gapStart = rand() * Math.PI * 2;
      const gapSize = Math.PI * (0.18 + rand() * 0.28);
      arcGap = [gapStart, gapStart + gapSize];
    }

    rings.push({
      radius,
      dotCount,
      rotation,
      dotSize,
      arcGap,
      alpha,
      speed,
    });
  }

  const planetCount = 1 + Math.floor(rand() * 3); // 1..3
  const planets: OrbitPlanet[] = [];
  for (let i = 0; i < planetCount; i++) {
    planets.push({
      ringIndex: Math.floor(rand() * rings.length),
      angle: rand() * Math.PI * 2,
      size: 2.4 + rand() * 1.8,
    });
  }

  const starCount = 2 + Math.floor(rand() * 4); // 2..5
  const stars: OrbitSpec["stars"] = [];
  for (let i = 0; i < starCount; i++) {
    // place beyond the outermost ring, inside the 100x100 box
    const a = rand() * Math.PI * 2;
    const r = outerRadius + 4 + rand() * 6;
    stars.push({
      x: 50 + Math.cos(a) * r,
      y: 50 + Math.sin(a) * r,
      size: 0.45 + rand() * 0.5,
      alpha: 0.45 + rand() * 0.35,
    });
  }

  return {
    seed,
    toneIndex,
    core: { size: 1.8 + rand() * 1.2, alpha: 0.9 + rand() * 0.08 },
    rings,
    planets,
    stars,
  };
}

/**
 * Walk a ring and emit (x, y) for each dot, skipping dots that fall inside
 * the optional arc gap. Shared by SVG and canvas renderers.
 */
export function forEachRingDot(
  ring: OrbitRing,
  rotationDelta: number,
  visit: (x: number, y: number, angle: number) => void,
): void {
  const step = (Math.PI * 2) / ring.dotCount;
  for (let i = 0; i < ring.dotCount; i++) {
    const angle = ring.rotation + rotationDelta + i * step;
    if (ring.arcGap) {
      // normalize the dot angle to [0, 2pi)
      const norm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const [gs, ge] = ring.arcGap;
      const gsN = ((gs % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const geN = ((ge % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const inGap =
        gsN <= geN
          ? norm >= gsN && norm <= geN
          : norm >= gsN || norm <= geN;
      if (inGap) continue;
    }
    visit(50 + Math.cos(angle) * ring.radius, 50 + Math.sin(angle) * ring.radius, angle);
  }
}

export type OrbitAvatarTone = "auto" | "mono";

export type OrbitAvatarProps = {
  seed: string;
  size?: number;
  /** "auto" (default) tints dots with the seeded palette; "mono" uses currentColor. */
  tone?: OrbitAvatarTone;
  /** Draw a faint filled circle background (useful when standalone). */
  backdrop?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export function OrbitAvatar({
  seed,
  size = 24,
  tone = "auto",
  backdrop = false,
  className,
  style,
  title,
}: OrbitAvatarProps) {
  const spec = orbitGeometry(seed);
  const toneClass =
    tone === "auto" ? AVATAR_DOT_TONES[spec.toneIndex] : undefined;

  return (
    <span
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      className={cn(
        "inline-block shrink-0 align-middle leading-none",
        toneClass,
        className,
      )}
      style={{ width: size, height: size, ...style }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        {backdrop ? (
          <circle cx="50" cy="50" r="48" fill="currentColor" opacity={0.12} />
        ) : null}

        {spec.stars.map((s, i) => (
          <circle
            key={`s${i}`}
            cx={s.x}
            cy={s.y}
            r={s.size}
            fill="currentColor"
            opacity={s.alpha}
          />
        ))}

        {spec.rings.map((ring, ringIndex) => {
          const dots: Array<{ x: number; y: number; k: number }> = [];
          forEachRingDot(ring, 0, (x, y, angle) => {
            dots.push({ x, y, k: angle });
          });
          return (
            <g key={`r${ringIndex}`}>
              {dots.map((d, j) => (
                <circle
                  key={j}
                  cx={d.x}
                  cy={d.y}
                  r={ring.dotSize}
                  fill="currentColor"
                  opacity={ring.alpha}
                />
              ))}
            </g>
          );
        })}

        {spec.planets.map((p, i) => {
          const ring = spec.rings[p.ringIndex];
          if (!ring) return null;
          const x = 50 + Math.cos(p.angle + ring.rotation) * ring.radius;
          const y = 50 + Math.sin(p.angle + ring.rotation) * ring.radius;
          return (
            <circle
              key={`p${i}`}
              cx={x}
              cy={y}
              r={p.size}
              fill="currentColor"
              opacity={0.95}
            />
          );
        })}

        <circle
          cx="50"
          cy="50"
          r={spec.core.size}
          fill="currentColor"
          opacity={spec.core.alpha}
        />
      </svg>
    </span>
  );
}
