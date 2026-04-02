import { redirect } from "next/navigation";
import { getUser } from "./server";

const TEST_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "test@match.dev",
  user_metadata: {
    full_name: "Test User",
    avatar_url: "",
  },
};

export async function requireAuth() {
  if (process.env.TEST_MODE === "true" && process.env.NODE_ENV !== "production") {
    console.warn("[AUTH] Test mode active — bypassing authentication");
    return TEST_USER;
  }

  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
