#!/usr/bin/env python3
"""
Merge verification results for claims 80-100 into the main verification file
"""
import json
from datetime import datetime

def main():
    print("=" * 80)
    print("MERGING VERIFICATION RESULTS (Claims 80-100)")
    print("=" * 80)
    
    # Load existing verification file
    print("\n1. Loading existing verification file...")
    with open('model_card_claims_verification.json', 'r') as f:
        verification_data = json.load(f)
    
    print(f"   Current total verifications: {len(verification_data['claim_verifications'])}")
    
    # Load new verification results
    print("\n2. Loading new verification results...")
    
    # Load claims 80-85
    with open('claims_80_85_verification_results.json', 'r') as f:
        claims_80_85 = json.load(f)
    print(f"   Claims 80-85: {len(claims_80_85)} verifications")
    
    # Load claims 86-100
    with open('claims_86_100_verification_results.json', 'r') as f:
        claims_86_100 = json.load(f)
    print(f"   Claims 86-100: {len(claims_86_100)} verifications")
    
    # Load the original claims for descriptions
    print("\n3. Loading original claims for descriptions...")
    with open('model_card_claims.json', 'r') as f:
        claims_data = json.load(f)
    
    claims_dict = {claim['id']: claim for claim in claims_data['claims']}
    
    # Merge all new verifications
    all_new_verifications = claims_80_85 + claims_86_100
    print(f"\n4. Total new verifications to add: {len(all_new_verifications)}")
    
    # Convert to full format with descriptions and detailed evidence
    print("\n5. Converting to full verification format...")
    formatted_verifications = []
    
    for verification in all_new_verifications:
        claim_id = verification['claim_id']
        original_claim = claims_dict.get(claim_id, {})
        
        # Format evidence with more detail
        evidence_formatted = []
        for idx, evidence in enumerate(verification['evidence_found']):
            evidence_formatted.append({
                'source': f"notebooks/{evidence['notebook']}",
                'cell_number': evidence['cell_number'],
                'evidence_type': 'code' if evidence['cell_type'] == 'code' else 'documentation',
                'evidence_text': evidence['context'][:200],  # First 200 chars
                'relevance_score': verification['confidence_score']
            })
        
        formatted_verification = {
            'claim_id': claim_id,
            'claim_description': original_claim.get('description', ''),
            'verification_status': verification['verification_status'],
            'confidence_score': verification['confidence_score'],
            'evidence_found': evidence_formatted,
            'verification_notes': f"Verified using search across 5 notebooks. Found {len(evidence_formatted)} pieces of evidence."
        }
        
        formatted_verifications.append(formatted_verification)
        print(f"   ✓ Formatted {claim_id}: {verification['verification_status']}")
    
    # Remove any existing verifications for claims 80-100 (to avoid duplicates)
    print("\n6. Removing any existing verifications for claims 80-100...")
    existing_claims_to_keep = []
    for v in verification_data['claim_verifications']:
        claim_num = int(v['claim_id'].split('_')[1])
        if claim_num < 80 or claim_num > 100:
            existing_claims_to_keep.append(v)
    
    print(f"   Kept {len(existing_claims_to_keep)} existing verifications (outside 80-100 range)")
    print(f"   Removed {len(verification_data['claim_verifications']) - len(existing_claims_to_keep)} old verifications")
    
    # Merge and sort by claim number
    print("\n7. Merging and sorting verifications...")
    all_verifications = existing_claims_to_keep + formatted_verifications
    all_verifications.sort(key=lambda x: int(x['claim_id'].split('_')[1]))
    
    verification_data['claim_verifications'] = all_verifications
    
    # Update metadata
    print("\n8. Updating metadata...")
    verification_data['verification_metadata']['total_claims_verified'] = len(all_verifications)
    
    # Update summary counts
    verified_count = sum(1 for v in all_verifications if v['verification_status'] == 'verified')
    partially_verified_count = sum(1 for v in all_verifications if v['verification_status'] == 'partially_verified')
    not_verified_count = sum(1 for v in all_verifications if v['verification_status'] == 'not_verified')
    insufficient_count = sum(1 for v in all_verifications if v['verification_status'] == 'insufficient_evidence')
    
    verification_data['verification_metadata']['verification_summary'] = {
        'verified': verified_count,
        'partially_verified': partially_verified_count,
        'not_verified': not_verified_count,
        'insufficient_evidence': insufficient_count
    }
    
    # Update batches completed
    batch_exists = False
    for batch in verification_data['verification_metadata']['batches_completed']:
        if batch['claims_range'] == '80-100':
            batch['date'] = datetime.now().strftime('%Y-%m-%d')
            batch_exists = True
            break
    
    if not batch_exists:
        verification_data['verification_metadata']['batches_completed'].append({
            'batch_number': len(verification_data['verification_metadata']['batches_completed']) + 1,
            'claims_range': '80-100',
            'date': datetime.now().strftime('%Y-%m-%d')
        })
    
    # Sort batches by batch number
    verification_data['verification_metadata']['batches_completed'].sort(key=lambda x: x['batch_number'])
    
    # Save updated verification file
    print("\n9. Saving updated verification file...")
    with open('model_card_claims_verification.json', 'w') as f:
        json.dump(verification_data, f, indent=2)
    
    print("\n" + "=" * 80)
    print("✅ MERGE COMPLETE!")
    print("=" * 80)
    print(f"\nTotal verifications in file: {len(all_verifications)}")
    print(f"\nVerification Summary:")
    print(f"  ✓ Verified: {verified_count}")
    print(f"  ⚠ Partially Verified: {partially_verified_count}")
    print(f"  ✗ Not Verified: {not_verified_count}")
    print(f"  ? Insufficient Evidence: {insufficient_count}")
    print(f"\nBatches completed:")
    for batch in verification_data['verification_metadata']['batches_completed']:
        print(f"  - Batch {batch['batch_number']}: Claims {batch['claims_range']} ({batch['date']})")

if __name__ == '__main__':
    main()

