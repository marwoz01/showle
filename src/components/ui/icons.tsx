"use client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FunctionComponent,
} from "react";
import {
  bindIconMotion,
  reducedMotionSnapshot,
  serverReducedMotionSnapshot,
  subscribeToReducedMotion,
  type IconTrigger,
} from "./icon-motion";
import type { IconProps } from "@/components/animate-ui/icons/icon";
import { TriangleAlert as TriangleAlertBase } from "@/components/animate-ui/icons/triangle-alert";
import { ArrowDown as ArrowDownBase } from "@/components/animate-ui/icons/arrow-down";
import { ArrowLeft as ArrowLeftBase } from "@/components/animate-ui/icons/arrow-left";
import { ArrowRight as ArrowRightBase } from "@/components/animate-ui/icons/arrow-right";
import { ArrowUp as ArrowUpBase } from "@/components/animate-ui/icons/arrow-up";
import { ArrowUpDown as ArrowUpDownBase } from "@/components/animate-ui/icons/arrow-up-down";
import { ArrowUpRight as ArrowUpRightBase } from "@/components/animate-ui/icons/arrow-up-right";
import { ChartNoAxesColumn as ChartNoAxesColumnBase } from "@/components/animate-ui/icons/chart-no-axes-column";
import { Bookmark as BookmarkBase } from "@/components/animate-ui/icons/bookmark";
import { BookmarkCheck as BookmarkCheckBase } from "@/components/animate-ui/icons/bookmark-check";
import { Check as CheckBase } from "@/components/animate-ui/icons/check";
import { ChevronLeft as ChevronLeftBase } from "@/components/animate-ui/icons/chevron-left";
import { ChevronRight as ChevronRightBase } from "@/components/animate-ui/icons/chevron-right";
import { Clapperboard as ClapperboardBase } from "@/components/animate-ui/icons/clapperboard";
import { Clipboard as ClipboardBase } from "@/components/animate-ui/icons/clipboard";
import { Clock as ClockBase } from "@/components/animate-ui/icons/clock";
import { Clock3 as Clock3Base } from "@/components/animate-ui/icons/clock-3";
import { Copy as CopyBase } from "@/components/animate-ui/icons/copy";
import { ExternalLink as ExternalLinkBase } from "@/components/animate-ui/icons/external-link";
import { Eye as EyeBase } from "@/components/animate-ui/icons/eye";
import { Flag as FlagBase } from "@/components/animate-ui/icons/flag";
import { Flame as FlameBase } from "@/components/animate-ui/icons/flame";
import { FlaskConical as FlaskConicalBase } from "@/components/animate-ui/icons/flask-conical";
import { GripVertical as GripVerticalBase } from "@/components/animate-ui/icons/grip-vertical";
import { History as HistoryBase } from "@/components/animate-ui/icons/history";
import { House as HouseBase } from "@/components/animate-ui/icons/house";
import { Library as LibraryBase } from "@/components/animate-ui/icons/library";
import { Lightbulb as LightbulbBase } from "@/components/animate-ui/icons/lightbulb";
import { LoaderCircle as LoaderCircleBase } from "@/components/animate-ui/icons/loader-circle";
import { Lock as LockBase } from "@/components/animate-ui/icons/lock";
import { LogOut as LogOutBase } from "@/components/animate-ui/icons/log-out";
import { Menu as MenuBase } from "@/components/animate-ui/icons/menu";
import { MessageSquare as MessageSquareBase } from "@/components/animate-ui/icons/message-square";
import { EllipsisVertical as EllipsisVerticalBase } from "@/components/animate-ui/icons/ellipsis-vertical";
import { Play as PlayBase } from "@/components/animate-ui/icons/play";
import { Plus as PlusBase } from "@/components/animate-ui/icons/plus";
import { RefreshCw as RefreshCwBase } from "@/components/animate-ui/icons/refresh-cw";
import { Search as SearchBase } from "@/components/animate-ui/icons/search";
import { Sparkles as SparklesBase } from "@/components/animate-ui/icons/sparkles";
import { Star as StarBase } from "@/components/animate-ui/icons/star";
import { Swords as SwordsBase } from "@/components/animate-ui/icons/swords";
import { Target as TargetBase } from "@/components/animate-ui/icons/target";
import { Trash2 as Trash2Base } from "@/components/animate-ui/icons/trash-2";
import { Trophy as TrophyBase } from "@/components/animate-ui/icons/trophy";
import { User as UserBase } from "@/components/animate-ui/icons/user";
import { UserRound as UserRoundBase } from "@/components/animate-ui/icons/user-round";
import { X as XBase } from "@/components/animate-ui/icons/x";
import { CircleX as CircleXBase } from "@/components/animate-ui/icons/circle-x";
import { Zap as ZapBase } from "@/components/animate-ui/icons/zap";

