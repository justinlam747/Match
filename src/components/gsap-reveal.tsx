"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

/* ── Base reveal (fade + blur + y) ── */

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  blur?: number;
  duration?: number;
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 40,
  blur = 12,
  duration = 0.9,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.set(el, { opacity: 0, y, filter: `blur(${blur}px)` });

    const tween = gsap.to(el, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration,
      delay,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        toggleActions: "play none none none",
      },
    });

    return () => { tween.kill(); };
  }, [delay, y, blur, duration]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* ── Slide from left / right ── */

interface SlideProps {
  children: ReactNode;
  className?: string;
  direction?: "left" | "right";
  delay?: number;
  distance?: number;
  duration?: number;
}

export function SlideIn({
  children,
  className,
  direction = "left",
  delay = 0,
  distance = 120,
  duration = 1.1,
}: SlideProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const x = direction === "left" ? -distance : distance;

    gsap.set(el, { opacity: 0, x, filter: "blur(6px)" });

    const tween = gsap.to(el, {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      duration,
      delay,
      ease: "power4.out",
      scrollTrigger: {
        trigger: el,
        start: "top 90%",
        toggleActions: "play none none none",
      },
    });

    return () => { tween.kill(); };
  }, [direction, delay, distance, duration]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* ── Clip reveal (wipe in) ── */

interface ClipRevealProps {
  children: ReactNode;
  className?: string;
  from?: "bottom" | "left" | "right";
  delay?: number;
  duration?: number;
}

export function ClipReveal({
  children,
  className,
  from = "bottom",
  delay = 0,
  duration = 1.2,
}: ClipRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const clips: Record<string, string> = {
      bottom: "inset(100% 0% 0% 0%)",
      left: "inset(0% 100% 0% 0%)",
      right: "inset(0% 0% 0% 100%)",
    };

    gsap.set(el, { clipPath: clips[from] });

    const tween = gsap.to(el, {
      clipPath: "inset(0% 0% 0% 0%)",
      duration,
      delay,
      ease: "power4.inOut",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        toggleActions: "play none none none",
      },
    });

    return () => { tween.kill(); };
  }, [from, delay, duration]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* ── Scale reveal ── */

interface ScaleRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export function ScaleReveal({
  children,
  className,
  delay = 0,
  duration = 1,
}: ScaleRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.set(el, { opacity: 0, scale: 0.85, filter: "blur(8px)" });

    const tween = gsap.to(el, {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      duration,
      delay,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        toggleActions: "play none none none",
      },
    });

    return () => { tween.kill(); };
  }, [delay, duration]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* ── Stagger reveal ── */

interface StaggerRevealProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  blur?: number;
}

export function StaggerReveal({
  children,
  className,
  stagger = 0.12,
  y = 40,
  blur = 12,
}: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const items = el.querySelectorAll("[data-reveal-child]");
    if (!items.length) return;

    gsap.set(items, { opacity: 0, y, filter: `blur(${blur}px)` });

    const tween = gsap.to(items, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.8,
      stagger,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        toggleActions: "play none none none",
      },
    });

    return () => { tween.kill(); };
  }, [stagger, y, blur]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Wrap children in this inside StaggerReveal */
export function RevealChild({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-reveal-child className={className}>
      {children}
    </div>
  );
}

/** Instant reveal on mount (hero) — no scroll trigger */
export function HeroReveal({
  children,
  className,
  delay = 0,
  y = 30,
  blur = 10,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.fromTo(
      el,
      { opacity: 0, y, filter: `blur(${blur}px)` },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.9,
        delay,
        ease: "power3.out",
      }
    );
  }, [delay, y, blur]);

  return (
    <div ref={ref} style={{ opacity: 0 }} className={className}>
      {children}
    </div>
  );
}

/** Hero slide from side — no scroll trigger */
export function HeroSlide({
  children,
  className,
  direction = "left",
  delay = 0,
  distance = 80,
}: SlideProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const x = direction === "left" ? -distance : distance;

    gsap.fromTo(
      el,
      { opacity: 0, x, filter: "blur(4px)" },
      {
        opacity: 1,
        x: 0,
        filter: "blur(0px)",
        duration: 1.1,
        delay,
        ease: "power4.out",
      }
    );
  }, [direction, delay, distance]);

  return (
    <div ref={ref} style={{ opacity: 0 }} className={className}>
      {children}
    </div>
  );
}
