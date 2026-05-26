"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroReveal, HeroSlide } from "@/components/gsap-reveal";
import { lazy, Suspense } from "react";

const Grainient = lazy(() => import("@/components/grainient"));

/* ── Company data for vertical carousels ── */

const col1 = [
  { name: "Stripe", logo: "https://bookface-images.s3.amazonaws.com/small_logos/e5ccedd9995f6524b4a0379062eb67f7c991613e.png", summary: "Payments infrastructure for the internet", score: 94 },
  { name: "Airbnb", logo: "https://bookface-images.s3.amazonaws.com/small_logos/3e9a0092bee2ccf926e650e59c06503ec6b9ee65.png", summary: "Marketplace for unique stays and experiences", score: 87 },
  { name: "Retool", logo: "https://bookface-images.s3.amazonaws.com/small_logos/ecc14f4467de840a1f3cab7b6be0c2d1c0ab785c.png", summary: "Build internal tools remarkably fast", score: 91 },
  { name: "GitLab", logo: "https://bookface-images.s3.amazonaws.com/small_logos/af0d32f65e9007b7edbde422787633e338fa9bff.png", summary: "Complete DevOps platform in a single app", score: 89 },
  { name: "Gusto", logo: "https://bookface-images.s3.amazonaws.com/small_logos/6ce7845c2e268525f5f04915212ac0a106fb7e3d.png", summary: "Modern payroll, benefits, and HR", score: 78 },
  { name: "DoorDash", logo: "https://bookface-images.s3.amazonaws.com/small_logos/d13287c52acc96909f32342e85c26a33cfdac310.png", summary: "Local delivery for every merchant", score: 82 },
];

const col2 = [
  { name: "Supabase", logo: "https://bookface-images.s3.amazonaws.com/small_logos/9e8c106f46123a6f28b7a7da41f0ee695da48786.png", summary: "Open source Firebase alternative", score: 96 },
  { name: "Scale AI", logo: "https://bookface-images.s3.amazonaws.com/small_logos/8c45a78eb56f4a95e41a3a77960b00fdfb4cd918.png", summary: "Data platform for AI development", score: 90 },
  { name: "Coinbase", logo: "https://bookface-images.s3.amazonaws.com/small_logos/1169cb0b69fa7b338b5d51c2d3805f8f988bdfa5.png", summary: "The easiest place to buy and sell crypto", score: 85 },
  { name: "Brex", logo: "https://bookface-images.s3.amazonaws.com/small_logos/72237ca3782563f0b12ffe1fe9869d878c153ab6.png", summary: "Financial stack for growing companies", score: 83 },
  { name: "PostHog", logo: "https://bookface-images.s3.amazonaws.com/small_logos/7f1b6d1787ae32a7ebc0d417ec6fb8a204a3bbe9.png", summary: "Open source product analytics suite", score: 92 },
  { name: "Resend", logo: "https://bookface-images.s3.amazonaws.com/small_logos/6ae1f42156169b5811f9a7efe6cce76305167d38.png", summary: "Email for developers, built right", score: 88 },
];

const col3 = [
  { name: "Vanta", logo: "https://bookface-images.s3.amazonaws.com/small_logos/0660fb546ece5e50a895e790c299dcaaeeefad32.png", summary: "Automated security compliance", score: 93 },
  { name: "Webflow", logo: "https://bookface-images.s3.amazonaws.com/small_logos/c2275979b46d95062b78be0329b056f2290e3143.png", summary: "Visual web development platform", score: 86 },
  { name: "Deel", logo: "https://bookface-images.s3.amazonaws.com/small_logos/2b5c8a17f0ab4fa9a72447d94bc3194dc17fce9b.png", summary: "Global payroll and compliance", score: 84 },
  { name: "Instacart", logo: "https://bookface-images.s3.amazonaws.com/small_logos/9750fca21baaee75e035f1baaf58df8e2f5dcc67.png", summary: "Grocery delivery from local stores", score: 80 },
  { name: "Algolia", logo: "https://bookface-images.s3.amazonaws.com/small_logos/3957efb32806e40351fb432ce3c38ae6d22865b3.png", summary: "Search and discovery platform", score: 91 },
  { name: "Faire", logo: "https://bookface-images.s3.amazonaws.com/small_logos/3ccfa8cd66f2a1d09da157956ae8b5686f3b2fe5.png", summary: "Online wholesale marketplace", score: 77 },
];

