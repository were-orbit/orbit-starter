import { cn } from "@orbit/ui/lib/utils";
import {
  AVATAR_PILL_TONES,
  AVATAR_TONE_COUNT,
} from "@orbit/ui/lib/avatar-tones";
import { OrbitAvatar } from "@orbit/ui/orbit-avatar";
import type { Member } from "@/lib/workspace";

type AvatarSize = "xs" | "sm" | "md";

const SIZE_MAP: Record<AvatarSize, { cls: string; dot: number }> = {
  xs: { cls: "size-4 text-[9px]", dot: 16 },
  sm: { cls: "size-6 text-[10px]", dot: 24 },
  md: { cls: "size-8 text-xs", dot: 32 },
};

export function MemberAvatar({
  member,
  size = "md",
  className,
}: {
  member: Member;
  size?: AvatarSize;
  className?: string;
}) {
  const tone = AVATAR_PILL_TONES[member.tone % AVATAR_TONE_COUNT];
  const { cls: sizeClass, dot: dotSize } = SIZE_MAP[size];
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-mono ring-1 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]",
        sizeClass,
        tone,
        className,
      )}
    >
      <OrbitAvatar
        seed={member.id}
        size={dotSize}
        tone="mono"
        className="pointer-events-none absolute inset-0 opacity-60"
      />
      <span className="relative z-10">{member.initials}</span>
    </span>
  );
}
