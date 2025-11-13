"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LLMSettings } from "./llm-settings";

/**
 * Superseding tab above the center tabs.
 * - "Notebook" keeps you in /workspace (the 3-pane UI).
 * - "Dashboard" navigates to /dashboard (outside the 3-pane UI).
 */
export function SuperTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState<"notebook" | "dashboard">("notebook");

  useEffect(() => {
    setValue(pathname.startsWith("/dashboard") ? "dashboard" : "notebook");
  }, [pathname]);

  return (
    <div className="border-b px-2 pt-2">
      <div className="flex items-center justify-between">
        <Tabs
          value={value}
          onValueChange={(v: string) => {
            if (v === "dashboard") {
              router.push("/dashboard");
            } else {
              router.push("/workspace");
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="notebook">Notebook</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="pb-2 pr-2">
          <LLMSettings />
        </div>
      </div>
    </div>
  );
}

