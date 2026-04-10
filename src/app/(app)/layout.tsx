import { requireAuth } from "@/lib/supabase/auth-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { AppFooter } from "@/components/app-footer";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // Prefer custom avatar from DB over Supabase auth avatar
  let avatar = user.user_metadata?.avatar_url;
  let isAdmin = false;
  if (user.email) {
    const [dbUser] = await db
      .select({ avatarUrl: users.avatarUrl, tags: users.tags })
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1);
    if (dbUser?.avatarUrl) {
      avatar = dbUser.avatarUrl;
    }
    if (dbUser?.tags?.includes("admin")) {
      isAdmin = true;
    }
  }

  return (
    <div className="min-h-screen">
      <AppSidebar
        userName={user.user_metadata?.full_name || user.email || "User"}
        userAvatar={avatar}
        userEmail={user.email || ""}
        isAdmin={isAdmin}
      />
      {/* Mobile: full width. Desktop: offset by sidebar width */}
      <main className="md:pl-56 min-h-screen flex flex-col">
        <div className="px-6 lg:px-10 py-8 w-full flex-1">
          {children}
        </div>
        <AppFooter />
      </main>
    </div>
  );
}
