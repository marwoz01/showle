"use client";

import type { RefObject } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/** A brief confirmation for a new guess, never for restored game history. */
export function useDailyCardAnimation(root: RefObject<HTMLElement | null>, animationKey?: string | number) {
  useGSAP(() => {
    if (animationKey === undefined || !root.current) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const winner = root.current?.querySelector<HTMLElement>('[data-card-win="true"]');
      const targets = winner ? [winner] : Array.from(root.current?.querySelectorAll<HTMLElement>('[data-card-celebrate="true"]') ?? []);
      if (!targets.length) return;
      gsap.fromTo(targets, { scale: 1, rotation: 0, y: 0 }, {
        scale: winner ? 1.012 : 1.045,
        rotation: winner ? 0.35 : 1.25,
        y: -2,
        duration: 0.24,
        repeat: 1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.045,
        clearProps: "transform",
      });
    });
    return () => media.revert();
  }, { scope: root, dependencies: [animationKey], revertOnUpdate: true });
}
