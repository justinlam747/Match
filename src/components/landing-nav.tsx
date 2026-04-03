"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 z-50 px-6 pt-4">
      <nav
        className={`flex items-center gap-1.5 border backdrop-blur-md transition-all duration-500 ease-out ${
          scrolled
            ? "bg-background/90 border-border/60 shadow-lg shadow-black/5 rounded-full px-4 py-2.5"
            : "bg-white/[0.12] border-white/[0.15] rounded-full px-3 py-2"
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 pl-2 pr-3">
          <div
            className={`font-bold text-xs flex items-center justify-center transition-all duration-500 ${
              scrolled
                ? "w-9 h-9 rounded-xl bg-primary text-primary-foreground"
                : "w-8 h-8 rounded-xl bg-white/25 text-white"
            }`}
          >
            M
          </div>
          <span
            className={`font-bold tracking-tight transition-all duration-500 ${
              scrolled ? "text-foreground text-base" : "text-white text-sm"
            }`}
          >
            Match
          </span>
        </Link>

        {/* Separator */}
        <div
          className={`w-px mx-1 transition-all duration-500 ${
            scrolled ? "h-6 bg-border" : "h-5 bg-white/20"
          }`}
        />

        {/* CTA */}
        <Link href="/login">
          <Button
            size="sm"
            className={`rounded-full font-semibold transition-all duration-500 ${
              scrolled
                ? "px-7 h-10 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                : "px-6 h-9 text-xs bg-white text-[#F26522] hover:bg-white/90"
            }`}
          >
            Get started
          </Button>
        </Link>
      </nav>
    </header>
  );
}
