"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroReveal, HeroSlide } from "@/components/gsap-reveal";
import Avatar, { genConfig } from "react-nice-avatar";

function orangeAvatar(seed: string) {
  const c = genConfig(seed);
  return { ...c, bgColor: "#FF6600" };
}

const heroAvatars = [
  orangeAvatar("hero-1"), orangeAvatar("hero-2"), orangeAvatar("hero-3"),
  orangeAvatar("hero-4"), orangeAvatar("hero-5"), orangeAvatar("hero-6"),
  orangeAvatar("hero-7"), orangeAvatar("hero-8"), orangeAvatar("hero-9"),
];

/* ── Real YC companies with verified logo URLs ── */

const row1 = [
  { n: "Stripe", l: "https://bookface-images.s3.amazonaws.com/small_logos/e5ccedd9995f6524b4a0379062eb67f7c991613e.png" },
  { n: "Airbnb", l: "https://bookface-images.s3.amazonaws.com/small_logos/3e9a0092bee2ccf926e650e59c06503ec6b9ee65.png" },
  { n: "Coinbase", l: "https://bookface-images.s3.amazonaws.com/small_logos/1169cb0b69fa7b338b5d51c2d3805f8f988bdfa5.png" },
  { n: "DoorDash", l: "https://bookface-images.s3.amazonaws.com/small_logos/d13287c52acc96909f32342e85c26a33cfdac310.png" },
  { n: "Instacart", l: "https://bookface-images.s3.amazonaws.com/small_logos/9750fca21baaee75e035f1baaf58df8e2f5dcc67.png" },
  { n: "Dropbox", l: "https://bookface-images.s3.amazonaws.com/small_logos/f09464ae6ddf165ef871115af711c89d6530057f.png" },
  { n: "Twitch", l: "https://bookface-images.s3.amazonaws.com/small_logos/d0e24465d91469fa05da337659e25131f5295e3d.png" },
  { n: "Reddit", l: "https://bookface-images.s3.amazonaws.com/small_logos/2f5bed7ab9abb66ee8ccbf622c27a9d741c3c4e4.png" },
  { n: "Brex", l: "https://bookface-images.s3.amazonaws.com/small_logos/72237ca3782563f0b12ffe1fe9869d878c153ab6.png" },
  { n: "Retool", l: "https://bookface-images.s3.amazonaws.com/small_logos/ecc14f4467de840a1f3cab7b6be0c2d1c0ab785c.png" },
  { n: "Faire", l: "https://bookface-images.s3.amazonaws.com/small_logos/3ccfa8cd66f2a1d09da157956ae8b5686f3b2fe5.png" },
  { n: "Gusto", l: "https://bookface-images.s3.amazonaws.com/small_logos/6ce7845c2e268525f5f04915212ac0a106fb7e3d.png" },
  { n: "Webflow", l: "https://bookface-images.s3.amazonaws.com/small_logos/c2275979b46d95062b78be0329b056f2290e3143.png" },
  { n: "GitLab", l: "https://bookface-images.s3.amazonaws.com/small_logos/af0d32f65e9007b7edbde422787633e338fa9bff.png" },
  { n: "Rappi", l: "https://bookface-images.s3.amazonaws.com/small_logos/44285cf605c3f1d288f2fb7c2f002f859ab92d0b.png" },
  { n: "Amplitude", l: "https://bookface-images.s3.amazonaws.com/small_logos/fa98c8a53255b3fd2e9d4a65dbb47eec293729f1.png" },
];

