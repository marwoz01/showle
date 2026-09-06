import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindIconMotion,
  ICON_IDLE_MS,
  ICON_PLAY_MS,
  reducedMotionSnapshot,
  serverReducedMotionSnapshot,
  subscribeToReducedMotion,
} from "@/components/ui/icon-motion";

describe("icon motion triggers", () => {
  let doc: EventTarget & { hidden: boolean };
  let target: EventTarget;
  let disabled: boolean;
  let emitView: (visible: boolean) => void;
  let disconnect: ReturnType<typeof vi.fn>;
  let cleanup: (() => void) | undefined;
  const options = {
    onView: true,
    onHover: true,
    onTap: true,
    viewOnce: true,
    viewMargin: "0px",
    idle: false,
  };
  const play = vi.fn();

  function bind(overrides = {}) {
    const element = {
      closest: (selector: string) =>
        selector.includes(":disabled") ? (disabled ? target : null) : target,
    } as unknown as SVGSVGElement;
    cleanup = bindIconMotion(element, play, { ...options, ...overrides });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    play.mockClear();
    disabled = false;
    doc = Object.assign(new EventTarget(), { hidden: false });
    target = new EventTarget();
    disconnect = vi.fn();
    vi.stubGlobal("document", doc);
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          emitView = (visible) =>
            callback(
              [{ isIntersecting: visible } as IntersectionObserverEntry],
              this as unknown as IntersectionObserver,
            );
        }
        observe() {}
        disconnect = disconnect;
      },
    );
  });
  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("animates on first appearance without hover, then rests", () => {
    bind();
    expect(play).not.toHaveBeenCalled();
    emitView(true);
    expect(play).toHaveBeenLastCalledWith(true);
    vi.advanceTimersByTime(ICON_PLAY_MS);
    expect(play).toHaveBeenLastCalledWith(false);
    vi.advanceTimersByTime(20000);
    expect(play.mock.calls.filter(([active]) => active)).toHaveLength(1);
  });

  it("replays highlighted icons after a quiet interval", () => {
    bind({ idle: true });
    emitView(true);
    vi.advanceTimersByTime(ICON_PLAY_MS + ICON_IDLE_MS - 1);
    expect(play).toHaveBeenLastCalledWith(false);
    vi.advanceTimersByTime(1);
    expect(play).toHaveBeenLastCalledWith(true);
  });

  it("pauses off-screen and resumes idle gestures when visible", () => {
    bind({ idle: true });
    emitView(true);
    emitView(false);
    play.mockClear();
    vi.advanceTimersByTime(20000);
    expect(play).not.toHaveBeenCalled();
    emitView(true);
    vi.advanceTimersByTime(ICON_IDLE_MS);
    expect(play).toHaveBeenLastCalledWith(true);
  });

  it("pauses while the browser tab is hidden", () => {
    bind({ idle: true });
    emitView(true);
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(play).toHaveBeenLastCalledWith(false);
    play.mockClear();
    vi.advanceTimersByTime(20000);
    expect(play).not.toHaveBeenCalled();
  });

  it("finishes a gesture after a quick tap instead of cancelling on release", () => {
    bind({ onView: false });
    emitView(true);
    target.dispatchEvent(new Event("pointerdown"));
    target.dispatchEvent(new Event("pointerup"));
    target.dispatchEvent(new Event("pointerleave"));
    vi.advanceTimersByTime(300);
    expect(play.mock.calls).toEqual([[true]]);
    vi.advanceTimersByTime(ICON_PLAY_MS);
    expect(play).toHaveBeenLastCalledWith(false);
  });

  it("defers the first gesture until a background tab becomes visible", () => {
    doc.hidden = true;
    bind();
    emitView(true);
    expect(play).not.toHaveBeenCalled();
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(play).toHaveBeenLastCalledWith(true);
  });

  it("starts from keyboard focus on the whole link and does not loop after blur", () => {
    bind({ onView: false });
    emitView(true);
    target.dispatchEvent(new Event("focusin"));
    expect(play).toHaveBeenLastCalledWith(true);
    target.dispatchEvent(new Event("focusout"));
    vi.advanceTimersByTime(20000);
    expect(play.mock.calls.filter(([active]) => active)).toHaveLength(1);
  });

  it("preserves a caller's requested animation variant", () => {
    bind({ onView: false, onHover: "path-loop" });
    emitView(true);
    target.dispatchEvent(new Event("pointerenter"));
    expect(play).toHaveBeenLastCalledWith("path-loop");
  });

  it("does not animate a disabled control", () => {
    disabled = true;
    bind({ idle: true });
    emitView(true);
    target.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(20000);
    expect(play).not.toHaveBeenCalled();
  });

  it("cleans up timers, the observer and event listeners", () => {
    bind({ idle: true });
    emitView(true);
    cleanup?.();
    cleanup = undefined;
    play.mockClear();
    target.dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(20000);
    expect(play).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("subscribes to live reduced-motion changes and defaults to static SSR", () => {
    const media = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal("window", { matchMedia: () => media });
    const update = vi.fn();
    const unsubscribe = subscribeToReducedMotion(update);
    expect(serverReducedMotionSnapshot()).toBe(true);
    expect(reducedMotionSnapshot()).toBe(false);
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    expect(update).toHaveBeenCalledOnce();
    expect(reducedMotionSnapshot()).toBe(true);
    unsubscribe();
    media.dispatchEvent(new Event("change"));
    expect(update).toHaveBeenCalledOnce();
  });
});
