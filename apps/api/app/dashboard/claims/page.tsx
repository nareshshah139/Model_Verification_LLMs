"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ClaimsDashboard } from "@/components/workspace/claims-dashboard";

export default function ClaimsDashboardPage() {
  const [claimsData, setClaimsData] = useState<any>(null);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Load claims data
        const claimsResponse = await fetch("/model_card_claims.json");
        if (claimsResponse.ok) {
          const claims = await claimsResponse.json();
          setClaimsData(claims);
        }

        // Load verification data
        const verificationResponse = await fetch("/model_card_claims_verification.json");
        if (verificationResponse.ok) {
          const verification = await verificationResponse.json();
          setVerificationData(verification);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="mx-auto max-w-screen-2xl h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">Model Card Claims Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive analysis of model card claims and verification status
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/workspace">Back to Workspace</Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-sm text-muted-foreground">Loading claims dashboard...</p>
            </div>
          </div>
        ) : (
          <ClaimsDashboard claimsData={claimsData} verificationData={verificationData} />
        )}
      </div>
    </div>
  );
}

