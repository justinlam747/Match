"use client";

import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Avatar, { genConfig } from "react-nice-avatar";
import type { AvatarFullConfig } from "react-nice-avatar";
import {
  SlideIn,
  ClipReveal,
  StaggerReveal,
  RevealChild,
} from "@/components/gsap-reveal";
import {
  Settings,
  MessageSquare,
  Target,
  Handshake,
  BarChart3,
  Search,
  PenLine,
  Send,
  CheckCircle,
} from "lucide-react";

const Grainient = lazy(() => import("@/components/grainient"));

gsap.registerPlugin(ScrollTrigger);

const RESUME_SKILLS = ["React / Next.js", "TypeScript", "PostgreSQL", "AWS", "Python", "Docker"];

/* ── Deterministic avatar configs — all orange bg ── */
function orangeAvatar(seed: string) {
  const c = genConfig(seed);
  return { ...c, bgColor: "#F26522" };
}

const avatarConfigs: AvatarFullConfig[] = [
  orangeAvatar("alex-chen-ceo"),
  orangeAvatar("sarah-kim-cto"),
  orangeAvatar("james-wu-eng"),
  orangeAvatar("maria-lopez-hr"),
  orangeAvatar("david-park-cfo"),
  orangeAvatar("lisa-nguyen-pm"),
  orangeAvatar("omar-hassan-swe"),
  orangeAvatar("priya-sharma-ds"),
  orangeAvatar("jake-miller-dev"),
  orangeAvatar("emma-jones-ops"),
];

/* ── Grainient presets ── */
const GBg = {
  orangeDeep: { color1: "#F26522", color2: "#E55C00", color3: "#1a0a00" },
  orangeWarm: { color1: "#FF8533", color2: "#F26522", color3: "#2a1000" },
  orangeEmber: { color1: "#F26522", color2: "#CC4400", color3: "#0d0d0d" },
  darkFire: { color1: "#FF6B35", color2: "#F26522", color3: "#111111" },
  sunset: { color1: "#FF9955", color2: "#F26522", color3: "#1a0800" },
};

function GrainBg({ preset, className = "" }: { preset: keyof typeof GBg; className?: string }) {
  const p = GBg[preset];
  return (
    <Suspense fallback={null}>
      <Grainient
        color1={p.color1}
        color2={p.color2}
        color3={p.color3}
        timeSpeed={0.15}
        warpFrequency={3}
        warpAmplitude={60}
        warpSpeed={1.5}
        grainAmount={0.08}
        contrast={1.3}
        noiseScale={1.5}
        rotationAmount={400}
        className={className}
      />
    </Suspense>
  );
}

/* ═══════════════════════════════════════════════
   Bento cards
   ═══════════════════════════════════════════════ */

