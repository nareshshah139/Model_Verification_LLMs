import json

# Read the claims file
with open('model_card_claims.json', 'r') as f:
    claims_data = json.load(f)

# Extract claims 80-100 (index 79-99)
claims_80_100 = []
for i in range(79, min(100, len(claims_data['claims']))):
    claim = claims_data['claims'][i]
    claims_80_100.append({
        'index': i + 1,
        'id': claim['id'],
        'category': claim['category'],
        'claim_type': claim.get('claim_type', ''),
        'description': claim['description'],
        'verification_strategy': claim.get('verification_strategy', ''),
        'search_queries': claim.get('search_queries', []),
        'expected_evidence': claim.get('expected_evidence', '')
    })

# Save to a separate file for processing
with open('claims_80_100_batch.json', 'w') as f:
    json.dump(claims_80_100, f, indent=2)

print(f'Extracted {len(claims_80_100)} claims (80-100)')
print('\nClaims 80-100 summary:')
for claim in claims_80_100:
    print(f"\nClaim {claim['index']}: {claim['id']}")
    print(f"  Category: {claim['category']}")
    print(f"  Description: {claim['description']}")

