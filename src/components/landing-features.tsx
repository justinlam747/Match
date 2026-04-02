"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

gsap.registerPlugin(ScrollTrigger);

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

/* ═══════════════════════════════════════════════
   Bento cards
   ═══════════════════════════════════════════════ */

function ResumeCard() {
  const skills = ["React / Next.js", "TypeScript", "PostgreSQL", "AWS", "Python", "Docker"];
  const [visible, setVisible] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const runAnimation = useCallback(() => {
    let i = 0;
    setVisible(0);
    const iv = setInterval(() => {
      i++;
      setVisible(i);
      if (i >= skills.length) {
        clearInterval(iv);
        setTimeout(() => runAnimation(), 4000);
      }
    }, 400);
  }, [skills.length]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => { if (!started.current) { started.current = true; runAnimation(); } },
    });
    return () => { st.kill(); };
  }, [runAnimation]);

  return (
    <div ref={ref} className="p-8 bg-white/[0.06] border border-white/[0.08] rounded-2xl h-full flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <Avatar className="w-8 h-8" {...avatarConfigs[6]} />
        <div>
          <div className="text-xs text-white/40 uppercase tracking-widest">Resume parsing</div>
          <h3 className="text-sm font-semibold">Smart resume parsing</h3>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        {skills.map((skill, i) => (
          <div
            key={skill}
            className="flex items-center justify-between transition-all duration-500"
            style={{ opacity: i < visible ? 1 : 0, transform: i < visible ? "translateX(0)" : "translateX(-20px)" }}
          >
            <span className="text-sm text-white/70">{skill}</span>
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: i < visible ? `${65 + i * 5}%` : "0%", transitionDelay: `${i * 100}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-white/30">
        {visible >= skills.length ? "6 skills extracted" : `Scanning... ${visible}/${skills.length}`}
      </div>
    </div>
  );
}

function CounterCard({ value, suffix, label, desc }: { value: number; suffix: string; label: string; desc: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => {
        const obj = { val: 0 };
        gsap.to(obj, { val: value, duration: 2, ease: "power2.out", onUpdate: () => setCount(Math.round(obj.val)) });
      },
    });
    return () => { st.kill(); };
  }, [value]);

  return (
    <div ref={ref} className="p-8 bg-gradient-to-br from-primary to-primary/70 text-white rounded-2xl h-full flex flex-col justify-between">
      <div>
        <span className="text-6xl sm:text-7xl font-bold tracking-tight">{count}{suffix}</span>
      </div>
      <div>
        {/* Stacked avatars as social proof */}
        <div className="flex -space-x-2 mb-3">
          {avatarConfigs.slice(0, 5).map((c, i) => (
            <Avatar key={i} className="w-7 h-7 border-2 border-primary" {...c} />
          ))}
          <div className="w-7 h-7 border-2 border-primary bg-white/20 rounded-full flex items-center justify-center text-[9px] font-bold">
            +42
          </div>
        </div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-white/60 mt-1">{desc}</div>
      </div>
    </div>
  );
}

function MatchScoreCard() {
  const dims = [
    { name: "Tech overlap", target: 92 },
    { name: "Industry fit", target: 78 },
    { name: "Hiring signals", target: 85 },
    { name: "Stage match", target: 64 },
  ];
  const [widths, setWidths] = useState(dims.map(() => 0));
  const [overall, setOverall] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => {
        setTimeout(() => {
          setWidths(dims.map((d) => d.target));
          const avg = Math.round(dims.reduce((a, d) => a + d.target, 0) / dims.length);
          const obj = { val: 0 };
          gsap.to(obj, { val: avg, duration: 1.5, delay: 0.3, ease: "power2.out", onUpdate: () => setOverall(Math.round(obj.val)) });
        }, 200);
      },
    });
    return () => { st.kill(); };
  }, []);

  return (
    <div ref={ref} className="p-8 bg-white/[0.06] border border-white/[0.08] rounded-2xl h-full flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <Avatar className="w-8 h-8" {...avatarConfigs[7]} />
        <div>
          <div className="text-xs text-white/40 uppercase tracking-widest">Smart matching</div>
          <h3 className="text-sm font-semibold">4-dimension scoring</h3>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 items-start">
        <div className="space-y-4">
          {dims.map((d, i) => (
            <div key={d.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">{d.name}</span>
                <span className="text-primary font-semibold tabular-nums">{widths[i] > 0 ? d.target : "—"}</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${widths[i]}%`, transitionDelay: `${i * 150}ms` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center">
          <div className="relative w-28 h-28 flex items-center justify-center border-2 border-white/10 rounded-2xl">
            <div className="absolute inset-1 border border-primary/30 rounded-xl" />
            <div className="text-center">
              <div className="text-4xl font-bold text-primary tabular-nums">{overall}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Overall</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailCard() {
  const fullText = "Hi Alex, I noticed Acme is building real-time collab with Next.js — I've spent 3 years doing exactly that...";
  const [typed, setTyped] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const runTyping = useCallback(() => {
    let i = 0;
    setTyped("");
    const iv = setInterval(() => {
      i++;
      setTyped(fullText.slice(0, i));
      if (i >= fullText.length) { clearInterval(iv); setTimeout(() => runTyping(), 5000); }
    }, 30);
  }, [fullText]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => { if (!started.current) { started.current = true; runTyping(); } },
    });
    return () => { st.kill(); };
  }, [runTyping]);

  return (
    <div ref={ref} className="p-8 bg-white/[0.06] border border-white/[0.08] rounded-2xl h-full flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <Avatar className="w-8 h-8" {...avatarConfigs[0]} />
        <div>
          <div className="text-xs text-white/40 uppercase tracking-widest">Cold outreach</div>
          <h3 className="text-sm font-semibold">AI-written emails</h3>
        </div>
      </div>
      <div className="flex-1 space-y-3">
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
      <div className="mt-4 flex gap-2">
        <div className="px-4 py-1.5 bg-primary rounded-lg text-xs font-medium text-white">Send</div>
        <div className="px-4 py-1.5 bg-white/10 rounded-lg text-xs font-medium text-white/60">Edit</div>
        <div className="px-4 py-1.5 bg-white/10 rounded-lg text-xs font-medium text-white/60">Regenerate</div>
      </div>
    </div>
  );
}

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

  const runReveal = useCallback(() => {
    let i = 0;
    setRevealed(0);
    const iv = setInterval(() => {
      i++;
      setRevealed(i);
      if (i >= contacts.length) { clearInterval(iv); setTimeout(() => runReveal(), 4000); }
    }, 500);
  }, [contacts.length]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => { if (!started.current) { started.current = true; runReveal(); } },
    });
    return () => { st.kill(); };
  }, [runReveal]);

  return (
    <div ref={ref} className="p-8 bg-white/[0.06] border border-white/[0.08] rounded-2xl h-full flex flex-col">
      <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Contact discovery</div>
      <h3 className="text-sm font-semibold mb-5">Find decision makers</h3>
      <div className="flex-1 space-y-3">
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
      <div className="mt-4 text-xs text-white/30">
        {revealed >= contacts.length ? `${contacts.length} contacts found` : `Searching... ${revealed}/${contacts.length}`}
      </div>
    </div>
  );
}

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

  const runCycle = useCallback(() => {
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
        setTimeout(() => { setStatuses(allStatuses.map((s) => ({ ...s, current: "queued" }))); setTimeout(() => runCycle(), 800); }, 4000);
      }
    }, 600);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el, start: "top 85%",
      onEnter: () => { if (!started.current) { started.current = true; runCycle(); } },
    });
    return () => { st.kill(); };
  }, [runCycle]);

  return (
    <div ref={ref} className="p-8 bg-gradient-to-br from-primary to-primary/70 text-white rounded-2xl h-full flex flex-col">
      <div className="text-xs text-white/60 uppercase tracking-widest mb-1">Send queue</div>
      <h3 className="text-sm font-semibold mb-5">Track every email</h3>
      <div className="flex-1 space-y-3">
        {statuses.map((s) => (
          <div key={s.company} className="flex items-center gap-3 transition-all duration-500">
            <Avatar className="w-6 h-6 flex-shrink-0" {...avatarConfigs[s.ai]} />
            <div className={`w-2 h-2 ${colors[s.current]} rounded-full ${s.current !== "queued" ? "animate-pulse" : ""} flex-shrink-0 transition-colors duration-500`} />
            <span className="text-sm flex-1 truncate">{s.company}</span>
            <span className="text-xs text-white/50 capitalize transition-all duration-500">{s.current}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 h-px bg-white/20" />
      <div className="mt-3 flex justify-between text-xs text-white/50">
        <span>{statuses.filter((s) => s.current !== "queued").length} sent</span>
        <span>{statuses.filter((s) => s.current === "replied").length} replies</span>
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

  const runCycle = useCallback(() => {
    setPhase("chaos");

    // After 4s, start transform
    setTimeout(() => {
      setPhase("transform");

      // Animate chaos cards shrinking + fading
      if (chaosRef.current) {
        const cards = chaosRef.current.querySelectorAll("[data-chaos-card]");
        gsap.to(cards, {
          scale: 0.5,
          opacity: 0,
          rotation: 0,
          y: 40,
          duration: 0.6,
          stagger: 0.08,
          ease: "power3.in",
        });
      }

      // After transform animation, show clean
      setTimeout(() => {
        setPhase("clean");

        // Animate clean rows in
        if (cleanRef.current) {
          const rows = cleanRef.current.querySelectorAll("[data-clean-row]");
          gsap.fromTo(
            rows,
            { opacity: 0, y: 20, filter: "blur(4px)" },
            { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.5, stagger: 0.1, ease: "power3.out" }
          );
        }

        // Cycle back after showing clean state
        setTimeout(() => runCycle(), 6000);
      }, 800);
    }, 5000);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 70%",
      onEnter: () => {
        if (!started.current) { started.current = true; runCycle(); }
      },
    });
    return () => { st.kill(); };
  }, [runCycle]);

  return (
    <section ref={sectionRef} className="px-10 md:px-16 lg:px-24 py-36 overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <SlideIn direction="left" distance={80}>
          <div className="max-w-2xl mb-16">
            <div className="text-sm text-muted-foreground mb-6 tracking-widest uppercase">
              Before &amp; After
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Stop juggling.
              <br />
              <span className="text-primary">Start matching.</span>
            </h2>
          </div>
        </SlideIn>

        {/* Two-panel visual */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BEFORE — chaotic scattered windows */}
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
              {/* Frustrated avatar */}
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <Avatar className="w-10 h-10" {...avatarConfigs[6]} />
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium">You, probably</div>
                  <div className="text-destructive/70">12 tabs open</div>
                </div>
              </div>

              {/* Scattered tool windows */}
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

              {/* Chaos indicators */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-muted-foreground/60">
                <span>6 tools</span>
                <span>$200+/mo</span>
                <span>hours wasted</span>
              </div>
            </div>
          </div>

          {/* AFTER — clean unified dashboard */}
          <div className="relative">
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-3">
              <span>With Match</span>
              <div className={`h-px flex-1 transition-all duration-1000 ${phase === "clean" ? "bg-primary/50" : "bg-border/30"}`} />
            </div>
            <div
              ref={cleanRef}
              className={`relative bg-foreground border border-foreground rounded-2xl p-8 min-h-[420px] overflow-hidden transition-all duration-700 ${
                phase === "clean" ? "opacity-100" : "opacity-40"
              }`}
            >
              {/* Happy avatar */}
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <Avatar className="w-10 h-10" {...avatarConfigs[6]} />
                <div className="text-xs text-white/50">
                  <div className="font-medium text-white/80">You, after</div>
                  <div className="text-primary">1 tab. done.</div>
                </div>
              </div>

              {/* Clean dashboard mockup */}
              <div className="space-y-3 mt-10">
                {[
                  { label: "Match score", value: "87/100", bar: 87, avatar: 0 },
                  { label: "Contacts found", value: "4 people", bar: 100, avatar: 1 },
                  { label: "Email drafted", value: "Ready to send", bar: 65, avatar: 2 },
                  { label: "Deliverability", value: "Optimized", bar: 92, avatar: 3 },
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
                          style={{
                            width: phase === "clean" ? `${row.bar}%` : "0%",
                            transitionDelay: `${i * 200}ms`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Bottom action */}
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

              {/* Clean indicators */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white/30">
                <span>1 tool</span>
                <span>Free</span>
                <span>2 min setup</span>
              </div>
            </div>
          </div>
        </div>

        {/* Phase indicator dots */}
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
      <section id="features" className="bg-foreground text-background py-32">
        <div className="px-10 md:px-16 lg:px-24 max-w-[1400px] mx-auto">
          <SlideIn direction="left" distance={80}>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1] mb-20">
              Everything you need —
              <br />
              <span className="text-primary">all in one place</span>
            </h2>
          </SlideIn>

          <StaggerReveal
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-[360px] gap-4"
            stagger={0.08}
          >
            <RevealChild className="h-full"><ResumeCard /></RevealChild>
            <RevealChild className="h-full">
              <CounterCard value={500} suffix="+" label="Startups indexed" desc="Top accelerator batches" />
            </RevealChild>
            <RevealChild className="h-full"><ContactCard /></RevealChild>
            <RevealChild className="sm:col-span-2 h-full"><MatchScoreCard /></RevealChild>
            <RevealChild className="h-full"><EmailCard /></RevealChild>
            <RevealChild className="sm:col-span-2 lg:col-span-2 h-full"><SendQueueCard /></RevealChild>
            <RevealChild className="h-full p-8 bg-white/[0.06] border border-white/[0.08] rounded-2xl flex flex-col justify-between">
              <div>
                <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Speed</div>
                <span className="text-6xl font-bold tracking-tight">&lt; 2<span className="text-3xl ml-1">min</span></span>
              </div>
              <div>
                {/* User avatars who got fast matches */}
                <div className="flex -space-x-2 mb-3">
                  {avatarConfigs.slice(4, 9).map((c, i) => (
                    <Avatar key={i} className="w-7 h-7 border-2 border-white/10" {...c} />
                  ))}
                </div>
                <div className="text-sm font-medium">To your first match</div>
                <div className="text-xs text-white/40 mt-1">Upload &rarr; Score &rarr; Email</div>
              </div>
            </RevealChild>
          </StaggerReveal>
        </div>
      </section>

      <BeforeAfterSection />
    </>
  );
}