/* ── Step 1: Resume Upload — drag-and-drop dashboard mockup ── */
function ResumeCard() {
  const skills = RESUME_SKILLS;
  // phase: "idle" → "dragging" → "dropping" → "parsing" → "done"
  const [phase, setPhase] = useState<"idle" | "dragging" | "dropping" | "parsing" | "done">("idle");
  const [parsedCount, setParsedCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const runAnimation = useCallback(function runAnimation() {
    clearTimers();
    // Reset to idle — the crossfade (700ms) will smoothly show the drop zone again
    setPhase("idle");
    setParsedCount(0);

    // Wait for the fade-back to complete before starting drag
    const t1 = setTimeout(() => setPhase("dragging"), 1200);
    const t2 = setTimeout(() => setPhase("dropping"), 2800);
    const t3 = setTimeout(() => setPhase("parsing"), 3500);
    const skillTimers: ReturnType<typeof setTimeout>[] = [];
    skills.forEach((_, i) => {
      const st = setTimeout(() => setParsedCount(i + 1), 3900 + i * 350);
      skillTimers.push(st);
    });
    const t4 = setTimeout(() => setPhase("done"), 3900 + skills.length * 350 + 300);
    // Linger on done, then loop
    const t5 = setTimeout(() => runAnimation(), 3900 + skills.length * 350 + 4500);

    timers.current.push(t1, t2, t3, ...skillTimers, t4, t5);
  }, [clearTimers]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => { if (!started.current) { started.current = true; runAnimation(); } },
    });
    return () => { st.kill(); clearTimers(); };
  }, [runAnimation, clearTimers]);

  const isHovering = phase === "dropping";
  const showParsed = phase === "parsing" || phase === "done";

  return (
    <div ref={ref} className="relative p-6 rounded-2xl h-full flex flex-col overflow-hidden bg-foreground text-background">
      <div className="relative z-10 mb-4">
        <div className="text-xs text-white/50 uppercase tracking-widest mb-1">Step 1</div>
        <h3 className="text-sm font-semibold text-white">Upload your resume</h3>
      </div>

      <div className="relative z-10 flex-1">
        {/* Layer 1: Drop zone — fades out when parsing starts */}
        <div
          className="absolute inset-0 flex flex-col transition-all duration-700 ease-in-out"
          style={{
            opacity: showParsed ? 0 : 1,
            transform: showParsed ? "scale(0.96)" : "scale(1)",
            pointerEvents: showParsed ? "none" : "auto",
          }}
        >
          <div className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-500 ${
            isHovering ? "border-primary bg-primary/10 scale-[1.02]" : "border-white/15 bg-white/[0.03]"
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
              isHovering ? "bg-primary/20" : "bg-white/10"
            }`}>
              <svg className={`w-5 h-5 transition-colors duration-300 ${isHovering ? "text-primary" : "text-white/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-white/70">Drop a PDF here</p>
              <p className="text-[10px] text-white/30 mt-0.5">PDF only, max 10 MB</p>
            </div>
          </div>
        </div>

        {/* Layer 2: Parsed results — fades in when parsing starts */}
        <div
          className="absolute inset-0 flex flex-col transition-all duration-700 ease-in-out"
          style={{
            opacity: showParsed ? 1 : 0,
            transform: showParsed ? "translateY(0)" : "translateY(12px)",
            pointerEvents: showParsed ? "auto" : "none",
          }}
        >
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
              <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white/80 truncate">resume_2025.pdf</div>
                <div className="text-[10px] text-white/40">Senior · 4y exp</div>
              </div>
              <svg
                className="w-4 h-4 text-green-400 flex-shrink-0 transition-opacity duration-500"
                style={{ opacity: phase === "done" ? 1 : 0 }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {skills.map((skill, i) => (
              <div
                key={skill}
                className="flex items-center justify-between transition-all duration-500 ease-out"
                style={{ opacity: i < parsedCount ? 1 : 0, transform: i < parsedCount ? "translateY(0)" : "translateY(8px)" }}
              >
                <span className="text-xs text-white/60">{skill}</span>
                <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded-full transition-all duration-700 ease-out"
                    style={{ width: i < parsedCount ? `${65 + i * 5}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Animated cursor + file — crossfades out */}
        <div
          className="absolute z-20 pointer-events-none transition-all ease-in-out"
          style={{
            top: phase === "dropping" ? "45%" : phase === "dragging" ? "15%" : "10%",
            right: phase === "dropping" ? "40%" : phase === "dragging" ? "8%" : "12%",
            opacity: (phase === "dragging" || phase === "dropping") ? 1 : 0,
            transitionDuration: phase === "dropping" ? "1400ms" : "600ms",
          }}
        >
          {/* File chip */}
          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-1.5 shadow-xl">
            <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="text-[11px] font-medium text-white whitespace-nowrap">resume_2025.pdf</span>
          </div>
          {/* Cursor */}
          <svg className="w-4 h-4 text-white absolute -bottom-3 -right-1 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.65 3.15l3.29 16.44 3.04-5.86 6.37-.71z" />
          </svg>
        </div>
      </div>

      <div className="relative z-10 mt-3 text-xs text-white/40 transition-opacity duration-500" key={phase === "done" ? "done" : phase === "parsing" ? "parsing" : "idle"}>
        {phase === "done" ? `${skills.length} skills extracted` : phase === "parsing" ? `Scanning... ${parsedCount}/${skills.length}` : "Drag & drop your resume"}
      </div>
    </div>
  );
}

/* ── 500+ Counter ── */
function CounterCard() {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => {
        const obj = { val: 0 };
        gsap.to(obj, { val: 500, duration: 2, ease: "power2.out", onUpdate: () => setCount(Math.round(obj.val)) });
      },
    });
    return () => { st.kill(); };
  }, []);

  return (
    <div ref={ref} className="relative p-8 text-white rounded-2xl h-full flex flex-col justify-between overflow-hidden">
      <GrainBg preset="orangeWarm" />
      <div className="relative z-10">
        <span className="text-7xl sm:text-8xl font-bold tracking-tight">{count}+</span>
      </div>
      <div className="relative z-10">
        <div className="flex -space-x-2 mb-3">
          {avatarConfigs.slice(0, 5).map((c, i) => (
            <Avatar key={i} className="w-7 h-7 border-2 border-white/20" {...c} />
          ))}
          <div className="w-7 h-7 border-2 border-white/20 bg-white/20 rounded-full flex items-center justify-center text-[9px] font-bold">
            +42
          </div>
        </div>
        <div className="text-sm font-medium">YC startups indexed</div>
        <div className="text-xs text-white/60 mt-1">W24, S24, W25 batches and growing</div>
      </div>
    </div>
  );
}

/* ── Step 2: Match Scoring — company tiles like the real app ── */
const mockCompanies = [
  { name: "Supabase", logo: "https://bookface-images.s3.amazonaws.com/small_logos/9e8c106f46123a6f28b7a7da41f0ee695da48786.png", desc: "Open source Firebase alternative", batch: "S20", industries: ["Developer Tools", "Infrastructure"], score: 96, hiring: true },
  { name: "Retool", logo: "https://bookface-images.s3.amazonaws.com/small_logos/ecc14f4467de840a1f3cab7b6be0c2d1c0ab785c.png", desc: "Build internal tools remarkably fast", batch: "W17", industries: ["Developer Tools", "SaaS"], score: 91, hiring: true },
  { name: "Vanta", logo: "https://bookface-images.s3.amazonaws.com/small_logos/0660fb546ece5e50a895e790c299dcaaeeefad32.png", desc: "Automated security compliance", batch: "W18", industries: ["Security", "Compliance"], score: 88, hiring: false },
  { name: "Scale AI", logo: "https://bookface-images.s3.amazonaws.com/small_logos/8c45a78eb56f4a95e41a3a77960b00fdfb4cd918.png", desc: "Data platform for AI development", batch: "S16", industries: ["AI", "Data"], score: 85, hiring: true },
  { name: "PostHog", logo: "https://bookface-images.s3.amazonaws.com/small_logos/7f1b6d1787ae32a7ebc0d417ec6fb8a204a3bbe9.png", desc: "Open source product analytics", batch: "W20", industries: ["Analytics", "Developer Tools"], score: 82, hiring: false },
  { name: "Resend", logo: "https://bookface-images.s3.amazonaws.com/small_logos/6ae1f42156169b5811f9a7efe6cce76305167d38.png", desc: "Email for developers, built right", batch: "W23", industries: ["Developer Tools", "Email"], score: 79, hiring: true },
];

function MatchScoreCard() {
  const [revealed, setRevealed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const runCycle = useCallback(function runCycle() {
    clearTimers();
    // Reset to 0 — tiles fade back to unscored (500ms CSS transition)
    setRevealed(0);
    // Wait for fade-out, then reveal one by one
    mockCompanies.forEach((_, i) => {
      const t = setTimeout(() => setRevealed(i + 1), 1000 + i * 500);
      timers.current.push(t);
    });
    // Linger on all-scored, then loop
    const restartT = setTimeout(() => runCycle(), 1000 + mockCompanies.length * 500 + 4500);
    timers.current.push(restartT);
  }, [clearTimers]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => { if (!started.current) { started.current = true; runCycle(); } },
    });
    return () => { st.kill(); clearTimers(); };
  }, [runCycle, clearTimers]);

  function tileScoreColor(score: number) {
    if (score >= 90) return "text-green-400 bg-green-500/15 border-green-500/25";
    if (score >= 80) return "text-primary bg-primary/15 border-primary/25";
    return "text-white/60 bg-white/10 border-white/15";
  }

  return (
    <div ref={ref} className="relative p-6 rounded-2xl h-full flex flex-col overflow-hidden bg-foreground text-background">
      <div className="relative z-10 mb-4">
        <div className="text-xs text-white/50 uppercase tracking-widest mb-1">Step 2</div>
        <h3 className="text-sm font-semibold text-white">AI match scoring</h3>
        <p className="text-[10px] text-white/30 mt-1">{revealed} of {mockCompanies.length} companies scored</p>
      </div>

      {/* Company tiles grid — mimics the real matches page */}
      <div className="relative z-10 flex-1 grid grid-cols-2 gap-2 content-start">
        {mockCompanies.map((c, i) => (
          <div
            key={c.name}
            className={`p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl transition-all duration-500 ${
              i < revealed ? "ring-1 ring-primary/20" : ""
            }`}
            style={{
              opacity: i < revealed ? 1 : 0.15,
              transform: i < revealed ? "scale(1)" : "scale(0.97)",
            }}
          >
            {/* Header: logo + score */}
            <div className="flex items-start justify-between mb-2">
              <img src={c.logo} alt={c.name} className="w-7 h-7 rounded object-contain bg-white/10" loading="lazy" />
              <div className={`text-[10px] font-bold px-1.5 py-0.5 border rounded tabular-nums transition-all duration-700 ${
                i < revealed ? tileScoreColor(c.score) : "text-white/20 bg-white/5 border-white/10"
              }`}>
                {i < revealed ? c.score : "—"}
              </div>
            </div>
            {/* Name + meta */}
            <div className="text-xs font-medium text-white/80 flex items-center gap-1.5">
              {c.name}
              {c.hiring && i < revealed && <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />}
            </div>
            <p className="text-[10px] text-white/35 mt-0.5 line-clamp-1">{c.desc}</p>
            {/* Tags */}
            <div className="flex gap-1 mt-1.5">
              {c.industries.slice(0, 1).map((ind) => (
                <span key={ind} className="text-[9px] px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded text-white/40">{ind}</span>
              ))}
              <span className="text-[9px] px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded text-white/40">{c.batch}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-3 text-xs text-white/40">
        {revealed >= mockCompanies.length ? "All companies scored" : "Scoring matches..."}
      </div>
    </div>
  );
}

/* ── Step 3: Contact Discovery ── */
function ContactCard() {
  const contacts = [
    { role: "CEO", name: "Alex Chen", ai: 0 },
    { role: "CTO", name: "Sarah Kim", ai: 1 },
    { role: "VP Eng", name: "James Wu", ai: 2 },
    { role: "Hiring", name: "Maria Lopez", ai: 3 },
  ];
  const [revealed, setRevealed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const runReveal = useCallback(() => {
    clearTimers();
    let i = 0;
    setRevealed(0);
    const iv = setInterval(() => {
      i++;
      setRevealed(i);
      if (i >= contacts.length) {
        clearInterval(iv);
        const t = setTimeout(() => runReveal(), 4000);
        timers.current.push(t);
      }
    }, 500);
    timers.current.push(iv as unknown as ReturnType<typeof setTimeout>);
  }, [contacts.length, clearTimers]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => { if (!started.current) { started.current = true; runReveal(); } },
    });
    return () => { st.kill(); clearTimers(); };
  }, [runReveal, clearTimers]);

  return (
    <div ref={ref} className="relative p-8 rounded-2xl h-full flex flex-col overflow-hidden bg-foreground text-background">
      <div className="relative z-10 text-xs text-white/50 uppercase tracking-widest mb-1">Step 3</div>
      <h3 className="relative z-10 text-sm font-semibold text-white mb-5">Find decision makers</h3>
      <div className="relative z-10 flex-1 space-y-3">
        {contacts.map((c, i) => (
          <div
            key={c.name}
            className="flex items-center gap-3 p-3 bg-white/[0.04] border border-white/[0.06] rounded-xl transition-all duration-500"
            style={{ opacity: i < revealed ? 1 : 0, transform: i < revealed ? "translateY(0)" : "translateY(12px)" }}
          >
            <Avatar className="w-8 h-8 flex-shrink-0" {...avatarConfigs[c.ai]} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white/80 truncate">{c.name}</div>
              <div className="text-xs text-white/40">{c.role}</div>
            </div>
            <div className="w-2 h-2 bg-green-400/60 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
      <div className="relative z-10 mt-4 text-xs text-white/40">
        {revealed >= contacts.length ? `${contacts.length} contacts found` : `Searching... ${revealed}/${contacts.length}`}
      </div>
    </div>
  );
}

/* ── Step 4: Email Drafting ── */
function EmailCard() {
  const fullText = "Hi Alex, I noticed Acme is building real-time collab with Next.js \u2014 I've spent 3 years doing exactly that...";
  const [typed, setTyped] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const runTyping = useCallback(() => {
    clearTimers();
    let i = 0;
    setTyped("");
    const iv = setInterval(() => {
      i++;
      setTyped(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(iv);
        const t = setTimeout(() => runTyping(), 5000);
        timers.current.push(t);
      }
    }, 30);
    timers.current.push(iv as unknown as ReturnType<typeof setTimeout>);
  }, [fullText, clearTimers]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => { if (!started.current) { started.current = true; runTyping(); } },
    });
    return () => { st.kill(); clearTimers(); };
  }, [runTyping, clearTimers]);

  return (
    <div ref={ref} className="relative p-8 rounded-2xl h-full flex flex-col overflow-hidden bg-foreground text-background">
      <div className="relative z-10 flex items-center gap-3 mb-5">
        <Avatar className="w-8 h-8" {...avatarConfigs[0]} />
        <div>
          <div className="text-xs text-white/50 uppercase tracking-widest">Step 4</div>
          <h3 className="text-sm font-semibold text-white">AI-drafted cold emails</h3>
        </div>
      </div>
      <div className="relative z-10 flex-1 space-y-3">
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span>To:</span><span className="text-white/60">founder@acme.com</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span>Re:</span><span className="text-white/60">Senior Frontend Engineer</span>
        </div>
        <div className="h-px bg-white/10 my-2" />
        <p className="text-sm text-white/60 leading-relaxed min-h-[80px]">
          {typed}
          <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />
        </p>
      </div>
      <div className="relative z-10 mt-4 flex gap-2">
        <div className="px-4 py-1.5 bg-primary rounded-lg text-xs font-medium text-white">Send</div>
        <div className="px-4 py-1.5 bg-white/10 rounded-lg text-xs font-medium text-white/60">Edit</div>
        <div className="px-4 py-1.5 bg-white/10 rounded-lg text-xs font-medium text-white/60">Regenerate</div>
      </div>
    </div>
  );
}

/* ── Step 5: Send & Track ── */
function SendQueueCard() {
  const allStatuses = [
    { company: "Acme Corp", status: "replied", ai: 4 },
    { company: "Quantum AI", status: "opened", ai: 5 },
    { company: "NovaPay", status: "delivered", ai: 8 },
    { company: "CloudBase", status: "queued", ai: 9 },
  ];
  const statusOrder = ["queued", "delivered", "opened", "replied"];
  const colors: Record<string, string> = { delivered: "bg-blue-400", opened: "bg-yellow-400", replied: "bg-green-400", queued: "bg-white/20" };
  const [statuses, setStatuses] = useState(allStatuses.map((s) => ({ ...s, current: "queued" })));
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const runCycle = useCallback(function runCycle() {
    clearTimers();
    let step = 0;
    const maxSteps = allStatuses.length * statusOrder.length;
    const iv = setInterval(() => {
      step++;
      setStatuses((prev) =>
        prev.map((s, i) => {
          const targetIdx = statusOrder.indexOf(allStatuses[i].status);
          const currentIdx = Math.min(Math.floor((step - i * 3) / 2), targetIdx);
          return { ...s, current: currentIdx >= 0 ? statusOrder[currentIdx] : "queued" };
        })
      );
      if (step >= maxSteps + 8) {
        clearInterval(iv);
        const t1 = setTimeout(() => {
          setStatuses(allStatuses.map((s) => ({ ...s, current: "queued" })));
          const t2 = setTimeout(() => runCycle(), 800);
          timers.current.push(t2);
        }, 4000);
        timers.current.push(t1);
      }
    }, 600);
    timers.current.push(iv as unknown as ReturnType<typeof setTimeout>);
  }, [clearTimers]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => { if (!started.current) { started.current = true; runCycle(); } },
    });
    return () => { st.kill(); clearTimers(); };
  }, [runCycle, clearTimers]);

  return (
    <div ref={ref} className="relative p-8 text-white rounded-2xl h-full flex flex-col overflow-hidden">
      <GrainBg preset="orangeEmber" />
      <div className="relative z-10 text-xs text-white/60 uppercase tracking-widest mb-1">Step 5</div>
      <h3 className="relative z-10 text-sm font-semibold mb-5">Send &amp; track every email</h3>
      <div className="relative z-10 flex-1 space-y-3">
        {statuses.map((s) => (
          <div key={s.company} className="flex items-center gap-3 transition-all duration-500">
            <Avatar className="w-6 h-6 flex-shrink-0" {...avatarConfigs[s.ai]} />
            <div className={`w-2 h-2 ${colors[s.current]} rounded-full ${s.current !== "queued" ? "animate-pulse" : ""} flex-shrink-0 transition-colors duration-500`} />
            <span className="text-sm flex-1 truncate">{s.company}</span>
            <span className="text-xs text-white/50 capitalize transition-all duration-500">{s.current}</span>
          </div>
        ))}
      </div>
      <div className="relative z-10 mt-4 h-px bg-white/20" />
      <div className="relative z-10 mt-3 flex justify-between text-xs text-white/50">
        <span>{statuses.filter((s) => s.current !== "queued").length} sent</span>
        <span>{statuses.filter((s) => s.current === "replied").length} replies</span>
      </div>
    </div>
  );
}

/* ── Step 6: Interview Prep ── */
function InterviewPrepCard() {
  const phases = [
    { name: "Technical", Icon: Settings, questions: 5 },
    { name: "Behavioral", Icon: MessageSquare, questions: 3 },
    { name: "Company", Icon: Target, questions: 4 },
    { name: "Culture", Icon: Handshake, questions: 3 },
  ];
  const [activePhase, setActivePhase] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const runCycle = useCallback(function runCycle() {
    let phase = 0;
    let cancelled = false;
    setActivePhase(0);
    setShowAnswer(false);

    const advance = () => {
      if (cancelled) return;
      // Show answer for current phase
      setTimeout(() => {
        if (cancelled) return;
        setShowAnswer(true);

        // Move to next phase
        setTimeout(() => {
          if (cancelled) return;
          phase++;
          if (phase >= phases.length) {
            // Pause then restart
            setTimeout(() => { if (!cancelled) runCycle(); }, 3000);
            return;
          }
          setActivePhase(phase);
          setShowAnswer(false);
          // Wait then advance again
          setTimeout(advance, 800);
        }, 1500);
      }, 1200);
    };

    setTimeout(advance, 800);

    return () => { cancelled = true; };
  }, [phases.length]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => {
        if (!started.current) {
          started.current = true;
          cleanup = runCycle();
        }
      },
    });
    return () => { st.kill(); cleanup?.(); };
  }, [runCycle]);

  const sampleQuestions = [
    "How would you design a real-time data pipeline at our scale?",
    "Tell me about a time you shipped under tight deadlines.",
    "What specifically about our product excited you?",
    "How do you handle disagreements with your tech lead?",
  ];

  return (
    <div ref={ref} className="relative p-8 rounded-2xl h-full flex flex-col overflow-hidden bg-foreground text-background">
      <div className="relative z-10 flex items-center gap-3 mb-5">
        <Avatar className="w-8 h-8" {...avatarConfigs[9]} />
        <div>
          <div className="text-xs text-white/50 uppercase tracking-widest">Step 6</div>
          <h3 className="text-sm font-semibold text-white">Interview prep</h3>
        </div>
      </div>
      <div className="relative z-10 flex-1 space-y-3">
        <div className="flex gap-2 mb-4">
          {phases.map((p, i) => (
            <div
              key={p.name}
              className={`flex-1 p-2 rounded-lg border transition-all duration-500 flex flex-col items-center ${
                i === activePhase
                  ? "bg-primary/20 border-primary/40"
                  : "bg-white/[0.03] border-white/[0.06]"
              }`}
            >
              <p.Icon className={`w-5 h-5 ${i === activePhase ? "text-primary" : "text-white/30"} transition-colors duration-500`} />
              <div className={`text-[10px] mt-1 ${i === activePhase ? "text-white/80" : "text-white/30"}`}>
                {p.name}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-white/[0.04] border border-white/[0.06] rounded-xl min-h-[90px] flex flex-col justify-between">
          <p className="text-sm text-white/70 leading-relaxed">
            {sampleQuestions[activePhase]}
          </p>
          <div className={`mt-3 text-xs transition-all duration-500 ${showAnswer ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
            <div className="flex items-center gap-2 text-primary">
              <span className="w-1 h-1 bg-primary rounded-full" />
              AI-generated answer + coaching tip
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-4 text-xs text-white/40">
        {phases[activePhase].questions} questions in {phases[activePhase].name.toLowerCase()} phase
      </div>
    </div>
  );
}

/* ── Autopilot: Agent Pipeline ── */
function AgentPipelineCard() {
  const steps = [
    { name: "Score matches", Icon: BarChart3, status: "idle" },
    { name: "Find contacts", Icon: Search, status: "idle" },
    { name: "Draft emails", Icon: PenLine, status: "idle" },
    { name: "Send outreach", Icon: Send, status: "idle" },
    { name: "Track replies", Icon: CheckCircle, status: "idle" },
  ];
  const [activeSteps, setActiveSteps] = useState(steps.map((s) => ({ ...s })));
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const runCycle = useCallback(() => {
    clearTimers();
    let current = 0;
    setActiveSteps(steps.map((s) => ({ ...s, status: "idle" })));

    const iv = setInterval(() => {
      setActiveSteps((prev) =>
        prev.map((s, i) => {
          if (i < current) return { ...s, status: "done" };
          if (i === current) return { ...s, status: "running" };
          return { ...s, status: "idle" };
        })
      );
      current++;
      if (current > steps.length) {
        clearInterval(iv);
        setActiveSteps(steps.map((s) => ({ ...s, status: "done" })));
        const t = setTimeout(() => runCycle(), 4000);
        timers.current.push(t);
      }
    }, 1000);
    timers.current.push(iv as unknown as ReturnType<typeof setTimeout>);
  }, [clearTimers]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => { if (!started.current) { started.current = true; runCycle(); } },
    });
    return () => { st.kill(); clearTimers(); };
  }, [runCycle, clearTimers]);

  const statusColors: Record<string, string> = {
    idle: "bg-white/10",
    running: "bg-primary animate-pulse",
    done: "bg-green-400",
  };

  return (
    <div ref={ref} className="relative p-8 text-white rounded-2xl h-full flex flex-col overflow-hidden">
      <GrainBg preset="darkFire" />
      <div className="relative z-10 text-xs text-white/60 uppercase tracking-widest mb-1">Autopilot</div>
      <h3 className="relative z-10 text-sm font-semibold mb-2">Automated pipeline</h3>
      <p className="relative z-10 text-xs text-white/40 mb-5">Runs daily at 8:30 AM &mdash; scores new companies, finds contacts, drafts emails</p>
      <div className="relative z-10 flex-1 space-y-2.5">
        {activeSteps.map((s) => {
          const StepIcon = steps.find((st) => st.name === s.name)?.Icon ?? BarChart3;
          return (
            <div key={s.name} className="flex items-center gap-3 transition-all duration-500">
              <div className={`w-2.5 h-2.5 rounded-full ${statusColors[s.status]} transition-all duration-500 flex-shrink-0`} />
              <StepIcon className={`w-4 h-4 flex-shrink-0 transition-colors duration-300 ${s.status === "idle" ? "text-white/30" : "text-primary"}`} />
              <span className={`text-sm flex-1 transition-all duration-300 ${s.status === "idle" ? "text-white/40" : "text-white/90"}`}>
                {s.name}
              </span>
              <span className="text-xs text-white/30 capitalize">{s.status === "done" ? "\u2713" : s.status === "running" ? "..." : ""}</span>
            </div>
          );
        })}
      </div>
      <div className="relative z-10 mt-4 h-px bg-white/20" />
      <div className="relative z-10 mt-3 text-xs text-white/50">
        {activeSteps.filter((s) => s.status === "done").length}/{activeSteps.length} steps complete
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Before / After — visual workspace transformation
   ═══════════════════════════════════════════════ */

function BeforeAfterSection() {
  const [phase, setPhase] = useState<"chaos" | "transform" | "clean">("chaos");
  const sectionRef = useRef<HTMLDivElement>(null);
  const chaosRef = useRef<HTMLDivElement>(null);
  const cleanRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const chaosTools = [
    { name: "Spreadsheet", color: "bg-emerald-500/20 border-emerald-500/30", rot: -3, x: 0, y: 0 },
    { name: "Job Board", color: "bg-blue-500/20 border-blue-500/30", rot: 2, x: 20, y: -10 },
    { name: "Email Finder", color: "bg-purple-500/20 border-purple-500/30", rot: -1, x: -15, y: 5 },
    { name: "LinkedIn", color: "bg-sky-500/20 border-sky-500/30", rot: 4, x: 10, y: -5 },
    { name: "Company Wiki", color: "bg-amber-500/20 border-amber-500/30", rot: -2, x: -5, y: 10 },
    { name: "Gmail", color: "bg-red-500/20 border-red-500/30", rot: 1, x: 25, y: 0 },
  ];

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const runCycle = useCallback(function runCycle() {
    clearTimers();
    setPhase("chaos");

    const t1 = setTimeout(() => {
      setPhase("transform");

      if (chaosRef.current) {
        const cards = chaosRef.current.querySelectorAll("[data-chaos-card]");
        gsap.to(cards, {
          scale: 0.5, opacity: 0, rotation: 0, y: 40,
          duration: 0.6, stagger: 0.08, ease: "power3.in",
        });
      }

      const t2 = setTimeout(() => {
        setPhase("clean");

        if (cleanRef.current) {
          const rows = cleanRef.current.querySelectorAll("[data-clean-row]");
          gsap.fromTo(rows,
            { opacity: 0, y: 20, filter: "blur(4px)" },
            { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, stagger: 0.1, ease: "power3.out" }
          );
        }

        const t3 = setTimeout(() => runCycle(), 6000);
        timers.current.push(t3);
      }, 800);
      timers.current.push(t2);
    }, 5000);
    timers.current.push(t1);
  }, [clearTimers]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 70%",
      onEnter: () => { if (!started.current) { started.current = true; runCycle(); } },
    });
    return () => { st.kill(); clearTimers(); };
  }, [runCycle, clearTimers]);

  return (
    <section ref={sectionRef} className="px-10 md:px-16 lg:px-24 py-36 overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        <SlideIn direction="left" distance={80}>
          <div className="max-w-2xl mb-16">
            <div className="text-sm text-muted-foreground mb-6 tracking-widest uppercase">
              Before &amp; After
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Replace 6 tabs with
              <br />
              <span className="text-primary">one platform.</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              No more spreadsheets, email finders, job boards, and LinkedIn tabs. Match handles your entire startup job search pipeline.
            </p>
          </div>
        </SlideIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BEFORE */}
          <div className="relative">
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-3">
              <span>Without Match</span>
              <div className={`h-px flex-1 transition-all duration-1000 ${phase === "chaos" ? "bg-destructive/30" : "bg-border/30"}`} />
            </div>
            <div
              ref={chaosRef}
              className={`relative bg-muted/30 border border-border/50 rounded-2xl p-8 min-h-[420px] overflow-hidden transition-all duration-700 ${
                phase === "chaos" ? "opacity-100" : "opacity-40"
              }`}
            >
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <Avatar className="w-10 h-10" {...avatarConfigs[6]} />
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium">You, probably</div>
                  <div className="text-destructive/70">12 tabs open</div>
                </div>
              </div>
              <div className="relative h-[340px]">
                {chaosTools.map((tool, i) => (
                  <div
                    key={tool.name}
                    data-chaos-card
                    className={`absolute ${tool.color} border backdrop-blur-sm rounded-xl p-4 w-[180px] shadow-lg transition-transform duration-300 hover:scale-105`}
                    style={{
                      top: `${15 + (i % 3) * 100}px`,
                      left: `${(i % 2) * 45 + tool.x}%`,
                      transform: `rotate(${tool.rot}deg) translate(${tool.x}px, ${tool.y}px)`,
                      zIndex: i,
                    }}
                  >
                    <div className="text-xs font-medium mb-2">{tool.name}</div>
                    <div className="space-y-1.5">
                      <div className="h-2 bg-foreground/10 w-full" />
                      <div className="h-2 bg-foreground/10 w-3/4" />
                      <div className="h-2 bg-foreground/10 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-muted-foreground/60">
                <span>6 tools</span>
                <span>$200+/mo</span>
                <span>hours wasted</span>
              </div>
            </div>
          </div>

          {/* AFTER */}
          <div className="relative">
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-3">
              <span>With Match</span>
              <div className={`h-px flex-1 transition-all duration-1000 ${phase === "clean" ? "bg-primary/50" : "bg-border/30"}`} />
            </div>
            <div
              ref={cleanRef}
              className={`relative bg-[#1a1a1a] border border-[#1a1a1a] rounded-2xl p-8 min-h-[420px] overflow-hidden transition-all duration-700 ${
                phase === "clean" ? "opacity-100" : "opacity-40"
              }`}
            >
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <Avatar className="w-10 h-10" {...avatarConfigs[6]} />
                <div className="text-xs text-white/50">
                  <div className="font-medium text-white/80">You, after</div>
                  <div className="text-primary">1 tab. done.</div>
                </div>
              </div>
              <div className="space-y-3 mt-10">
                {[
                  { label: "Match score", value: "87/100", bar: 87, avatar: 0 },
                  { label: "Contacts found", value: "4 people", bar: 100, avatar: 1 },
                  { label: "Email drafted", value: "Ready to send", bar: 65, avatar: 2 },
                  { label: "Interview prep", value: "20 Qs generated", bar: 92, avatar: 3 },
                ].map((row, i) => (
                  <div
                    key={row.label}
                    data-clean-row
                    className="flex items-center gap-3 p-3 bg-white/[0.06] border border-white/[0.06] rounded-xl"
                  >
                    <Avatar className="w-7 h-7 flex-shrink-0" {...avatarConfigs[row.avatar]} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white/50">{row.label}</span>
                        <span className="text-xs text-primary font-medium">{row.value}</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                          style={{ width: phase === "clean" ? `${row.bar}%` : "0%", transitionDelay: `${i * 200}ms` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div data-clean-row className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {avatarConfigs.slice(0, 3).map((c, i) => (
                        <Avatar key={i} className="w-5 h-5 border border-primary/30" {...c} />
                      ))}
                    </div>
                    <span className="text-xs text-white/60">3 emails queued</span>
                  </div>
                  <div className="px-3 py-1 bg-primary rounded-lg text-xs font-medium text-white">Send all</div>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white/30">
                <span>1 tool</span>
                <span>Free</span>
                <span>2 min setup</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-8">
          {(["chaos", "transform", "clean"] as const).map((p) => (
            <div
              key={p}
              className={`h-1 rounded-full transition-all duration-500 ${
                phase === p ? "w-8 bg-primary" : "w-3 bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   Main export
   ═══════════════════════════════════════════════ */

export function LandingFeatures() {
  return (
    <>
      <section id="features" className="relative bg-background text-foreground py-32 overflow-hidden">
        <div className="relative z-10 px-10 md:px-16 lg:px-24 max-w-[1400px] mx-auto">
          <SlideIn direction="left" distance={80}>
            <div className="max-w-3xl mb-20">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1]">
                Resume to interview
                <br />
                <span className="text-primary">in 6 steps.</span>
              </h2>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                Match handles your entire startup job search pipeline: parse your resume, score 500+ YC companies, find the right contacts, draft personalized emails, and prep you for interviews.
              </p>
            </div>
          </SlideIn>

          {/* Bento grid — steps flow in reading order: 1 → 2 → 3 → 4 → 5 → 6 */}
          <StaggerReveal
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4"
            stagger={0.08}
          >
            {/* Row 1: Step 1 | 500+ | Step 2 */}
            <RevealChild className="lg:col-span-4 h-[360px]"><ResumeCard /></RevealChild>
            <RevealChild className="lg:col-span-4 h-[360px]"><CounterCard /></RevealChild>
            <RevealChild className="lg:col-span-4 h-[360px]"><MatchScoreCard /></RevealChild>

            {/* Row 2: Step 3 | Step 4 (wide) */}
            <RevealChild className="lg:col-span-5 h-[380px]"><ContactCard /></RevealChild>
            <RevealChild className="lg:col-span-7 h-[380px]"><EmailCard /></RevealChild>

            {/* Row 3: Step 5 | Step 6 | Autopilot */}
            <RevealChild className="lg:col-span-4 h-[380px]"><SendQueueCard /></RevealChild>
            <RevealChild className="lg:col-span-4 h-[380px]"><InterviewPrepCard /></RevealChild>
            <RevealChild className="lg:col-span-4 h-[380px]"><AgentPipelineCard /></RevealChild>
          </StaggerReveal>
        </div>
      </section>

      <BeforeAfterSection />
    </>
  );
}
