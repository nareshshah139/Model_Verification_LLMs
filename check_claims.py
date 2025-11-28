import json

# Read the claims file
with open('model_card_claims.json', 'r') as f:
    claims_data = json.load(f)

print(f'Total claims: {len(claims_data["claims"])}')

# Show claims 80-85
print('\nClaims 80-85:')
for i in range(79, min(85, len(claims_data['claims']))):
    print(f'\n--- Claim {i+1} (ID: {claims_data["claims"][i]["id"]}) ---')
    print(f'Category: {claims_data["claims"][i]["category"]}')
    print(f'Description: {claims_data["claims"][i]["description"]}')

# Read verification file
with open('model_card_claims_verification.json', 'r') as f:
    verification_data = json.load(f)

print(f'\n\nTotal verifications: {len(verification_data["claim_verifications"])}')
print(f'Batches completed: {verification_data["verification_metadata"]["batches_completed"]}')

