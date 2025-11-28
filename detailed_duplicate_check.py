import json
from collections import Counter

def detailed_check(file_path):
    """Detailed analysis of claim IDs."""
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    claims = data['claim_verifications']
    
    print("=" * 80)
    print("DETAILED CLAIM ID ANALYSIS")
    print("=" * 80)
    
    # Extract all claim IDs
    claim_ids = [claim['claim_id'] for claim in claims]
    
    print(f"\nTotal claims in file: {len(claims)}")
    print(f"Total claim_id values: {len(claim_ids)}")
    print(f"Unique claim_id values: {len(set(claim_ids))}")
    
    # Count occurrences
    id_counts = Counter(claim_ids)
    
    print("\n" + "=" * 80)
    print("CLAIM ID FREQUENCY")
    print("=" * 80)
    
    # Show all IDs and their counts
    for claim_id, count in sorted(id_counts.items(), key=lambda x: int(x[0].split('_')[1]) if '_' in x[0] else 0):
        if count > 1:
            print(f"❌ {claim_id}: appears {count} times")
        else:
            print(f"✅ {claim_id}: appears {count} time")
    
    # If duplicates found, show details
    duplicates = {k: v for k, v in id_counts.items() if v > 1}
    
    if duplicates:
        print("\n" + "=" * 80)
        print("DUPLICATE DETAILS")
        print("=" * 80)
        
        for dup_id in sorted(duplicates.keys(), key=lambda x: int(x.split('_')[1]) if '_' in x else 0):
            print(f"\n{'='*60}")
            print(f"CLAIM ID: {dup_id} (appears {duplicates[dup_id]} times)")
            print('='*60)
            
            # Find all instances
            instances = [i for i, c in enumerate(claims) if c['claim_id'] == dup_id]
            
            for idx, pos in enumerate(instances, 1):
                claim = claims[pos]
                print(f"\nInstance {idx} (position {pos}):")
                print(f"  Description: {claim['claim_description'][:100]}...")
                print(f"  Status: {claim['verification_status']}")
                print(f"  Confidence: {claim['confidence_score']}")
                print(f"  Evidence count: {len(claim.get('evidence_found', []))}")
    
    # Check for gaps in sequence
    print("\n" + "=" * 80)
    print("SEQUENCE CHECK")
    print("=" * 80)
    
    expected = set(f"claim_{i}" for i in range(1, 145))
    actual = set(claim_ids)
    
    missing = sorted(expected - actual, key=lambda x: int(x.split('_')[1]))
    extra = sorted(actual - expected)
    
    if missing:
        print(f"\n❌ Missing from sequence: {len(missing)} claims")
        if len(missing) <= 20:
            print(f"   {', '.join(missing)}")
        else:
            print(f"   {', '.join(missing[:10])} ... and {len(missing) - 10} more")
    
    if extra:
        print(f"\n⚠️  Not in expected sequence: {extra}")
    
    if not missing and not extra:
        print("\n✅ All claim IDs from claim_1 to claim_144 are present exactly once")
    
    # Verification status breakdown
    print("\n" + "=" * 80)
    print("VERIFICATION STATUS BREAKDOWN")
    print("=" * 80)
    
    status_counts = Counter(claim['verification_status'] for claim in claims)
    for status, count in status_counts.items():
        print(f"  {status}: {count}")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    file_path = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/model_card_claims_verification.json"
    detailed_check(file_path)

