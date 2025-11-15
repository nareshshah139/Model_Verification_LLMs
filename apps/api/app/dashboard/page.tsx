"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerificationSummary } from "@/components/dashboard/verification-summary";

/**
 * The dashboard is deliberately outside the main 3-pane layout.
 * We still offer a quick way back to the Notebook via the "super" toggle metaphor.
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-screen-2xl space-y-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Dashboard</div>
        <Button asChild variant="secondary">
          <Link href="/workspace">Back to Notebook</Link>
        </Button>
      </div>

      {/* Model Card Verification summary cards */}
      <VerificationSummary />

      <Card>
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
          <CardDescription>Metrics, runs, and recent activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="runs">Runs</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>
            <TabsContent value="metrics" className="pt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card><CardContent className="py-6">Accuracy: 93.4%</CardContent></Card>
                <Card><CardContent className="py-6">Latency p50: 142ms</CardContent></Card>
                <Card><CardContent className="py-6">Cost / 1k tokens: $0.0012</CardContent></Card>
              </div>
            </TabsContent>
            <TabsContent value="runs" className="pt-4">
              <div className="text-sm text-muted-foreground">Recent runs will appear here.</div>
            </TabsContent>
            <TabsContent value="events" className="pt-4">
              <div className="text-sm text-muted-foreground">No incidents detected.</div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

