# Context Length Issue - Debug Guide

## 🔴 The Problem

You're getting this error when extracting claims:
```
Error code: 400 - {'error': {'message': "This model's maximum context length is 128000 tokens. 
However, your messages resulted in 672564 tokens. Please reduce the length of the messages."
```

## 📊 The Math Doesn't Add Up

- **Your model card**: 1,553 bytes (~400 tokens)
- **System prompt**: ~800 tokens
- **Total expected**: ~1,200 tokens
- **Actual sent**: 672,564 tokens (560x too much!)

Something is sending **2.7 million characters** instead of ~5,000.

## 🔍 What I've Added

I've added detailed logging to help diagnose this. When you run verification again, you'll now see:

```
[Claim Extractor] Model card length: XXXX chars
[Claim Extractor] System prompt length: YYYY chars
[Claim Extractor] User prompt length: ZZZZ chars
[Claim Extractor] Estimated total tokens: ~NNNN
```

If the model card length shows something like 2,700,000 chars instead of 1,553, we'll know exactly what's wrong!

## 🤔 Possible Causes

### 1. **Wrong File Being Read** (Most Likely)
   - Maybe the entire repository is being passed as "model_card_text"
   - Check: Does the log show model card > 100,000 chars?
   - Fix: Verify the path in the UI is correct

### 2. **Model Name Issue**
   - Currently using: `claude-3-5-sonnet-20241022`
   - Error says max 128K tokens (this model should support 200K)
   - Maybe your API key has an older model or different tier?
   - Fix: Try `claude-3-5-sonnet-20240620` instead

### 3. **Recursive/Loop Issue**
   - Maybe model card content is being duplicated in a loop
   - Check: Does the log show repeated content?

### 4. **API Library Issue**
   - Maybe the Anthropic library is encoding things wrong
   - Check: Does OpenAI work? (Switch to OpenAI in UI settings)

## 🔧 Immediate Fixes to Try

### Fix 1: Use a Different Model

Edit `services/codeact_cardcheck/tools/llm_claim_extractor.py` line 41:

```python
# Try this instead:
self.model = "claude-3-haiku-20240307"  # Smaller, faster, cheaper
```

Haiku has the same 200K context and is faster + cheaper for this task.

### Fix 2: Use OpenAI Instead

In the UI LLM Settings:
1. Switch to "openai" provider
2. Add your OpenAI API key
3. Try verification again

OpenAI's `gpt-4o-mini` handles this task well and is less likely to have context issues.

### Fix 3: Truncate Model Card (Temp Workaround)

Add this safety check in `agent_main.py` line 261:

```python
card_text = Path(model_card_path).read_text(encoding="utf-8")
# Safety truncation
if len(card_text) > 50000:  # 50KB max
    emit(f"WARNING: Model card is {len(card_text)} chars, truncating to 50KB")
    card_text = card_text[:50000]
```

## 🧪 Test Scripts Available

### Test Model Access
```bash
cd services/codeact_cardcheck
source venv/bin/activate
python test_anthropic.py <your-api-key>
```

### Test Claim Extraction  
```bash
cd services/codeact_cardcheck
source venv/bin/activate  
python test_claim_extraction.py <your-api-key> anthropic
```

## 📝 Next Steps

1. **Run verification again** - The new logs will tell us exactly what's being sent
2. **Check the logs** - Look for "Model card length" in the UI
3. **Share the output** - If still broken, share:
   - Model card length from logs
   - First/last 500 chars if > 100KB
   - Your Anthropic API key tier (if you know it)

## 💡 Quick Win

Try switching to OpenAI in the meantime - it might "just work" while we debug Anthropic.

---

**Updated:** 2025-11-13 17:50
**API Server:** Restarted with new logging (PID: 63482)

