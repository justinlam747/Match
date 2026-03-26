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
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-6 pt-4">
      <nav
        className={`flex items-center gap-1 border px-2 py-1.5 transition-all duration-300 ${
          scrolled
            ? "bg-background/90 backdrop-blur-md border-border/60 shadow-lg shadow-black/5"
            : "bg-white/[0.12] backdrop-blur-md border-white/[0.15]"
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 pl-2 pr-3">
          <div
            className={`w-7 h-7 font-bold text-xs flex items-center justify-center transition-colors duration-300 ${
              scrolled
                ? "bg-primary text-primary-foreground"
                : "bg-white/25 text-white"
            }`}
          >
            Y
          </div>
          <span
            className={`font-bold text-sm tracking-tight transition-colors duration-300 ${
              scrolled ? "text-foreground" : "text-white"
            }`}
          >
            YC Match
          </span>
        </Link>

        {/* Separator */}
        <div
          className={`w-px h-5 mx-1 transition-colors duration-300 ${
            scrolled ? "bg-border" : "bg-white/20"
          }`}
        />

        {/* Links */}
        <div className="hidden md:flex items-center">
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how-it-works" },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`px-3.5 py-1.5 text-sm transition-colors duration-200 ${
                scrolled
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Separator */}
        <div
          className={`w-px h-5 mx-1 hidden md:block transition-colors duration-300 ${
            scrolled ? "bg-border" : "bg-white/20"
          }`}
        />

        {/* CTA buttons */}
        <Link
          href="/login"
          className={`px-3.5 py-1.5 text-sm transition-colors duration-200 hidden md:block ${
            scrolled
              ? "text-muted-foreground hover:text-foreground hover:bg-muted"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          Sign in
        </Link>
        <Link href="/login">
          <Button
            size="sm"
            className={`rounded-none px-5 h-8 text-xs font-semibold transition-all duration-300 ${
              scrolled
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-white text-[#FF6600] hover:bg-white/90"
            }`}
          >
            Get started
          </Button>
        </Link>
      </nav>
    </header>
  );
}