export type AppIconProps = IconProps<never> & { idle?: boolean };
export type LucideIcon = FunctionComponent<AppIconProps>;

// One shared adapter keeps existing sizes/colours and respects reduced motion.
function withInteraction(Icon: LucideIcon): LucideIcon {
  function AppIcon({
    size = 24,
    animate,
    animateOnView = true,
    animateOnViewOnce = true,
    animateOnViewMargin = "0px",
    animateOnHover = true,
    animateOnTap = true,
    idle = false,
    ...props
  }: AppIconProps) {
    const ref = useRef<SVGSVGElement>(null);
    const [active, setActive] = useState<IconTrigger>(false);
    const reduceMotion = useSyncExternalStore(
      subscribeToReducedMotion,
      reducedMotionSnapshot,
      serverReducedMotionSnapshot,
    );
    useEffect(() => {
      if (reduceMotion || animate !== undefined || !ref.current) return;
      return bindIconMotion(ref.current, setActive, {
        onView: animateOnView,
        onHover: animateOnHover,
        onTap: animateOnTap,
        viewOnce: animateOnViewOnce,
        viewMargin: animateOnViewMargin,
        idle,
      });
    }, [
      reduceMotion,
      animate,
      animateOnView,
      animateOnViewOnce,
      animateOnViewMargin,
      animateOnHover,
      animateOnTap,
      idle,
    ]);
    return (
      <Icon
        {...props}
        ref={ref}
        size={size}
        aria-hidden={props["aria-label"] ? undefined : true}
        data-animate-ui="icon"
        data-icon-state={
          reduceMotion ? "reduced" : (animate ?? active) ? "playing" : "idle"
        }
        animate={reduceMotion ? false : (animate ?? active)}
      />
    );
  }
  return AppIcon;
}
export const AlertTriangle = withInteraction(TriangleAlertBase);
export const ArrowDown = withInteraction(ArrowDownBase);
export const ArrowLeft = withInteraction(ArrowLeftBase);
export const ArrowRight = withInteraction(ArrowRightBase);
export const ArrowUp = withInteraction(ArrowUpBase);
export const ArrowUpDown = withInteraction(ArrowUpDownBase);
export const ArrowUpRight = withInteraction(ArrowUpRightBase);
export const BarChart3 = withInteraction(ChartNoAxesColumnBase);
export const Bookmark = withInteraction(BookmarkBase);
export const BookmarkCheck = withInteraction(BookmarkCheckBase);
export const Check = withInteraction(CheckBase);
export const ChevronLeft = withInteraction(ChevronLeftBase);
export const ChevronRight = withInteraction(ChevronRightBase);
export const Clapperboard = withInteraction(ClapperboardBase);
export const Clipboard = withInteraction(ClipboardBase);
export const Clock = withInteraction(ClockBase);
export const Clock3 = withInteraction(Clock3Base);
export const Copy = withInteraction(CopyBase);
export const ExternalLink = withInteraction(ExternalLinkBase);
export const Eye = withInteraction(EyeBase);
export const Film = withInteraction(ClapperboardBase);
export const Flag = withInteraction(FlagBase);
export const Flame = withInteraction(FlameBase);
export const FlaskConical = withInteraction(FlaskConicalBase);
export const GripVertical = withInteraction(GripVerticalBase);
export const History = withInteraction(HistoryBase);
export const Home = withInteraction(HouseBase);
export const Library = withInteraction(LibraryBase);
export const Lightbulb = withInteraction(LightbulbBase);
export const Loader2 = withInteraction(LoaderCircleBase);
export const LoaderCircle = withInteraction(LoaderCircleBase);
export const Lock = withInteraction(LockBase);
export const LogOut = withInteraction(LogOutBase);
export const Menu = withInteraction(MenuBase);
export const MessageSquare = withInteraction(MessageSquareBase);
export const MoreVertical = withInteraction(EllipsisVerticalBase);
export const Play = withInteraction(PlayBase);
export const Plus = withInteraction(PlusBase);
export const RefreshCw = withInteraction(RefreshCwBase);
export const Search = withInteraction(SearchBase);
export const Sparkles = withInteraction(SparklesBase);
export const Star = withInteraction(StarBase);
export const Swords = withInteraction(SwordsBase);
export const Target = withInteraction(TargetBase);
export const Trash2 = withInteraction(Trash2Base);
export const Trophy = withInteraction(TrophyBase);
export const User = withInteraction(UserBase);
export const UserRound = withInteraction(UserRoundBase);
export const X = withInteraction(XBase);
export const XCircle = withInteraction(CircleXBase);
export const Zap = withInteraction(ZapBase);
