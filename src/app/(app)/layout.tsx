import { requireAuth } from "@/lib/supabase/auth-guard";
import { AppNav } from "@/components/app-nav";
import { AppFooter } from "@/components/app-footer";
import { isLocalTestMode } from "@/lib/supabase/config";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // Prefer custom avatar from DB over Supabase auth avatar
  let avatar = user.user_metadata?.avatar_url;
  if (user.email && !isLocalTestMode() && process.env.DATABASE_URL) {
    const [{ db }, { users }, { eq }] = await Promise.all([
      import("@/lib/db"),
      import("@/lib/db/schema"),
      import("drizzle-orm"),
    ]);
    const [dbUser] = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1);
    if (dbUser?.avatarUrl) {
      avatar = dbUser.avatarUrl;
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav
        userName={user.user_metadata?.full_name || user.email || "User"}
        userAvatar={avatar}
        userEmail={user.email || ""}
      />
      <main className="flex-1 flex flex-col">
        <div className="px-6 lg:px-10 py-8 w-full flex-1">
          {children}
        </div>
        <AppFooter />
      </main>
    </div>
  );
}
