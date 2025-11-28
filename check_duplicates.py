import json
from collections import Counter
from difflib import SequenceMatcher

def similarity_ratio(a, b):
    """Calculate similarity ratio between two strings."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def check_duplicates(file_path):
    """Check for various types of duplicates in the verification file."""
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    claims = data['claim_verifications']
    
    print("=" * 80)
    print("DUPLICATE CHECK REPORT")
    print("=" * 80)
    print(f"\nTotal claims: {len(claims)}\n")
    
    # 1. Check for duplicate claim_id
    print("\n1. CHECKING FOR DUPLICATE CLAIM IDs")
    print("-" * 80)
    claim_ids = [claim['claim_id'] for claim in claims]
    id_counts = Counter(claim_ids)
    duplicates_found = False
    
    for claim_id, count in id_counts.items():
        if count > 1:
            duplicates_found = True
            print(f"❌ DUPLICATE: '{claim_id}' appears {count} times")
            # Show the indices where it appears
            indices = [i for i, c in enumerate(claims) if c['claim_id'] == claim_id]
            print(f"   Found at indices: {indices}")
    
    if not duplicates_found:
        print("✅ No duplicate claim IDs found")
    
    # 2. Check for duplicate descriptions (exact matches)
    print("\n2. CHECKING FOR DUPLICATE CLAIM DESCRIPTIONS (Exact)")
    print("-" * 80)
    descriptions = [claim['claim_description'] for claim in claims]
    desc_counts = Counter(descriptions)
    duplicates_found = False
    
    for desc, count in desc_counts.items():
        if count > 1:
            duplicates_found = True
            print(f"❌ DUPLICATE DESCRIPTION ({count} times):")
            print(f"   '{desc[:100]}...'")
            # Show which claims have this description
            matching_ids = [c['claim_id'] for c in claims if c['claim_description'] == desc]
            print(f"   Claims: {matching_ids}")
    
    if not duplicates_found:
        print("✅ No duplicate descriptions found (exact matches)")
    
    # 3. Check for highly similar descriptions (> 90% similarity)
    print("\n3. CHECKING FOR HIGHLY SIMILAR CLAIM DESCRIPTIONS (>90% similarity)")
    print("-" * 80)
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
        for pair in similar_pairs:
            print(f"⚠️  SIMILAR ({pair['similarity']:.2%}):")
            print(f"   {pair['claim1']}: {pair['desc1'][:80]}...")
            print(f"   {pair['claim2']}: {pair['desc2'][:80]}...")
            print()
    else:
        print("✅ No highly similar descriptions found")
    
    # 4. Check for duplicate evidence
    print("\n4. CHECKING FOR DUPLICATE EVIDENCE ACROSS CLAIMS")
    print("-" * 80)
    
    # Track evidence by source + cell_number + evidence_text
    evidence_map = {}
    
    for claim in claims:
        claim_id = claim['claim_id']
        for evidence in claim.get('evidence_found', []):
            source = evidence.get('source', '')
            cell_num = evidence.get('cell_number', '')
            text = evidence.get('evidence_text', '')
            
            key = f"{source}|{cell_num}|{text[:100]}"
            
            if key not in evidence_map:
                evidence_map[key] = []
            evidence_map[key].append(claim_id)
    
    # Find evidence used in multiple claims
    shared_evidence = {k: v for k, v in evidence_map.items() if len(v) > 1}
    
    if shared_evidence:
        print(f"ℹ️  Found {len(shared_evidence)} pieces of evidence used in multiple claims:")
        print("   (This is expected - same evidence can support multiple claims)")
        
        # Show top 5 most reused evidence
        sorted_evidence = sorted(shared_evidence.items(), key=lambda x: len(x[1]), reverse=True)[:5]
        for evidence_key, claim_ids in sorted_evidence:
            source, cell, text_preview = evidence_key.split('|', 2)
            print(f"\n   Used in {len(claim_ids)} claims: {', '.join(claim_ids)}")
            print(f"   Source: {source}, Cell: {cell}")
            print(f"   Text: {text_preview}...")
    else:
        print("ℹ️  No evidence is shared across claims")
    
    # 5. Check claim numbering sequence
    print("\n5. CHECKING CLAIM ID SEQUENCE")
    print("-" * 80)
    
    expected_ids = [f"claim_{i}" for i in range(1, len(claims) + 1)]
    actual_ids = [claim['claim_id'] for claim in claims]
    
    missing_ids = set(expected_ids) - set(actual_ids)
    unexpected_ids = set(actual_ids) - set(expected_ids)
    
    if missing_ids:
        print(f"⚠️  Missing claim IDs: {sorted(missing_ids, key=lambda x: int(x.split('_')[1]))}")
    
    if unexpected_ids:
        print(f"⚠️  Unexpected claim IDs: {sorted(unexpected_ids)}")
    
    if not missing_ids and not unexpected_ids:
        print("✅ Claim IDs are sequential and complete (claim_1 to claim_144)")
    
    # 6. Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total claims verified: {len(claims)}")
    print(f"Unique claim IDs: {len(set(claim_ids))}")
    print(f"Unique descriptions: {len(set(descriptions))}")
    print(f"Highly similar pairs: {len(similar_pairs)}")
    print(f"Shared evidence pieces: {len(shared_evidence)}")
    
    if len(set(claim_ids)) == len(claims) and not similar_pairs:
        print("\n✅ NO DUPLICATES FOUND - File is clean!")
    else:
        print("\n⚠️  Potential duplicates detected - review above for details")
    
    print("=" * 80)

if __name__ == "__main__":
    file_path = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/model_card_claims_verification.json"
    check_duplicates(file_path)

