import Link from "next/link";
import { LandingHero } from "@/components/landing-hero";
import { LandingFeatures } from "@/components/landing-features";
import { LandingCta } from "@/components/landing-cta";
import { LandingNav } from "@/components/landing-nav";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav — transparent over orange hero, fills on scroll */}
      <LandingNav />

      {/* Hero */}
      <LandingHero />

      {/* Features + Bento + Before/After */}
      <LandingFeatures />

      {/* CTA */}
      <LandingCta />

      {/* Footer — wide, editorial */}
      <footer className="border-t">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 md:px-16 lg:px-24 py-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center rounded-lg">
                  M
                </div>
                <span className="font-bold tracking-tight">Match</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                AI-powered startup job search. Upload your resume and get matched with 3,900+ YC companies, ranked and graded on real fit.
              </p>
            </div>
            <div className="md:col-span-7 flex gap-20 text-sm">
              <div className="space-y-4">
                <div className="font-semibold text-xs uppercase tracking-widest text-muted-foreground">
                  Product
                </div>
                <Link href="#features" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
                <Link href="#how-it-works" className="block text-muted-foreground hover:text-foreground transition-colors">
                  How it works
                </Link>
              </div>
              <div className="space-y-4">
                <div className="font-semibold text-xs uppercase tracking-widest text-muted-foreground">
                  Platform
                </div>
                <Link href="/login" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Sign in
                </Link>
                <Link href="/login" className="block text-muted-foreground hover:text-foreground transition-colors">
                  Get started free
                </Link>
              </div>
            </div>
          </div>

          {/* Large brand */}
          <div className="mt-20 pt-10 border-t border-border/30 flex items-end justify-between">
            <div className="text-8xl sm:text-9xl lg:text-[11rem] font-bold tracking-tighter leading-none text-foreground/[0.03] select-none">
              Match
            </div>
            <span className="text-xs text-muted-foreground pb-3">
              &copy; 2025 Match
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
