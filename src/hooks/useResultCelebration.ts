"use client";
import { useEffect, type RefObject } from "react";
import confetti from "canvas-confetti";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP);
export function useResultCelebration(answerId: number, won: boolean, celebrate: boolean, scope: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (
      !won ||
      !celebrate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let animationFrameId: number | null = null;
    let end = 0;

    function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ["#7C4DFF", "#00E676", "#00BCD4", "#FFC107"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ["#7C4DFF", "#00E676", "#00BCD4", "#FFC107"],
      });

      if (Date.now() < end) {
        animationFrameId = requestAnimationFrame(frame);
      }
    }

    const startTimer = window.setTimeout(() => {
      end = Date.now() + 1600;
      frame();
    }, 520);

    return () => {
      window.clearTimeout(startTimer);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [won, celebrate]);

  useGSAP(
    () => {
      if (!won || !celebrate) return;

      const revealTargets = gsap.utils.toArray<HTMLElement>(
        "[data-result-reveal]",
      );

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(revealTargets, { clearProps: "all" });
        return;
      }

      const timeline = gsap.timeline({
        defaults: { duration: 0.42, ease: "power3.out" },
      });

      timeline
        .fromTo(
          '[data-result-reveal="intro"]',
          { autoAlpha: 0, y: 18, scale: 0.985 },
          { autoAlpha: 1, y: 0, scale: 1, stagger: 0.06 },
          0,
        )
        .fromTo(
          '[data-result-reveal="details"]',
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0 },
          0.28,
        )
        .fromTo(
          '[data-result-reveal="trailer"]',
          { autoAlpha: 0, y: 14, scale: 0.99 },
          { autoAlpha: 1, y: 0, scale: 1 },
          0.56,
        )
        .fromTo(
          '[data-result-reveal="final"]',
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0 },
          0.84,
        );

      return () => timeline.kill();
    },
    {
      scope: scope,
      dependencies: [answerId, won, celebrate],
      revertOnUpdate: true,
    },
  );

}
