#!/usr/bin/env python3
"""
Script to count verification statuses and update the summary in model_card_claims_verification.json
"""
import json
from collections import Counter

def count_verifications():
    # Load the verification file
    with open('model_card_claims_verification.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Count verification statuses
    status_counter = Counter()
    claim_verifications = data.get('claim_verifications', [])
    
    print(f"Total claims found: {len(claim_verifications)}")
    print("\nCounting verification statuses...\n")
    
    for claim in claim_verifications:
        status = claim.get('verification_status', 'unknown')
        status_counter[status] += 1
        claim_id = claim.get('claim_id', 'unknown')
        print(f"  {claim_id}: {status}")
    
    print(f"\n{'='*60}")
    print("VERIFICATION STATUS SUMMARY")
    print('='*60)
    
    # Print sorted results
    for status in ['verified', 'partially_verified', 'not_verified', 'insufficient_evidence', 'unknown']:
        count = status_counter.get(status, 0)
        if count > 0:
            print(f"  {status}: {count}")
    
    print(f"  {'─'*56}")
    print(f"  TOTAL: {len(claim_verifications)}")
    print('='*60)
    
    # Update the verification_metadata in the data structure
    data['verification_metadata']['total_claims_verified'] = len(claim_verifications)
    data['verification_metadata']['verification_summary'] = {
        'verified': status_counter.get('verified', 0),
        'partially_verified': status_counter.get('partially_verified', 0),
        'not_verified': status_counter.get('not_verified', 0),
        'insufficient_evidence': status_counter.get('insufficient_evidence', 0)
    }
    
    # Save the updated file
    with open('model_card_claims_verification.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print("\n✓ Updated verification_metadata.verification_summary in the file")
    print("\nNew summary:")
    print(json.dumps(data['verification_metadata']['verification_summary'], indent=2))
    
    return status_counter, len(claim_verifications)

if __name__ == '__main__':
    count_verifications()

