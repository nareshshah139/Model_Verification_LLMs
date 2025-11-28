import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claims, verification } = body;

    if (!verification) {
      return new Response(
        JSON.stringify({ error: "Verification data is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the workspace root (parent of apps directory)
    const workspaceRoot = path.join(process.cwd(), "../..");
    const publicDir = path.join(process.cwd(), "public");

    try {
      // Save to root directory for archival
      const rootVerificationPath = path.join(workspaceRoot, "model_card_claims_verification.json");
      await fs.writeFile(
        rootVerificationPath,
        JSON.stringify(verification, null, 2),
        "utf-8"
      );
      console.log(`✓ Saved verification to: ${rootVerificationPath}`);

      // Save to public directory for dashboard
      const publicVerificationPath = path.join(publicDir, "model_card_claims_verification.json");
      await fs.writeFile(
        publicVerificationPath,
        JSON.stringify(verification, null, 2),
        "utf-8"
      );
      console.log(`✓ Saved verification to: ${publicVerificationPath}`);

      // If claims data is provided, save it too
      if (claims) {
        const rootClaimsPath = path.join(workspaceRoot, "model_card_claims.json");
        const publicClaimsPath = path.join(publicDir, "model_card_claims.json");
        
        await fs.writeFile(
          rootClaimsPath,
          JSON.stringify(claims, null, 2),
          "utf-8"
        );
        console.log(`✓ Saved claims to: ${rootClaimsPath}`);
        
        await fs.writeFile(
          publicClaimsPath,
          JSON.stringify(claims, null, 2),
          "utf-8"
        );
        console.log(`✓ Saved claims to: ${publicClaimsPath}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Verification results saved successfully",
          locations: {
            verification_root: rootVerificationPath,
            verification_public: publicVerificationPath,
            ...(claims ? {
              claims_root: path.join(workspaceRoot, "model_card_claims.json"),
              claims_public: path.join(publicDir, "model_card_claims.json")
            } : {})
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (writeError) {
      console.error("Failed to write files:", writeError);
      return new Response(
        JSON.stringify({ error: `Failed to save files: ${writeError}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Save verification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

