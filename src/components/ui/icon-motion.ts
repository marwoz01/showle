export type IconTrigger = boolean | "path" | "path-loop";

export const ICON_PLAY_MS = 2000;
export const ICON_IDLE_MS = 4000;

export function reducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function subscribeToReducedMotion(update: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}

export const serverReducedMotionSnapshot = () => true;

/** Run a full icon gesture, including after a quick tap, without perpetual loops. */
export function bindIconMotion(
  element: SVGSVGElement,
  play: (trigger: IconTrigger) => void,
  options: {
    onView: IconTrigger;
    onHover: IconTrigger;
    onTap: IconTrigger;
    viewOnce: boolean;
    viewMargin: string;
    idle: boolean;
  },
) {
  const target = element.closest("button, a, [role='button']") ?? element;
  let inView = false;
  let playedEntry = false;
  let hovered = false;
  let focused = false;
  let playing = false;
  let disposed = false;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  let repeatTimer: ReturnType<typeof setTimeout> | undefined;

  const canPlay = () =>
    !disposed &&
    inView &&
    !document.hidden &&
    !element.closest(":disabled, [aria-disabled='true']");

  function queueRepeat() {
    clearTimeout(repeatTimer);
    if (!canPlay() || playing) return;
    const interaction = (hovered || focused) && options.onHover;
    if (!interaction && !options.idle) return;
    repeatTimer = setTimeout(
      () => start(interaction || options.onView || true),
      interaction ? 1000 : ICON_IDLE_MS,
    );
  }

  function start(trigger: IconTrigger) {
    if (!trigger || !canPlay() || playing) return;
    clearTimeout(repeatTimer);
    playing = true;
    play(trigger);
    finishTimer = setTimeout(() => {
      playing = false;
      play(false);
      queueRepeat();
    }, ICON_PLAY_MS);
  }

  function stop() {
    clearTimeout(finishTimer);
    clearTimeout(repeatTimer);
    playing = false;
    play(false);
  }

  const enter = () => {
    hovered = true;
    start(options.onHover);
  };
  const leave = () => {
    hovered = false;
    queueRepeat();
  };
  const focus = () => {
    focused = true;
    start(options.onHover);
  };
  const blur = () => {
    focused = false;
    queueRepeat();
  };
  const tap = () => start(options.onTap);
  function appear() {
    if (!canPlay()) return;
    if (options.onView && (!playedEntry || !options.viewOnce)) {
      playedEntry = true;
      start(options.onView);
    } else queueRepeat();
  }
  const visibility = () => {
    if (document.hidden) stop();
    else appear();
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (!inView) {
        stop();
        return;
      }
      appear();
    },
    { threshold: 0.15, rootMargin: options.viewMargin },
  );

  observer.observe(element);
  target.addEventListener("pointerenter", enter);
  target.addEventListener("pointerleave", leave);
  target.addEventListener("focusin", focus);
  target.addEventListener("focusout", blur);
  target.addEventListener("pointerdown", tap);
  document.addEventListener("visibilitychange", visibility);

  return () => {
    disposed = true;
    observer.disconnect();
    stop();
    target.removeEventListener("pointerenter", enter);
    target.removeEventListener("pointerleave", leave);
    target.removeEventListener("focusin", focus);
    target.removeEventListener("focusout", blur);
    target.removeEventListener("pointerdown", tap);
    document.removeEventListener("visibilitychange", visibility);
  };
}
