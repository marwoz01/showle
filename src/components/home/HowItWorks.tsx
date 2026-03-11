"use client";

import { useTranslation } from "@/i18n";
import { Target, Search, Lightbulb, Trophy } from "lucide-react";

export default function HowItWorks() {
  const { t } = useTranslation();

  const steps = [
    {
      step: "01",
      title: t.howItWorks.step1Title,
      description: t.howItWorks.step1Desc,
      icon: <Target size={20} />,
    },
    {
      step: "02",
      title: t.howItWorks.step2Title,
      description: t.howItWorks.step2Desc,
      icon: <Search size={20} />,
    },
    {
      step: "03",
      title: t.howItWorks.step3Title,
      description: t.howItWorks.step3Desc,
      icon: <Lightbulb size={20} />,
    },
    {
      step: "04",
      title: t.howItWorks.step4Title,
      description: t.howItWorks.step4Desc,
      icon: <Trophy size={20} />,
    },
  ];

  return (
    <section>
      <h2 className="mb-2 text-2xl font-semibold text-foreground">
        {t.howItWorks.title}
      </h2>
      <p className="mb-8 text-sm text-muted">{t.howItWorks.subtitle}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div
            key={step.step}
            className="rounded-2xl border border-white/6 bg-card p-5"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-muted">
              {step.icon}
            </div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent-purple">
              {step.step}
            </p>
            <h3 className="mb-2 text-base font-semibold text-foreground">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
