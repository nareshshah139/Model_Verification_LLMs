import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Cursor-style UI with shadcn",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        {/* Global header lives outside the main UI */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/workspace" className="font-semibold tracking-tight">
              <span className="mr-2">🧭</span> Workspace
            </Link>
            <div className="flex items-center gap-2">
              {/* Dashboard link is outside the main 3-pane UI */}
              <Button asChild variant="outline">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          </div>
        </header>
        <Separator />
        <main className="w-full">{children}</main>
      </body>
    </html>
  );
}
