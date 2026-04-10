"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Target,
  MessageSquareText,
  Mail,
  Bot,
  Building2,
  Layers,
  Shield,
  Settings,
  User,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useState } from "react";

interface AppSidebarProps {
  userName: string;
  userAvatar?: string;
  userEmail: string;
  isAdmin?: boolean;
}

const baseLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matches", label: "Matches", icon: Target },
  { href: "/interview", label: "Interview", icon: MessageSquareText },
  { href: "/emails", label: "Emails", icon: Mail },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/portals", label: "Portals", icon: Building2 },
  { href: "/batch", label: "Batch", icon: Layers },
];

export function AppSidebar({ userName, userAvatar, userEmail, isAdmin }: AppSidebarProps) {
  const links = isAdmin
    ? [...baseLinks, { href: "/admin", label: "Admin", icon: Shield }]
    : baseLinks;
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r bg-sidebar transition-all duration-200",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shrink-0">
              M
            </div>
            {!collapsed && (
              <span className="font-bold tracking-tight text-sidebar-foreground">Match</span>
            )}
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                title={collapsed ? link.label : undefined}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {!collapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-2 mb-2 flex items-center justify-center gap-2 px-3 py-2 text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground rounded-md hover:bg-sidebar-accent/50 transition-colors"
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : (
            <>
              <ChevronsLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>

        {/* User section */}
        <div className="border-t p-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm hover:bg-sidebar-accent/50 transition-colors outline-none",
                collapsed && "justify-center"
              )}
            >
              <Avatar className="h-7 w-7 shrink-0">
                {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium truncate text-sidebar-foreground">{userName}</div>
                  <div className="text-[11px] text-sidebar-foreground/50 truncate">{userEmail}</div>
                </div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/profile")} className="text-sm">
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")} className="text-sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile top bar */}
      <MobileBar
        links={links}
        pathname={pathname}
        userName={userName}
        userAvatar={userAvatar}
        userEmail={userEmail}
        initials={initials}
        onSignOut={handleSignOut}
        router={router}
      />
    </>
  );
}

function MobileBar({
  links,
  pathname,
  userName,
  userAvatar,
  userEmail,
  initials,
  onSignOut,
  router,
}: {
  links: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  pathname: string;
  userName: string;
  userAvatar?: string;
  userEmail: string;
  initials: string;
  onSignOut: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
      <div className="flex items-center justify-between h-12 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center">
            M
          </div>
          <span className="font-bold tracking-tight text-sm">Match</span>
        </Link>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <Avatar className="h-7 w-7">
                {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">{userEmail}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")} className="text-sm">Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")} className="text-sm">Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={onSignOut} className="text-sm">Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            className="p-1 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t px-4 py-2 bg-background">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                  pathname === link.href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
