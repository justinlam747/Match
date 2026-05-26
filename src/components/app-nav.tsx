"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isClientTestMode } from "@/lib/supabase/config";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut } from "lucide-react";

interface AppNavProps {
  userName: string;
  userAvatar?: string;
  userEmail: string;
}

export function AppNav({ userName, userAvatar, userEmail }: AppNavProps) {
  const router = useRouter();

  async function handleSignOut() {
    if (isClientTestMode()) {
      router.push("/");
      return;
    }

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
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
      <div className="px-6 lg:px-10 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center">
          <span className="font-bold tracking-tight">Match</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center gap-2 h-8 px-2 rounded-md text-sm hover:bg-muted transition-colors outline-none"
          >
            <Avatar className="h-6 w-6">
              {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{userName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {userEmail}
            </div>
            <DropdownMenuSeparator />
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
    </header>
  );
}
