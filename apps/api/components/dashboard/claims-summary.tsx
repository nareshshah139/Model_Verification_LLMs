"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import Link from "next/link";

type ClaimsData = {
  claims: any[];
};

type VerificationData = {
  verification_metadata: {
    verification_summary: {
      verified: number;
      partially_verified: number;
      not_verified: number;
      insufficient_evidence: number;
    };
    total_claims_verified: number;
  };
  overall_assessment: {
    risk_level: string;
  };
};

export function ClaimsSummary() {
  const [claimsData, setClaimsData] = useState<ClaimsData | null>(null);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
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
        console.error("Error loading claims data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Card Claims Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading claims data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!claimsData || !verificationData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Card Claims Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No claims data available</p>
            <p className="text-xs mt-2">Run verification to analyze model card claims</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalClaims = claimsData.claims.length;
  const verifiedCount = verificationData.verification_metadata.verification_summary.verified;
  const partialCount = verificationData.verification_metadata.verification_summary.partially_verified;
  const notVerifiedCount = verificationData.verification_metadata.verification_summary.not_verified;
  const insufficientCount = verificationData.verification_metadata.verification_summary.insufficient_evidence;
  const totalVerified = verificationData.verification_metadata.total_claims_verified;
  const pendingVerification = totalClaims - totalVerified;
  const riskLevel = verificationData.overall_assessment.risk_level;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Model Card Claims Analysis
              <Badge className={
                riskLevel === "HIGH" ? "bg-red-600 text-white" :
                riskLevel === "MEDIUM" ? "bg-yellow-600 text-white" :
                "bg-green-600 text-white"
              }>
                {riskLevel} RISK
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {verifiedCount} of {totalClaims} claims verified
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/claims">
              View Full Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-green-600 mb-2" />
                <div className="text-3xl font-bold text-green-600">{verifiedCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Verified</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-yellow-600 mb-2" />
                <div className="text-3xl font-bold text-yellow-600">{partialCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Partial</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="mx-auto h-8 w-8 text-red-600 mb-2" />
                <div className="text-3xl font-bold text-red-600">
                  {notVerifiedCount + insufficientCount}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Not Verified</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-orange-200 dark:border-orange-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-orange-600 mb-2" />
                <div className="text-3xl font-bold text-orange-600">{pendingVerification}</div>
                <div className="text-xs text-muted-foreground mt-1">Pending</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

