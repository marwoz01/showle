"use client";

import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Clapperboard, Lightbulb, Sparkles, Trophy } from "lucide-react";
import { useTranslation } from "@/i18n";

interface Step {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const DESKTOP_POSITIONS = [
  "lg:right-[7%] lg:top-0 lg:rotate-[4deg]",
  "lg:left-[5%] lg:top-[145px] lg:-rotate-[5deg]",
  "lg:right-[9%] lg:top-[320px] lg:rotate-[5deg]",
  "lg:left-[14%] lg:top-[490px] lg:-rotate-[4deg]",
];

const MOBILE_POSITIONS = [
  "ml-auto rotate-[2deg]",
  "mr-auto -rotate-[2deg]",
  "ml-auto rotate-[2deg]",
  "mr-auto -rotate-[2deg]",
];

export default function HowItWorks() {
  const { t } = useTranslation();

  const steps: Step[] = [
    {
      number: "01",
      title: t.howItWorks.step1Title,
      description: t.howItWorks.step1Desc,
      icon: Clapperboard,
    },
    {
      number: "02",
      title: t.howItWorks.step2Title,
      description: t.howItWorks.step2Desc,
      icon: Lightbulb,
    },
    {
      number: "03",
      title: t.howItWorks.step3Title,
      description: t.howItWorks.step3Desc,
      icon: Sparkles,
    },
    {
      number: "04",
      title: t.howItWorks.step4Title,
      description: t.howItWorks.step4Desc,
      icon: Trophy,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-card px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      <div className="pointer-events-none absolute -right-28 top-12 h-80 w-80 rounded-full bg-accent-purple/12 blur-3xl" />

      <header className="relative z-10 max-w-xl">
        <span className="inline-flex rounded-full border border-accent-purple/25 bg-accent-purple/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-purple">
          {t.howItWorks.eyebrow}
        </span>
        <h2 className="mt-4 max-w-lg font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          {t.howItWorks.title}
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
          {t.howItWorks.subtitle}
        </p>
      </header>

      <div className="relative z-10 mt-12 flex flex-col gap-12 lg:mt-8 lg:block lg:h-[700px]">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
          viewBox="0 0 1000 700"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            className="how-path-flow"
            d="M825 30C710 115 390 76 210 180C65 265 435 286 770 355C935 390 705 475 300 535C420 625 620 615 785 655"
            stroke="rgb(124 77 255 / 55%)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="9 13"
          />
        </svg>
        <div className="pointer-events-none absolute bottom-8 left-1/2 top-8 border-l border-dashed border-accent-purple/35 lg:hidden" />

        {steps.map((step, index) => (
          <div
            key={step.number}
            className={`animate-how-step group relative w-[92%] max-w-sm transition-transform duration-500 hover:-translate-y-2 hover:rotate-0 lg:absolute lg:w-80 ${MOBILE_POSITIONS[index]} ${DESKTOP_POSITIONS[index]}`}
            style={{ "--step-delay": `${index * 130}ms` } as CSSProperties}
          >
            <div className="absolute inset-0 translate-x-2 translate-y-3 rotate-[-2deg] rounded-[1.65rem] border border-white/6 bg-white/4 transition-transform duration-500 group-hover:translate-y-4 group-hover:rotate-[-4deg]" />
            <article className="relative min-h-48 overflow-hidden rounded-[1.65rem] border border-white/12 bg-[#1b1b20]/95 p-6 pt-9 shadow-[0_24px_55px_rgba(0,0,0,.38)] backdrop-blur-xl">
              <span className="absolute left-1/2 top-3 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white/25 bg-[#2c2c32] shadow-[0_3px_8px_rgba(0,0,0,.7)]">
                <span className="absolute inset-0 rounded-full bg-accent-purple/45 motion-safe:animate-ping" />
              </span>

              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-sm font-bold tracking-[0.16em] text-accent-purple">
                  {step.number}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-muted transition-colors duration-300 group-hover:border-accent-purple/30 group-hover:bg-accent-purple/12 group-hover:text-accent-purple">
                  <step.icon size={17} />
                </span>
              </div>

              <h3 className="font-display text-lg font-bold text-foreground">
                {step.title}
              </h3>
              <div className="my-3 border-t border-dashed border-white/10" />
              <p className="text-sm leading-relaxed text-muted">
                {step.description}
              </p>
            </article>
          </div>
        ))}

        <div className="relative ml-auto mt-2 flex w-fit rotate-[-3deg] items-center gap-2 rounded-full border border-accent-purple/25 bg-accent-purple/10 px-4 py-2 text-sm font-semibold text-foreground lg:absolute lg:bottom-0 lg:right-[12%]">
          {t.howItWorks.ready}
          <ArrowUpRight size={16} className="text-accent-purple" />
        </div>
      </div>
    </section>
  );
}
