import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — YC Match",
  description: "Sign in with Google to start matching with YC companies.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
