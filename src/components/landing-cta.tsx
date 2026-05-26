"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClipReveal } from "@/components/gsap-reveal";

export function LandingCta() {
  return (
    <section id="how-it-works" className="px-6 sm:px-10 md:px-16 lg:px-24 pb-28">
      <div className="max-w-[1400px] mx-auto">
        <ClipReveal from="bottom" duration={1}>
          <div className="bg-foreground text-background p-12 sm:p-16 lg:p-24 rounded-3xl relative overflow-hidden">
            {/* Abstract decoration */}
            <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-primary/[0.08] to-transparent pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-primary/[0.06] blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-10 items-start">
              {/* Left — heading */}
              <div className="lg:col-span-6 space-y-8">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1]">
                  Your YC
                  <br />
                  shortlist <span className="inline-block w-12 h-12 bg-primary rounded-xl align-middle" />{" "}
                  in
                  <br />
                  minutes.
                </h2>
                <p className="text-white/50 max-w-lg leading-relaxed text-xl">
                  Match scores your resume against all 3,900+ YC companies and ranks them by fit — turning a weekend of manual research into a couple of minutes.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/login">
                    <Button
                      size="lg"
                      className="h-14 px-10 text-base font-semibold rounded-full bg-primary hover:bg-primary/90 hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-primary/25"
                    >
                      Get started free
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    No credit card required
                  </div>
                </div>
              </div>

              {/* Right — steps */}
              <div className="lg:col-span-6 space-y-4">
                {[
                  {
                    step: "01",
                    title: "Upload your resume",
                    desc: "AI parses your PDF and extracts skills, experience, seniority, and standout signals.",
                  },
                  {
                    step: "02",
                    title: "Get matched with 3,900+ YC startups",
                    desc: "Scored on 8 dimensions: tech, industry, stage, hiring, compensation, culture, trajectory, and red flags.",
                  },
                  {
                    step: "03",
                    title: "Review your ranked shortlist",
                    desc: "Every company gets a 0-100 score, a letter grade, and a plain-English explanation. Export to CSV.",
                  },
                ].map((item, i) => (
                  <div
                    key={item.step}
                    className="flex gap-5 items-start p-5 bg-white/[0.04] border border-white/[0.06] rounded-xl"
                    style={{ marginLeft: `${i * 8}px` }}
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
