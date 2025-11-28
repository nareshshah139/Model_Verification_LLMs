"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeltaView } from "@/components/workspace/delta-view";

/**
 * Delta/Drift Detection Dashboard
 * Upload a modified notebook and compare it against the baseline to detect drift
 */
export default function DeltaDashboardPage() {
  return (
    <div className="mx-auto max-w-screen-2xl h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Notebook Delta & Drift Detection</h1>
          <p className="text-sm text-muted-foreground">
            Upload a modified notebook to detect drift and compare changes by materiality tier
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Claims Dashboard</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/workspace">Back to Workspace</Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <DeltaView />
      </div>
    </div>
  );
}

