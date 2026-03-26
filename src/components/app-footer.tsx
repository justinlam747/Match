export function AppFooter() {
  return (
    <footer className="border-t mt-auto">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary text-primary-foreground font-bold text-[8px] flex items-center justify-center">
            Y
          </div>
          <span>YC Match</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</a>
          <a href="/matches" className="hover:text-foreground transition-colors">Matches</a>
          <a href="/settings" className="hover:text-foreground transition-colors">Settings</a>
        </div>
      </div>
    </footer>
  );
}
