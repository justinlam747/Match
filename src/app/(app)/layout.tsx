import { requireAuth } from "@/lib/supabase/auth-guard";
import { AppNav } from "@/components/app-nav";
import { AppFooter } from "@/components/app-footer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav
        userName={user.user_metadata?.full_name || user.email || "User"}
        userAvatar={user.user_metadata?.avatar_url}
        userEmail={user.email || ""}
      />
      <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
