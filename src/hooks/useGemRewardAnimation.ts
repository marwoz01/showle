"use client";

import type { RefObject } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useGemWallet } from "@/hooks/useGemWallet";
import type { GemTransaction } from "@/types/gems";

gsap.registerPlugin(useGSAP);

function visibleWalletIcon(): Element | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-gem-wallet-target]")).find((element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return rect.width > 0 && rect.height > 0 && x > 0 && x < window.innerWidth && y > 0 && y < window.innerHeight
      && element.contains(document.elementFromPoint(x, y));
  })?.querySelector("[data-gem-wallet-icon]") ?? undefined;
}

export function useGemRewardAnimation(
  root: RefObject<HTMLDivElement | null>, reward: GemTransaction, locale: string, onComplete: () => void,
) {
  const { beginReward, collectReward, finishReward } = useGemWallet();
  useGSAP((_context, contextSafe) => {
    const element = root.current;
    if (!element) return;
    if (!beginReward(reward.id)) { onComplete(); return; }
    const count = element.querySelector<HTMLElement>("[data-reward-count]")!;
    const counter = element.querySelector<HTMLElement>("[data-reward-counter]")!;
    const backdrop = element.querySelector<HTMLElement>("[data-reward-backdrop]")!;
    const particles = Array.from(element.querySelectorAll<HTMLElement>("[data-reward-particle]"));
    const format = new Intl.NumberFormat(locale);
    let target: Element | undefined;
    let destination = { x: 0, y: 0 };
    let collecting = false;
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      finishReward(reward.id);
      onComplete();
    };
    const timeline = gsap.timeline({ defaults: { ease: "power2.out" }, onComplete: finish });
    const cancel = contextSafe!(() => {
      timeline.kill();
      if (target) {
        gsap.killTweensOf(target);
        gsap.set(target, { clearProps: "transform" });
      }
      finish();
    });
    const collect = contextSafe!((index: number) => {
      const amount = Math.floor((index + 1) * reward.amount / particles.length) - Math.floor(index * reward.amount / particles.length);
      collectReward(reward.id, amount);
      if (target) gsap.fromTo(target, { scale: 1.45 }, { scale: 1, duration: 0.22, overwrite: "auto", clearProps: "transform" });
    });
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    gsap.set(element, { autoAlpha: 1 });
    if (reducedMotion.matches) {
      count.textContent = `+${format.format(reward.amount)}`;
      finishReward(reward.id);
      timeline.fromTo(counter, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 })
        .to(element, { autoAlpha: 0, duration: 0.2 }, "+=1.3");
    } else {
      const value = { amount: 0 };
      gsap.set(particles, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
      timeline.fromTo(backdrop, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0)
        .fromTo(counter, { autoAlpha: 0, scale: 0.8, y: 18 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.45, ease: "back.out(1.4)" }, 0)
        .to(value, { amount: reward.amount, duration: 1.3, ease: "power2.out", onUpdate: () => { count.textContent = `+${format.format(Math.round(value.amount))}`; } }, 0.1)
        .to(counter, { scale: 1.06, duration: 0.17, repeat: 1, yoyo: true }, 1.4)
        .addLabel("collect", 1.95)
        .call(() => {
          collecting = true;
          target = visibleWalletIcon();
          if (!target) { cancel(); return; }
          const rect = target.getBoundingClientRect();
          const source = element.getBoundingClientRect();
          destination = { x: rect.left + rect.width / 2 - source.width / 2, y: rect.top + rect.height / 2 - source.height / 2 };
        }, [], "collect")
        .to(counter, { autoAlpha: 0, scale: 0.9, duration: 0.22 }, "collect")
        .to(backdrop, { autoAlpha: 0, duration: 0.5 }, "collect");
      particles.forEach((particle, index) => {
        const angle = index * 2.4;
        const radius = 30 + index % 4 * 12;
        const start = 1.95 + index * 0.045;
        timeline.fromTo(particle, { x: 0, y: 0, autoAlpha: 0, scale: 0.4, rotation: 0 },
          { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, autoAlpha: 1, scale: 1, rotation: Math.cos(angle) * 25, duration: 0.2 }, start)
          .to(particle, { x: () => destination.x, y: () => destination.y, scale: 0.4, rotation: 0, duration: 0.7, ease: "power2.in", onComplete: () => collect(index) }, start + 0.2)
          .set(particle, { autoAlpha: 0 }, start + 0.9);
      });
      timeline.to({}, { duration: 0.25 });
    }
    const resize = () => { if (collecting) cancel(); };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    reducedMotion.addEventListener("change", cancel);
    return () => {
      ended = true;
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
      reducedMotion.removeEventListener("change", cancel);
      finishReward(reward.id);
    };
  }, { scope: root, dependencies: [reward.id, reward.amount, locale, beginReward, collectReward, finishReward, onComplete], revertOnUpdate: true });
}
