import gsap from "gsap";

export const HIGHER_LOWER_MOTION = { count: 1.9, hesitation: 0.22, hold: 0.65, slide: 0.65 };

interface Callbacks {
  onYear: (year: number) => void;
  onReveal: () => void;
  onHold: () => void;
}

export function addHigherLowerReveal(timeline: gsap.core.Timeline, year: number, callbacks: Callbacks, reduced: boolean) {
  const counter = { year: 0 };
  callbacks.onYear(reduced ? year : 0);
  if (!reduced) {
    timeline.to(counter, {
      year: year - 1, duration: HIGHER_LOWER_MOTION.count, ease: "power3.out",
      onUpdate: () => callbacks.onYear(Math.floor(counter.year)),
      onComplete: () => callbacks.onYear(year - 1),
    }).to({}, { duration: HIGHER_LOWER_MOTION.hesitation });
  }
  timeline.call(() => {
    callbacks.onYear(year);
    callbacks.onReveal();
  }).to({}, { duration: HIGHER_LOWER_MOTION.hold }).call(callbacks.onHold);
  return timeline;
}
