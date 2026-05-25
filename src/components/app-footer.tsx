import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="border-t mt-auto">
      <div className="px-6 lg:px-10 py-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary text-primary-foreground font-bold text-[8px] flex items-center justify-center">
            M
          </div>
          <span>Match</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          <Link href="/matches" className="hover:text-foreground transition-colors">Matches</Link>
          <Link href="/settings" className="hover:text-foreground transition-colors">Settings</Link>
          <Link href="/legal/third-party" className="hover:text-foreground transition-colors">Matching engine inspired by career-ops (MIT)</Link>
        </div>
      </div>
    </footer>
  );
}
