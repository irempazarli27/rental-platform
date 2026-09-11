import {
  Bike,
  Briefcase,
  Camera,
  Drill,
  Dumbbell,
  Gamepad2,
  Grid3x3,
  Home,
  Music,
  PartyPopper,
  Projector,
  Tent,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  camera: Camera,
  tent: Tent,
  drill: Drill,
  projector: Projector,
  gamepad: Gamepad2,
  dumbbell: Dumbbell,
  "party-popper": PartyPopper,
  music: Music,
  briefcase: Briefcase,
  bike: Bike,
  home: Home,
  grid: Grid3x3,
};

export function CategoryIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = (icon && ICONS[icon]) || Grid3x3;
  return <Icon className={className} strokeWidth={1.75} />;
}
