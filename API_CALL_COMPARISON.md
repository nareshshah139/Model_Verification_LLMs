# 📊 API Call Comparison: Before vs After

## Visual Comparison

### ❌ OLD METHOD: `verify_claims_batch()`

For **5 claims**, makes **11 LLM API calls**:

```
Claim 1:  🔵 LLM Call #1  → Generate Code
          ⚙️  Execute Code (local)
          🔵 LLM Call #2  → Evaluate Result

Claim 2:  🔵 LLM Call #3  → Generate Code
          ⚙️  Execute Code (local)
          🔵 LLM Call #4  → Evaluate Result

Claim 3:  🔵 LLM Call #5  → Generate Code
          ⚙️  Execute Code (local)
          🔵 LLM Call #6  → Evaluate Result

Claim 4:  🔵 LLM Call #7  → Generate Code
          ⚙️  Execute Code (local)
          🔵 LLM Call #8  → Evaluate Result

Claim 5:  🔵 LLM Call #9  → Generate Code
          ⚙️  Execute Code (local)
          🔵 LLM Call #10 → Evaluate Result

Risk:     🔵 LLM Call #11 → Risk Assessment

─────────────────────────────────────────────
TOTAL: 11 API calls (2N + 1 where N=5)
```

---

### ✅ NEW METHOD: `verify_claims_batch_optimized()`

For **5 claims**, makes only **3 LLM API calls**:

```
Step 1:   🟢 LLM Call #1 → Generate ALL 5 codes at once
          ↓
          [code_1, code_2, code_3, code_4, code_5]

Step 2:   ⚙️  Execute code_1 (local)
          ⚙️  Execute code_2 (local)
          ⚙️  Execute code_3 (local)
          ⚙️  Execute code_4 (local)
          ⚙️  Execute code_5 (local)
          ↓
          [evidence_1, evidence_2, evidence_3, evidence_4, evidence_5]

Step 3:   🟢 LLM Call #2 → Evaluate ALL 5 results at once
          ↓
          [result_1, result_2, result_3, result_4, result_5]

Risk:     🟢 LLM Call #3 → Risk Assessment

─────────────────────────────────────────────
TOTAL: 3 API calls (constant, regardless of N!)
```

---

## 💰 Cost Savings Calculator

| # Claims | OLD Calls | NEW Calls | Savings | Reduction |
|----------|-----------|-----------|---------|-----------|
| 5 | 11 | 3 | 8 calls | 73% |
| 10 | 21 | 3 | 18 calls | 86% |
| 20 | 41 | 3 | 38 calls | 93% |
| 50 | 101 | 3 | 98 calls | 97% |
| 100 | 201 | 3 | 198 calls | 99% |

### Real Cost Example (Claude Sonnet 4.5)

Assuming ~$0.015 per API call (varies by tokens):

**10 Claims:**
- OLD: 21 × $0.015 = **$0.315** 💸
- NEW: 3 × $0.015 = **$0.045** 💰
- **Savings: $0.27 per verification (86% cheaper)**

**100 Claims:**
- OLD: 201 × $0.015 = **$3.015** 💸💸💸
- NEW: 3 × $0.015 = **$0.045** 💰
- **Savings: $2.97 per verification (99% cheaper)**

---

## ⚡ Speed Comparison

Assuming each API call takes ~2 seconds:

| # Claims | OLD Time | NEW Time | Time Saved |
|----------|----------|----------|------------|
| 5 | 22s | 6s | 16s (73%) |
| 10 | 42s | 6s | 36s (86%) |
| 20 | 82s | 6s | 76s (93%) |
| 50 | 202s | 6s | 196s (97%) |
| 100 | 402s (6.7min) | 6s | 396s (99%) |

---

## 🔑 Key Insight

The OLD method scales **linearly**: `2N + 1` calls  
The NEW method is **constant**: `3` calls (always!)

```
API Calls
    │
200 │                                    OLD (2N+1)
    │                                 ╱
150 │                              ╱
    │                           ╱
100 │                        ╱
    │                     ╱
 50 │                  ╱
    │               ╱
  3 │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  NEW (constant)
    │
  0 └─────┬─────┬─────┬─────┬─────┬────> Number of Claims
         10    20    30    40    50
```

---

## 🎯 Why This Works

### Batch Processing Benefits:

1. **LLMs are good at parallel tasks**: Modern LLMs can process multiple items in one call efficiently
2. **Context is shared**: All claims share the same tools/instructions
3. **JSON array output**: LLMs can reliably output structured arrays
4. **No loss in quality**: Same verification logic, just batched

### What Changed:

**Before**: 
- Generate code for 1 claim → Prompt: ~500 tokens
- Do this N times → Total: ~500N tokens

**After**:
- Generate code for N claims → Prompt: ~500 + (100 × N) tokens
- Do this once → Total: ~500 + 100N tokens

**Input tokens increase slightly, but we save N-1 API calls!**

---

## 📝 Code Example

### OLD: Sequential Processing

```python
# Process one claim at a time
for claim in claims:
    # LLM Call 1
    code = _generate_verification_code(claim)
    
    # Local execution (no LLM)
    evidence = _execute_verification_code(code)
    
    # LLM Call 2
    result = _evaluate_execution_result(claim, evidence, code)
    
    results.append(result)

# Total: 2N LLM calls
```

### NEW: Batch Processing

```python
# LLM Call 1: Generate all codes at once
codes = _generate_verification_code_batch(claims)  # Returns [code1, code2, ...]

# Local execution (no LLM)
evidences = [_execute_verification_code(code) for code in codes]

# LLM Call 2: Evaluate all results at once
evaluations = _evaluate_execution_results_batch(claims, evidences, codes)

# Total: 2 LLM calls (regardless of N!)
```

---

## 🚀 Usage

The optimized method is now the default:

```python
from tools.codeact_verifier import CodeActVerifier

verifier = CodeActVerifier(repo_path="...", llm_provider="anthropic")

# NEW: Use optimized batch method (recommended)
results = verifier.verify_claims_batch_optimized(claims)

# OLD: Still available if needed
# results = verifier.verify_claims_batch(claims, max_workers=1)
```

---

## 📈 Real-World Impact

For a typical model card with **15 claims**:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API Calls | 31 | 3 | 🚀 90% fewer |
| Time (est.) | ~62s | ~6s | ⚡ 10x faster |
| Cost (est.) | $0.47 | $0.05 | 💰 90% cheaper |

**For 100 verifications per month:**
- OLD: $47/month
- NEW: $5/month
- **Annual savings: ~$500** 💸

---

## ✅ Summary

✅ **3 API calls** instead of 2N+1  
✅ **85-99% cost reduction** (scales with N)  
✅ **85-99% faster** (scales with N)  
✅ **Same quality** (same verification logic)  
✅ **Better scalability** (constant vs linear)  
✅ **Rate limit friendly** (fewer API requests)

The bigger your batch, the better the savings! 🎉

