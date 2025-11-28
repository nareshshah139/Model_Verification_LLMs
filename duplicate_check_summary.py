import json
from difflib import SequenceMatcher
from collections import Counter

def similarity_ratio(a, b):
    """Calculate similarity ratio between two strings."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def generate_summary():
    """Generate final summary of duplicate check."""
    
    file_path = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/model_card_claims_verification.json"
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    claims = data['claim_verifications']
    
    print("=" * 100)
    print(" " * 35 + "DUPLICATE CHECK SUMMARY")
    print("=" * 100)
    
    print("\n📊 OVERALL STATISTICS")
    print("-" * 100)
    print(f"Total claims in file: {len(claims)}")
    print(f"Claim ID range: claim_1 to claim_{len(claims)}")
    
    status_counts = Counter(claim['verification_status'] for claim in claims)
    print(f"\nVerification Status Distribution:")
    for status, count in sorted(status_counts.items()):
        print(f"  • {status}: {count}")
    
    # Check 1: Duplicate Claim IDs
    print("\n" + "=" * 100)
    print("✅ CHECK 1: DUPLICATE CLAIM IDs")
    print("-" * 100)
    claim_ids = [claim['claim_id'] for claim in claims]
    id_counts = Counter(claim_ids)
    duplicates = [k for k, v in id_counts.items() if v > 1]
    
    if duplicates:
        print(f"❌ FAILED: Found {len(duplicates)} duplicate claim IDs")
        for dup in duplicates:
            print(f"   - {dup} appears {id_counts[dup]} times")
    else:
        print("✅ PASSED: All 144 claim IDs are unique (claim_1 through claim_144)")
        print("   No duplicate claim IDs found")
    
    # Check 2: Duplicate Descriptions
    print("\n" + "=" * 100)
    print("✅ CHECK 2: DUPLICATE CLAIM DESCRIPTIONS")
    print("-" * 100)
    descriptions = [claim['claim_description'] for claim in claims]
    desc_counts = Counter(descriptions)
    dup_descs = [k for k, v in desc_counts.items() if v > 1]
    
    if dup_descs:
        print(f"❌ FAILED: Found {len(dup_descs)} duplicate descriptions")
        for desc in dup_descs[:5]:  # Show first 5
            matching_claims = [c['claim_id'] for c in claims if c['claim_description'] == desc]
            print(f"   - '{desc[:60]}...'")
            print(f"     Used in: {', '.join(matching_claims)}")
    else:
        print("✅ PASSED: All 144 claim descriptions are unique")
        print("   No exact duplicate descriptions found")
    
    # Check 3: Similar Descriptions
    print("\n" + "=" * 100)
    print("⚠️  CHECK 3: HIGHLY SIMILAR CLAIM DESCRIPTIONS (>90% similarity)")
    print("-" * 100)
    
    similar_pairs = []
    for i in range(len(claims)):
        for j in range(i + 1, len(claims)):
            desc1 = claims[i]['claim_description']
            desc2 = claims[j]['claim_description']
            similarity = similarity_ratio(desc1, desc2)
            
            if similarity > 0.90 and similarity < 1.0:
                similar_pairs.append({
                    'claim1': claims[i]['claim_id'],
                    'claim2': claims[j]['claim_id'],
                    'similarity': similarity,
                    'desc1': desc1,
                    'desc2': desc2
                })
    
    if similar_pairs:
        print(f"⚠️  WARNING: Found {len(similar_pairs)} pairs of highly similar descriptions")
        for pair in similar_pairs:
            print(f"\n   Similarity: {pair['similarity']:.2%}")
            print(f"   • {pair['claim1']}: {pair['desc1']}")
            print(f"   • {pair['claim2']}: {pair['desc2']}")
            
            # Analyze if these are legitimately different
            if 'LGD' in pair['desc1'] and 'EAD' in pair['desc2']:
                print(f"   ℹ️  NOTE: These describe different metrics (LGD vs EAD) - likely legitimate")
            elif 'train' in pair['desc1'] and 'test' in pair['desc2']:
                print(f"   ℹ️  NOTE: These describe different datasets (train vs test) - likely legitimate")
    else:
        print("✅ PASSED: No highly similar descriptions found")
    
    # Check 4: Sequence Completeness
    print("\n" + "=" * 100)
    print("✅ CHECK 4: CLAIM ID SEQUENCE COMPLETENESS")
    print("-" * 100)
    
    expected = set(f"claim_{i}" for i in range(1, 145))
    actual = set(claim_ids)
    
    missing = sorted(expected - actual, key=lambda x: int(x.split('_')[1]))
    extra = sorted(actual - expected)
    
    if missing:
        print(f"❌ FAILED: Missing {len(missing)} claim IDs from expected sequence")
        if len(missing) <= 10:
            print(f"   Missing: {', '.join(missing)}")
        else:
            print(f"   Missing: {', '.join(missing[:10])} ... and {len(missing) - 10} more")
    elif extra:
        print(f"⚠️  WARNING: Found {len(extra)} unexpected claim IDs")
        print(f"   Extra: {', '.join(extra)}")
    else:
        print("✅ PASSED: Complete sequence from claim_1 to claim_144")
        print("   All expected claim IDs are present, no gaps or extras")
    
    # Check 5: Evidence Reuse (Informational)
    print("\n" + "=" * 100)
    print("ℹ️  CHECK 5: EVIDENCE REUSE ACROSS CLAIMS (Informational)")
    print("-" * 100)
    
    evidence_map = {}
    for claim in claims:
        claim_id = claim['claim_id']
        for evidence in claim.get('evidence_found', []):
            source = evidence.get('source', '')
            cell_num = evidence.get('cell_number', '')
            text = evidence.get('evidence_text', '')
            
            key = f"{source}|{cell_num}|{text[:50]}"
            
            if key not in evidence_map:
                evidence_map[key] = []
            evidence_map[key].append(claim_id)
    
    shared_evidence = {k: v for k, v in evidence_map.items() if len(v) > 1}
    
    print(f"ℹ️  Found {len(shared_evidence)} pieces of evidence used in multiple claims")
    print("   (This is EXPECTED and NORMAL - same evidence can support multiple related claims)")
    
    # Show top 3 most reused
    if shared_evidence:
        sorted_evidence = sorted(shared_evidence.items(), key=lambda x: len(x[1]), reverse=True)[:3]
        print("\n   Top 3 most reused evidence:")
        for idx, (evidence_key, claim_ids) in enumerate(sorted_evidence, 1):
            source, cell, _ = evidence_key.split('|', 2)
            print(f"   {idx}. Used in {len(claim_ids)} claims ({source}, Cell {cell})")
            print(f"      Claims: {', '.join(sorted(set(claim_ids), key=lambda x: int(x.split('_')[1])))}")
    
    # Final Verdict
    print("\n" + "=" * 100)
    print("🎯 FINAL VERDICT")
    print("=" * 100)
    
    critical_issues = []
    warnings = []
    
    if duplicates:
        critical_issues.append("Duplicate claim IDs found")
    if dup_descs:
        critical_issues.append("Duplicate claim descriptions found")
    if missing:
        critical_issues.append("Missing claim IDs in sequence")
    
    if similar_pairs:
        warnings.append(f"{len(similar_pairs)} pairs of highly similar descriptions")
    if extra:
        warnings.append("Unexpected claim IDs found")
    
    if critical_issues:
        print("❌ DUPLICATE CHECK FAILED")
        print("\nCritical Issues:")
        for issue in critical_issues:
            print(f"  • {issue}")
    elif warnings:
        print("⚠️  DUPLICATE CHECK PASSED WITH WARNINGS")
        print("\nWarnings:")
        for warning in warnings:
            print(f"  • {warning}")
        print("\nRecommendation: Review warnings to ensure they are intentional")
    else:
        print("✅ DUPLICATE CHECK PASSED - FILE IS CLEAN!")
        print("\nAll checks passed:")
        print("  ✅ No duplicate claim IDs")
        print("  ✅ No duplicate descriptions")
        print("  ✅ No highly similar descriptions")
        print("  ✅ Complete sequence (claim_1 to claim_144)")
        print("  ℹ️  Evidence reuse is normal and expected")
    
    print("\n" + "=" * 100)
    print()

if __name__ == "__main__":
    generate_summary()

