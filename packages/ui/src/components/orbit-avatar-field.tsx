"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import { cn } from "../lib/utils";
import { AVATAR_DOT_TONES } from "../lib/avatar-tones";
import {
  forEachRingDot,
  orbitGeometry,
  type OrbitAvatarTone,
} from "./orbit-avatar";

export type OrbitAvatarFieldProps = {
  seed: string;
  size?: number;
  tone?: OrbitAvatarTone;
  backdrop?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

/**
 * Animated canvas variant of `OrbitAvatar`. Rings rotate slowly, dots twinkle,
 * the core pulses gently. Intended for hero surfaces (app logo, room header).
 * Respects `prefers-reduced-motion` by painting a single static frame.
 */
export function OrbitAvatarField({
  seed,
  size = 32,
  tone = "auto",
  backdrop = false,
  className,
  style,
  title,
}: OrbitAvatarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spec = orbitGeometryCached(seed);
  const toneClass =
    tone === "auto" ? AVATAR_DOT_TONES[spec.toneIndex] : undefined;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const prefersReduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let rafId = 0;
    let start = 0;
    let destroyed = false;

    const scale = size / 100;

    const resolveCurrentColor = (): string => {
      const cs = getComputedStyle(canvas);
      return cs.color || "#ffffff";
    };

    const paint = (t: number) => {
      if (destroyed) return;
      const color = resolveCurrentColor();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr * scale, dpr * scale);
      ctx.fillStyle = color;

      if (backdrop) {
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.arc(50, 50, 48, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const s of spec.stars) {
        const tw = 0.7 + Math.sin(t * 1.2 + (s.x + s.y)) * 0.3;
        ctx.globalAlpha = s.alpha * tw;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      spec.rings.forEach((ring, ri) => {
        const delta = ring.speed * t;
        forEachRingDot(ring, delta, (x, y, angle) => {
          const tw = 0.85 + Math.sin(t * 1.6 + angle * 3 + ri) * 0.15;
          ctx.globalAlpha = ring.alpha * tw;
          ctx.beginPath();
          ctx.arc(x, y, ring.dotSize, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      for (const p of spec.planets) {
        const ring = spec.rings[p.ringIndex];
        if (!ring) continue;
        const a = p.angle + ring.rotation + ring.speed * t;
        const x = 50 + Math.cos(a) * ring.radius;
        const y = 50 + Math.sin(a) * ring.radius;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      const pulse = 1 + Math.sin(t * 2.1) * 0.08;
      ctx.globalAlpha = spec.core.alpha;
      ctx.beginPath();
      ctx.arc(50, 50, spec.core.size * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (destroyed) return;
      if (!start) start = now;
      const t = (now - start) / 1000;
      paint(t);
      rafId = requestAnimationFrame(loop);
    };

    if (prefersReduce) {
      paint(0);
    } else {
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
    };
  }, [spec, size, backdrop]);

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
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </span>
  );
}

// Tiny LRU to avoid re-running the geometry loop on every render for the same seed.
const geometryCache = new Map<string, ReturnType<typeof orbitGeometry>>();
const GEOMETRY_CACHE_LIMIT = 256;

function orbitGeometryCached(seed: string) {
  const hit = geometryCache.get(seed);
  if (hit) return hit;
  const spec = orbitGeometry(seed);
  if (geometryCache.size >= GEOMETRY_CACHE_LIMIT) {
    const first = geometryCache.keys().next().value;
    if (first !== undefined) geometryCache.delete(first);
  }
  geometryCache.set(seed, spec);
  return spec;
}
