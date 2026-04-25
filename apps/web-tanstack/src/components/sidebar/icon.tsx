import type { LucideIconName } from "@orbit/shared/navigation";
import {
  BookIcon,
  CreditCardIcon,
  HomeIcon,
  type LucideIcon,
  PaintbrushIcon,
  PlugIcon,
  SettingsIcon,
  ShieldIcon,
  SlidersIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

const ICONS: Record<LucideIconName, LucideIcon> = {
  home: HomeIcon,
  users: UsersIcon,
  "credit-card": CreditCardIcon,
  settings: SettingsIcon,
  sliders: SlidersIcon,
  paintbrush: PaintbrushIcon,
  user: UserIcon,
  shield: ShieldIcon,
  plug: PlugIcon,
  book: BookIcon,
  sparkles: SparklesIcon,
};

export function NavIcon({
  name,
  className,
}: {
  name: LucideIconName;
  className?: string;
}): React.ReactElement {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
