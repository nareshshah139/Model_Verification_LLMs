#!/bin/bash

# Sync claims and verification data to the Next.js public folder for dashboard display

echo "🔄 Syncing claims data to dashboard..."

# Copy verification results
if [ -f "model_card_claims_verification.json" ]; then
    cp model_card_claims_verification.json apps/api/public/model_card_claims_verification.json
    echo "✓ Synced verification data"
else
    echo "⚠️  model_card_claims_verification.json not found in root"
fi

# Copy claims data
if [ -f "model_card_claims.json" ]; then
    cp model_card_claims.json apps/api/public/model_card_claims.json
    echo "✓ Synced claims data"
else
    echo "⚠️  model_card_claims.json not found in root"
fi

echo "✅ Dashboard sync complete!"
echo ""
echo "📊 Current verification stats:"
jq -r '.verification_metadata | "   Total Claims: \(.total_claims_verified)\n   Verified: \(.verification_summary.verified)\n   Partially Verified: \(.verification_summary.partially_verified)\n   Not Found: \(.verification_summary.not_found)\n   Contradiction: \(.verification_summary.contradiction)\n   Timestamp: \(.verification_timestamp)"' apps/api/public/model_card_claims_verification.json 2>/dev/null || echo "   (Could not read verification stats)"