const col4 = [
  { name: "Amplitude", logo: "https://bookface-images.s3.amazonaws.com/small_logos/fa98c8a53255b3fd2e9d4a65dbb47eec293729f1.png", summary: "Digital analytics for product teams", score: 88 },
  { name: "Hightouch", logo: "https://bookface-images.s3.amazonaws.com/small_logos/7426486d05ed170ed6c0370bb98b7114471ddc39.png", summary: "Reverse ETL for data activation", score: 85 },
  { name: "Mux", logo: "https://bookface-images.s3.amazonaws.com/small_logos/7f3a9eb63a2c18f13705cd10ff1859e90dbff5bb.png", summary: "Video infrastructure for developers", score: 92 },
  { name: "Fivetran", logo: "https://bookface-images.s3.amazonaws.com/small_logos/d6b5710a13038fe1daa1421a986e1f4a7839a65a.png", summary: "Automated data integration platform", score: 81 },
  { name: "Flexport", logo: "https://bookface-images.s3.amazonaws.com/small_logos/54997aad4067ac1994f422a49a5473fa603f5354.png", summary: "Modern freight forwarding and logistics", score: 79 },
  { name: "Ironclad", logo: "https://bookface-images.s3.amazonaws.com/small_logos/617ef74a3e62398db60a2179add2a7f75d8bbd18.png", summary: "Digital contracting platform", score: 87 },
];

function scoreColor(score: number) {
  if (score >= 90) return "text-green-300 bg-green-500/15 border-green-500/25";
  if (score >= 80) return "text-white bg-white/10 border-white/15";
  return "text-white/50 bg-white/5 border-white/10";
}

function CompanyTile({ c }: { c: { name: string; logo: string; summary: string; score: number } }) {
  return (
    <div className="w-full p-5 bg-white/[0.08] border border-white/[0.1] backdrop-blur-sm flex flex-col gap-4 flex-shrink-0">
      {/* Top row: logo + score */}
      <div className="flex items-start justify-between">
        <img
          src={c.logo}
          alt={c.name}
          width={48}
          height={48}
          className="w-12 h-12 object-contain"
          loading="lazy"
        />
        <div className={`text-xs font-bold px-2.5 py-1 border tabular-nums ${scoreColor(c.score)}`}>
          {c.score}
        </div>
      </div>
      {/* Name + summary */}
      <div>
        <h4 className="text-base font-semibold text-white">{c.name}</h4>
        <p className="text-sm text-white/45 mt-1 leading-relaxed">{c.summary}</p>
      </div>
    </div>
  );
}

