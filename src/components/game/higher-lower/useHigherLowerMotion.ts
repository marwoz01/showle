"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import type { HigherLowerGameView } from "@/types/higher-lower";
import { addHigherLowerReveal, HIGHER_LOWER_MOTION } from "@/components/game/higher-lower/higherLowerReveal";

gsap.registerPlugin(useGSAP);

export function useHigherLowerMotion(
  game: HigherLowerGameView | null,
  upcoming: HigherLowerGameView | null,
  commitNext: () => void,
) {
  const arena = useRef<HTMLDivElement>(null);
  const [revealedGame, setRevealedGame] = useState<HigherLowerGameView | null>(null);
  const [heldGame, setHeldGame] = useState<HigherLowerGameView | null>(null);
  const revealed = game !== null && revealedGame === game;

  useGSAP(() => {
    if (!game || game.right.year === null) return;
    const year = arena.current?.querySelector<HTMLElement>('[data-side="right"] [data-year]');
    if (!year) return;
    const media = gsap.matchMedia();
    media.add({ reduce: "(prefers-reduced-motion: reduce)", motion: "(prefers-reduced-motion: no-preference)" }, (context) => {
      const target = game.right.year!;
      const reduced = Boolean(context.conditions?.reduce);
      addHigherLowerReveal(gsap.timeline(), target, {
        onYear: (value) => { if (year.isConnected) year.textContent = String(value); },
        onReveal: () => setRevealedGame(game),
        onHold: () => setHeldGame(game),
      }, reduced);
    }, arena);
    return () => media.revert();
  }, { scope: arena, dependencies: [game], revertOnUpdate: true });

  useGSAP(() => {
    if (!game || heldGame !== game || !upcoming || game.status !== "revealed") return;
    const left = arena.current?.querySelector<HTMLElement>('[data-side="left"]');
    const right = arena.current?.querySelector<HTMLElement>('[data-side="right"]');
    const incoming = arena.current?.querySelector<HTMLElement>('[data-side="incoming"]');
    if (!left || !right || !incoming) return;
    const media = gsap.matchMedia();
    media.add({ reduce: "(prefers-reduced-motion: reduce)", motion: "(prefers-reduced-motion: no-preference)" }, (context) => {
      const reduced = Boolean(context.conditions?.reduce);
      const from = right.getBoundingClientRect();
      const to = left.getBoundingClientRect();
      const width = arena.current!.getBoundingClientRect().width;
      const timeline = gsap.timeline({ defaults: { duration: reduced ? 0 : HIGHER_LOWER_MOTION.slide, ease: "power3.inOut" } });
      gsap.set([left, right, incoming], { willChange: "transform" });
      timeline.to(left, { x: -width }, 0)
        .to(right, { x: to.left - from.left, y: to.top - from.top }, 0)
        .fromTo(incoming, { x: width, visibility: "visible" }, { x: 0, visibility: "visible" }, 0)
        .to('[data-round-feedback]', { autoAlpha: 0, duration: reduced ? 0 : 0.15 }, 0)
        .call(commitNext);
    }, arena);
    return () => media.revert();
  }, { scope: arena, dependencies: [game, heldGame, upcoming, commitNext], revertOnUpdate: true });

  return { arena, revealed };
}
