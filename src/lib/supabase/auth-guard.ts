import { redirect } from "next/navigation";
import { getUser } from "./server";
import { isLocalTestMode } from "./config";

const TEST_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "test@match.dev",
  user_metadata: {
    full_name: "Test User",
    avatar_url: "",
  },
};

export async function requireAuth() {
  if (isLocalTestMode()) {
    console.warn("[AUTH] Test mode active — bypassing authentication");
    return TEST_USER;
  }

  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
