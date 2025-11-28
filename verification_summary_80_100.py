import json

print("=" * 80)
print("VERIFICATION SUMMARY: CLAIMS 80-100")
print("=" * 80)

with open('model_card_claims_verification.json', 'r') as f:
    data = json.load(f)

verifications = data['claim_verifications']
claims_80_100 = [v for v in verifications if 80 <= int(v['claim_id'].split('_')[1]) <= 100]

# Categorize by status
verified = [v for v in claims_80_100 if v['verification_status'] == 'verified']
partially_verified = [v for v in claims_80_100 if v['verification_status'] == 'partially_verified']
not_verified = [v for v in claims_80_100 if v['verification_status'] == 'not_verified']

print(f"\n📊 OVERALL STATISTICS")
print(f"  Total claims processed: {len(claims_80_100)}")
print(f"  ✅ Verified: {len(verified)} ({len(verified)/len(claims_80_100)*100:.1f}%)")
print(f"  ⚠️  Partially Verified: {len(partially_verified)} ({len(partially_verified)/len(claims_80_100)*100:.1f}%)")
print(f"  ❌ Not Verified: {len(not_verified)} ({len(not_verified)/len(claims_80_100)*100:.1f}%)")

print(f"\n\n✅ VERIFIED CLAIMS ({len(verified)}):")
for v in verified:
    claim_num = int(v['claim_id'].split('_')[1])
    print(f"\n  Claim {claim_num} - {v['claim_id']} (confidence: {v['confidence_score']})")
    print(f"    Category: {data['claim_verifications'][claim_num-1].get('category', 'N/A')}")
    print(f"    Description: {v['claim_description'][:100]}...")
    print(f"    Evidence: {len(v['evidence_found'])} pieces found")

print(f"\n\n⚠️  PARTIALLY VERIFIED CLAIMS ({len(partially_verified)}):")
for v in partially_verified:
    claim_num = int(v['claim_id'].split('_')[1])
    print(f"\n  Claim {claim_num} - {v['claim_id']} (confidence: {v['confidence_score']})")
    print(f"    Description: {v['claim_description'][:100]}...")
    print(f"    Evidence: {len(v['evidence_found'])} pieces found")
    print(f"    Note: May require additional verification or more specific evidence")

if not_verified:
    print(f"\n\n❌ NOT VERIFIED CLAIMS ({len(not_verified)}):")
    for v in not_verified:
        claim_num = int(v['claim_id'].split('_')[1])
        print(f"\n  Claim {claim_num} - {v['claim_id']}")
        print(f"    Description: {v['claim_description'][:100]}...")
        print(f"    Note: No evidence found in notebooks")

print("\n\n" + "=" * 80)
print("📁 FILES UPDATED")
print("=" * 80)
print("  ✓ model_card_claims_verification.json - Updated with 21 new verifications")
print(f"  ✓ Total verifications in file: {len(verifications)}")
print(f"  ✓ Batch 3 added: Claims 80-100 (2025-11-17)")

print("\n\n" + "=" * 80)
print("📝 NOTEBOOKS ANALYZED")
print("=" * 80)
for nb in data['verification_metadata']['notebooks_analyzed']:
    print(f"  ✓ {nb}")

print("\n\n" + "=" * 80)
print("✨ NEXT STEPS")
print("=" * 80)
print("  The following claim ranges are still pending:")
print("  - Claims 120-140")
print("  - Claims 141-160")
print("  - Claims 161-180")
print("  - Claims 181-196")
print("\n  Let me know when you want to continue with the next batch!")
print("=" * 80)

