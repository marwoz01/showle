import { CalendarDays, Clapperboard, Flame, Library, Target } from "lucide-react";
import type { ProfileBadge } from "@/types/profile";

export const BADGE_APPEARANCE = {
  "first-film": {
    Icon: Clapperboard,
    accent: "text-accent-purple",
    surface: "border-accent-purple/25 from-accent-purple/10",
    shape: "rotate-[-6deg] rounded-xl border-dashed",
    face: "bg-accent-purple/10",
  },
  "film-collector": {
    Icon: Library,
    accent: "text-accent-cyan",
    surface: "border-accent-cyan/25 from-accent-cyan/10",
    shape: "rounded-lg",
    face: "bg-accent-cyan/10",
  },
  "daily-first-win": {
    Icon: Target,
    accent: "text-accent-green",
    surface: "border-accent-green/25 from-accent-green/10",
    shape: "rounded-full",
    face: "bg-accent-green/10",
  },
  "daily-streak-7": {
    Icon: Flame,
    accent: "text-match-partial",
    surface: "border-match-partial/25 from-match-partial/10",
    shape: "rotate-45 rounded-2xl",
    face: "bg-match-partial/10",
  },
  "year-expert": {
    Icon: CalendarDays,
    accent: "text-accent-purple",
    surface: "border-accent-purple/25 from-accent-purple/10",
    shape: "rounded-t-xl rounded-b-[45%] border-double border-4",
    face: "bg-accent-purple/10",
  },
} satisfies Record<ProfileBadge["id"], object>;

export default function ProfileBadgeEmblem({ id, unlocked = true }: { id: ProfileBadge["id"]; unlocked?: boolean }) {
  const { Icon, accent, shape, face } = BADGE_APPEARANCE[id];
  return <span aria-hidden="true" className={`relative flex size-16 shrink-0 items-center justify-center ${unlocked ? accent : "text-muted/60"}`}>
    {id === "film-collector" && <><span className="absolute inset-x-2 bottom-0.5 top-3 rounded-lg border border-current opacity-20" /><span className="absolute inset-x-1.5 bottom-1.5 top-2 rounded-lg border border-current opacity-35" /></>}
    {id === "daily-first-win" && <span className="absolute inset-0 rounded-full border border-dotted border-current opacity-40" />}
    <span className={`absolute inset-1.5 border border-current ${shape} ${unlocked ? face : "bg-white/3"}`} />
    {id === "first-film" && <><span className="absolute inset-y-5 left-1 w-1 rounded-full bg-card" /><span className="absolute inset-y-5 right-1 w-1 rounded-full bg-card" /></>}
    <Icon size={27} strokeWidth={1.65} className="relative" />
    {id === "daily-streak-7" && <span className="absolute bottom-0 right-0 flex size-5 items-center justify-center rounded-full border border-current bg-card font-display text-[10px] font-bold">7</span>}
  </span>;
}
