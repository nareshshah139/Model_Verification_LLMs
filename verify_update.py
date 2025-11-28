import json

data = json.load(open('model_card_claims_verification.json'))
verifications = data['claim_verifications']

claims_80_100 = [v for v in verifications if 80 <= int(v['claim_id'].split('_')[1]) <= 100]

print(f'✅ Claims 80-100 in verification file: {len(claims_80_100)}\n')
print('Sample verifications:')
for v in claims_80_100[:5]:
    print(f"  - {v['claim_id']}: {v['verification_status']} (confidence: {v['confidence_score']})")
    print(f"    {v['claim_description'][:90]}...")
    print()

print(f'\nTotal verifications: {len(verifications)}')
print(f"Metadata summary: {data['verification_metadata']['verification_summary']}")

