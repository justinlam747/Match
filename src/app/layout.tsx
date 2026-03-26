import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "YC Match — Find your perfect YC company match",
    template: "%s | YC Match",
  },
  description:
    "Upload your resume, get AI-scored matches against Y Combinator startups, and send personalized cold emails.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "YC Match — Find your perfect YC company match",
    description:
      "Upload your resume, get AI-scored matches against Y Combinator startups, and send personalized cold emails.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