const row2 = [
  { n: "Zip", l: "https://bookface-images.s3.amazonaws.com/small_logos/1927688a0e9eda1caab52b030e0c7e5dd379fa2d.png" },
  { n: "Deel", l: "https://bookface-images.s3.amazonaws.com/small_logos/2b5c8a17f0ab4fa9a72447d94bc3194dc17fce9b.png" },
  { n: "Zepto", l: "https://bookface-images.s3.amazonaws.com/small_logos/b419835c59c3d3a4db7e0aaf094b54bb5cee0adb.png" },
  { n: "Ironclad", l: "https://bookface-images.s3.amazonaws.com/small_logos/617ef74a3e62398db60a2179add2a7f75d8bbd18.png" },
  { n: "Razorpay", l: "https://bookface-images.s3.amazonaws.com/small_logos/b6a6aaf9a84fa4b38b5d51c2d3805f8f988bdfa5.png" },
  { n: "Mux", l: "https://bookface-images.s3.amazonaws.com/small_logos/7f3a9eb63a2c18f13705cd10ff1859e90dbff5bb.png" },
  { n: "PostHog", l: "https://bookface-images.s3.amazonaws.com/small_logos/7f1b6d1787ae32a7ebc0d417ec6fb8a204a3bbe9.png" },
  { n: "Supabase", l: "https://bookface-images.s3.amazonaws.com/small_logos/9e8c106f46123a6f28b7a7da41f0ee695da48786.png" },
  { n: "Resend", l: "https://bookface-images.s3.amazonaws.com/small_logos/6ae1f42156169b5811f9a7efe6cce76305167d38.png" },
  { n: "Vanta", l: "https://bookface-images.s3.amazonaws.com/small_logos/0660fb546ece5e50a895e790c299dcaaeeefad32.png" },
  { n: "Fivetran", l: "https://bookface-images.s3.amazonaws.com/small_logos/d6b5710a13038fe1daa1421a986e1f4a7839a65a.png" },
  { n: "Algolia", l: "https://bookface-images.s3.amazonaws.com/small_logos/3957efb32806e40351fb432ce3c38ae6d22865b3.png" },
  { n: "Convoy", l: "https://bookface-images.s3.amazonaws.com/small_logos/2ef5e56e5aadbe1bd56567cef7d719b7f1e4c6b7.png" },
  { n: "Groww", l: "https://bookface-images.s3.amazonaws.com/small_logos/0ae62cb1672e8223d9b0ae2e5b7ecde4ae763c5e.png" },
  { n: "Hightouch", l: "https://bookface-images.s3.amazonaws.com/small_logos/7426486d05ed170ed6c0370bb98b7114471ddc39.png" },
  { n: "Scale AI", l: "https://bookface-images.s3.amazonaws.com/small_logos/8c45a78eb56f4a95e41a3a77960b00fdfb4cd918.png" },
];

const row3 = [
  { n: "Segment", l: "https://bookface-images.s3.amazonaws.com/small_logos/99f5abd1f15fa4ca4394b5781c98d8ff23db6f7b.png" },
  { n: "Zapier", l: "https://bookface-images.s3.amazonaws.com/small_logos/59fbaea3a4a565dd0eb1b1228ea2d6fd35e22ad8.png" },
  { n: "Docker", l: "https://bookface-images.s3.amazonaws.com/small_logos/8f74c3796e1b7675bab6c99118bcf9dd7b94ceec.png" },
  { n: "PagerDuty", l: "https://bookface-images.s3.amazonaws.com/small_logos/18fd6f870541d2398827dedc9e57678e8770c424.png" },
  { n: "Optimizely", l: "https://bookface-images.s3.amazonaws.com/small_logos/0d8d48fc3d7aa043a1e1d86d30f84a388f342454.png" },
  { n: "Mixpanel", l: "https://bookface-images.s3.amazonaws.com/small_logos/de2e1c705cd83dd0add15fd23dbc3d1818388b84.png" },
  { n: "Lattice", l: "https://bookface-images.s3.amazonaws.com/small_logos/a3bbe5d7f8ca797e1e542c827ac00dda238b0b81.png" },
  { n: "Benchling", l: "https://bookface-images.s3.amazonaws.com/small_logos/56dfbb621883fb62890bd66d7bd967984b974c12.png" },
  { n: "OpenSea", l: "https://bookface-images.s3.amazonaws.com/small_logos/be12a7a3bea106077960a6e544db5840291bb150.png" },
  { n: "Flexport", l: "https://bookface-images.s3.amazonaws.com/small_logos/54997aad4067ac1994f422a49a5473fa603f5354.png" },
  { n: "Matterport", l: "https://bookface-images.s3.amazonaws.com/small_logos/b271a79c3b59d6344c90e2803525a22f2a5e8406.png" },
  { n: "Podium", l: "https://bookface-images.s3.amazonaws.com/small_logos/d90bc164db5dd25a81e6dcfa222470eadf2c783a.png" },
  { n: "Stripe", l: "https://bookface-images.s3.amazonaws.com/small_logos/e5ccedd9995f6524b4a0379062eb67f7c991613e.png" },
  { n: "Airbnb", l: "https://bookface-images.s3.amazonaws.com/small_logos/3e9a0092bee2ccf926e650e59c06503ec6b9ee65.png" },
  { n: "Coinbase", l: "https://bookface-images.s3.amazonaws.com/small_logos/1169cb0b69fa7b338b5d51c2d3805f8f988bdfa5.png" },
  { n: "DoorDash", l: "https://bookface-images.s3.amazonaws.com/small_logos/d13287c52acc96909f32342e85c26a33cfdac310.png" },
];