function VerticalCarousel({ items, duration = 30, reverse = false, className = "" }: {
  items: { name: string; logo: string; summary: string; score: number }[];
  duration?: number;
  reverse?: boolean;
  className?: string;
}) {
  const doubled = [...items, ...items];

  return (
    <div className={`overflow-hidden relative ${className}`} style={{ height: "100vh" }}>
      {/* Fade masks */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#F26522] to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F26522] to-transparent z-10 pointer-events-none" />

      <div
        className={`flex flex-col gap-4 ${reverse ? "animate-scroll-down" : "animate-scroll-up"}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {doubled.map((c, i) => (
          <CompanyTile key={`${c.name}-${i}`} c={c} />
        ))}
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-[#F26522] h-screen">
      {/* Grainient at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[300px] z-0">
        <Suspense fallback={null}>
          <Grainient
            color1="#FFB070"
            color2="#FF9244"
            color3="#F26522"
            timeSpeed={0.2}
            warpFrequency={4}
            warpAmplitude={45}
            warpSpeed={1.8}
            grainAmount={0.07}
            contrast={1.4}
            noiseScale={1.8}
            rotationAmount={450}
            zoom={0.85}
          />
        </Suspense>
        <div className="absolute inset-0 bg-gradient-to-b from-[#F26522] to-transparent pointer-events-none" />
      </div>

      <div className="relative z-[2] h-full">
        <div className="max-w-[1400px] mx-auto h-full px-10 md:px-16 lg:px-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Left — Hero text */}
            <div className="lg:col-span-4 flex flex-col justify-center pt-32 pb-16">
              <HeroSlide direction="left" delay={0.15} distance={80}>
                <h1 className="text-[clamp(2.8rem,5.5vw,5.5rem)] font-bold tracking-[-0.04em] leading-[0.9] text-white">
                  Find work
                </h1>
              </HeroSlide>
              <HeroSlide direction="left" delay={0.3} distance={80}>
                <h1 className="text-[clamp(2.8rem,5.5vw,5.5rem)] font-bold tracking-[-0.04em] leading-[0.9] text-white mt-1">
                  that fits
                </h1>
              </HeroSlide>
              <HeroSlide direction="left" delay={0.45} distance={80}>
                <h1 className="text-[clamp(2.8rem,5.5vw,5.5rem)] font-bold tracking-[-0.04em] leading-[0.9] text-white/50 mt-1">
                  you.
                </h1>
              </HeroSlide>

              <HeroReveal delay={0.6} y={20} blur={6}>
                <p className="mt-8 text-lg text-white/70 leading-relaxed max-w-sm">
                  AI-powered matching with 500+ YC startups. Upload your resume, get a ranked shortlist of the companies that actually fit.
                </p>
              </HeroReveal>

              <HeroReveal delay={0.75} y={20} blur={6}>
                <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
                  <Link href="/login">
                    <Button
                      size="lg"
                      className="h-13 px-10 text-base font-semibold bg-white text-[#F26522] hover:bg-white/90 shadow-xl shadow-black/15 hover:scale-[1.02] transition-all duration-200"
                    >
                      Get started free
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-13 px-10 text-base border-white/30 text-white hover:bg-white/10 bg-transparent transition-all duration-200"
                    >
                      How it works
                    </Button>
                  </Link>
                </div>
              </HeroReveal>

              <HeroReveal delay={0.9} y={10} blur={4}>
                <div className="mt-6 flex items-center gap-5 text-sm text-white/50">
                  <span>Free forever</span>
                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                  <span>Google sign-in</span>
                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                  <span>2 min setup</span>
                </div>
              </HeroReveal>
            </div>

            {/* Right — 3 staggered vertical carousels filling full height */}
            <div className="lg:col-span-8 hidden lg:grid grid-cols-4 gap-3 pt-20 h-screen ml-8">
              <HeroReveal delay={0.2} y={0} blur={0}>
                <VerticalCarousel items={col1} duration={28} className="!h-[calc(100vh-80px)]" />
              </HeroReveal>
              <HeroReveal delay={0.35} y={0} blur={0}>
                <div className="pt-14">
                  <VerticalCarousel items={col2} duration={34} reverse className="!h-[calc(100vh-136px)]" />
                </div>
              </HeroReveal>
              <HeroReveal delay={0.5} y={0} blur={0}>
                <div className="pt-7">
                  <VerticalCarousel items={col3} duration={31} className="!h-[calc(100vh-108px)]" />
                </div>
              </HeroReveal>
              <HeroReveal delay={0.65} y={0} blur={0}>
                <div className="pt-20">
                  <VerticalCarousel items={col4} duration={26} reverse className="!h-[calc(100vh-160px)]" />
                </div>
              </HeroReveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
