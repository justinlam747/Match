"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SlideIn, ClipReveal } from "@/components/gsap-reveal";

export function LandingCta() {
  return (
    <section id="how-it-works" className="px-10 md:px-16 lg:px-24 pb-28">
      <div className="max-w-[1400px] mx-auto">
        <ClipReveal from="bottom" duration={1}>
          <div className="bg-foreground text-background p-12 sm:p-16 lg:p-24 rounded-3xl relative overflow-hidden">
            {/* Abstract decoration */}
            <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-primary/[0.08] to-transparent pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-primary/[0.06] blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-10 items-start">
              {/* Left — heading */}
              <div className="lg:col-span-7 space-y-8">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1]">
                  Set up your first
                  <br />
                  match <span className="inline-block w-12 h-12 bg-primary rounded-xl align-middle" />{" "}
                  in
                  <br />
                  minutes
                </h2>
                <p className="text-white/50 max-w-lg leading-relaxed text-xl">
                  AI-first matching platform. One place for resume scoring,
                  contact discovery, and outreach — without chaos.
                </p>
                <Link href="/login">
                  <Button
                    size="lg"
                    className="h-14 px-10 text-base font-semibold rounded-full bg-primary hover:bg-primary/90 mt-2 hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-primary/25"
                  >
                    Get started free
                  </Button>
                </Link>
              </div>

              {/* Right — steps, stacked with offset */}
              <div className="lg:col-span-5 space-y-5">
                {[
                  {
                    step: "01",
                    title: "Upload your resume",
                    desc: "AI extracts skills, experience & seniority from your PDF.",
                  },
                  {
                    step: "02",
                    title: "Get matched",
                    desc: "Scored against every startup on 4 dimensions.",
                  },
                  {
                    step: "03",
                    title: "Send cold emails",
                    desc: "Personalized, specific emails drafted and sent in bulk.",
                  },
                ].map((item, i) => (
                  <div
                    key={item.step}
                    className="flex gap-5 items-start p-5 bg-white/[0.04] border border-white/[0.06] rounded-xl"
                    style={{ marginLeft: `${i * 12}px` }}
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-white/[0.08] rounded-xl flex items-center justify-center text-sm font-bold text-primary">
                      {item.step}
                    </div>
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-sm text-white/40 mt-1">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ClipReveal>
      </div>
    </section>
  );
}