function CompanyPill({ c }: { c: { n: string; l: string } }) {
  return (
    <div className="flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2 bg-white/[0.1] border border-white/[0.08] hover:bg-white/[0.16] transition-colors">
      <img
        src={c.l}
        alt={c.n}
        width={20}
        height={20}
        className="w-5 h-5 object-contain"
        loading="lazy"
      />
      <span className="text-white/70 text-xs font-medium whitespace-nowrap">
        {c.n}
      </span>
    </div>
  );
}

function Ticker({
  companies,
  duration = 40,
  reverse = false,
}: {
  companies: { n: string; l: string }[];
  duration?: number;
  reverse?: boolean;
}) {
  return (
    <div className="overflow-hidden">
      <div
        className={`flex gap-2 w-max ${reverse ? "animate-scroll-right" : "animate-scroll-left"}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {/* Render the set twice for seamless loop */}
        {companies.map((c, i) => (
          <CompanyPill key={`a-${i}`} c={c} />
        ))}
        {companies.map((c, i) => (
          <CompanyPill key={`b-${i}`} c={c} />
        ))}
      </div>
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-[#FF6600]">
      {/* Abstract gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FF6600] via-[#FF8533] to-[#E55C00]" />
      <div className="absolute top-0 right-0 w-[60%] h-[70%] bg-gradient-to-bl from-black/[0.15] to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[50%] bg-gradient-to-tr from-black/[0.1] to-transparent pointer-events-none" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative px-10 md:px-16 lg:px-24 pt-32 pb-20">
        <div className="max-w-[1400px] mx-auto">
          {/* Batch badge */}
          <HeroSlide direction="left" delay={0.1}>
            <div className="inline-flex items-center gap-2.5 bg-white/[0.15] border border-white/[0.1] px-5 py-2 text-xs text-white/90 font-medium mb-10">
              <span className="w-1.5 h-1.5 bg-white animate-pulse" />
              W25 Demo Day &middot; 300+ new companies
            </div>
          </HeroSlide>

          {/* Headline + 2×2 portrait grid side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — text */}
            <div className="font-sans">
              <HeroSlide direction="left" delay={0.15} distance={100}>
                <h1 className="text-[clamp(2.8rem,5.5vw,5.5rem)] font-bold tracking-[-0.04em] leading-[0.88] text-white">
                  Your resume.
                </h1>
              </HeroSlide>
              <HeroSlide direction="left" delay={0.3} distance={100}>
                <h1 className="text-[clamp(2.8rem,5.5vw,5.5rem)] font-bold tracking-[-0.04em] leading-[0.88] text-white mt-3">
                  500+ YC startups.
                </h1>
              </HeroSlide>
              <HeroSlide direction="left" delay={0.45} distance={100}>
                <h1 className="text-[clamp(2.8rem,5.5vw,5.5rem)] font-bold tracking-[-0.04em] leading-[0.88] text-white/30 mt-3">
                  One cold email away.
                </h1>
              </HeroSlide>
              <HeroSlide direction="left" delay={0.55} distance={60}>
                <p className="mt-8 text-lg text-white/60 leading-relaxed max-w-lg font-normal">
                  Upload your resume, get AI-scored against every company from
                  W25, S24 &amp; W24. Find the founders, write the email, land
                  the interview.
                </p>
              </HeroSlide>
            </div>

            {/* Right — large 2×2 rounded-square portrait grid */}
            <div className="flex justify-center lg:justify-end">
              <HeroReveal delay={0.5} y={40} blur={10}>
                <div className="grid grid-cols-2 gap-4 w-[320px] sm:w-[400px] lg:w-[460px]">
                  {heroAvatars.slice(0, 4).map((c, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-[#FF6600] overflow-hidden rounded-[24px] border-[3px] border-white/20 shadow-xl shadow-black/15"
                    >
                      <Avatar
                        className="w-full h-full"
                        {...c}
                        style={{ width: "100%", height: "100%" }}
                      />
                    </div>
                  ))}
                </div>
              </HeroReveal>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-14 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <HeroSlide direction="left" delay={0.7}>
              <Link href="/login">
                <Button
                  size="lg"
                  className="h-14 px-10 text-sm font-semibold rounded-none bg-white text-[#FF6600] hover:bg-white/90 shadow-lg shadow-black/10"
                >
                  Match me with YC companies
                </Button>
              </Link>
            </HeroSlide>
            <HeroSlide direction="left" delay={0.8}>
              <Link href="#features">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 px-10 text-sm rounded-none border-white/30 text-white hover:bg-white/10 bg-transparent"
                >
                  See how it works
                </Button>
              </Link>
            </HeroSlide>
            <HeroSlide direction="right" delay={0.9}>
              <span className="text-xs text-white/50 ml-2 font-sans">
                Free &middot; Google sign-in &middot; No spam
              </span>
            </HeroSlide>
          </div>

          {/* Social proof + stats */}
          <HeroReveal delay={0.9} y={20} blur={6}>
            <div className="mt-20 flex flex-wrap items-center gap-10 lg:gap-16 font-sans">
              {/* Avatar stack */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {heroAvatars.map((c, i) => (
                    <Avatar key={i} className="w-9 h-9 border-2 border-[#FF6600]" {...c} />
                  ))}
                </div>
                <div className="text-xs text-white/60 leading-tight">
                  <span className="text-white font-semibold">127 people</span>
                  <br />matched this week
                </div>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px h-10 bg-white/15" />

              {/* Stats */}
              {[
                { value: "3", label: "YC batches" },
                { value: "500+", label: "startups" },
                { value: "W25", label: "latest batch" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    {s.value}
                  </div>
                  <div className="text-xs text-white/50 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </HeroReveal>
        </div>
      </div>

      {/* ── Company logo ticker marquees — true infinite CSS scroll ── */}
      <div className="relative pb-14 pt-8 space-y-2">
        <HeroReveal delay={1} y={0} blur={0}>
          <Ticker companies={row1} duration={45} />
        </HeroReveal>
        <HeroReveal delay={1.1} y={0} blur={0}>
          <Ticker companies={row2} duration={50} reverse />
        </HeroReveal>
        <HeroReveal delay={1.2} y={0} blur={0}>
          <Ticker companies={row3} duration={55} />
        </HeroReveal>
      </div>
    </section>
  );
}
