# Parallel Notebook Processing - Quick Start

## Overview

The CodeAct Agent now uses **massive parallel processing** to analyze notebooks quickly and efficiently. This guide shows how to use and configure this feature.

## What Changed

### Before (Sequential + Conversion)
```
Step 3: Processing notebooks...
Found 5 notebooks
Converting notebook 1/5... ⏱️ 2s
Converting notebook 2/5... ⏱️ 2s
Converting notebook 3/5... ⏱️ 2s
Converting notebook 4/5... ⏱️ 2s
Converting notebook 5/5... ⏱️ 2s
Total: ~10 seconds + conversion overhead
```

### After (Parallel Processing)
```
Step 3: Discovering code artifacts...
Found 5 notebooks ✓
Found 12 Python files ✓

Step 6: Processing 5 notebooks in parallel...
  [All 5 processed simultaneously] ⏱️ ~2s
Total: ~2 seconds (5x faster!)
```

## How It Works

1. **No Conversion Needed**: Agent works directly with `.ipynb` files
2. **Parallel Execution**: Multiple notebooks processed simultaneously using `ThreadPoolExecutor`
3. **Independent Processing**: Each notebook runs in its own thread
4. **Real-time Feedback**: Progress updates as each notebook completes
5. **Error Isolation**: One notebook failure doesn't affect others

## Configuration

### Default Settings

By default, the agent processes **5 notebooks in parallel**:

```python
agent = CardCheckAgent(
    workdir="/path/to/work",
    llm_provider="openai"
)
```

### Adjusting Parallel Workers

For repositories with many notebooks, you can increase the worker count:

```python
# In llm_extractor_tool.py, modify the default:
def extract_metrics_from_notebooks(
    self, 
    notebook_paths: List[str],
    claimed_metrics: Dict[str, Any],
    max_workers: int = 10  # Increase for more parallelism
) -> Dict[str, Any]:
```

**Guidelines:**
- **5 workers**: Good for 5-10 notebooks (default)
- **10 workers**: Good for 10-20 notebooks
- **20 workers**: Good for 20+ notebooks
- **CPU cores**: Don't exceed your CPU core count

### API Usage

When calling via API, the parallel processing happens automatically:

```bash
curl -X POST http://localhost:8001/verify/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-openai-api-key" \
  -H "X-LLM-Provider: openai" \
  -d '{
    "model_card_text": "...",
    "repo_path": "/path/to/repo",
    "llm_provider": "openai"
  }'
```

## Performance Benchmarks

| Notebooks | Sequential | Parallel (5 workers) | Speedup |
|-----------|------------|---------------------|---------|
| 5         | ~10s       | ~2s                 | 5x      |
| 10        | ~20s       | ~4s                 | 5x      |
| 20        | ~40s       | ~8s (10 workers)    | 5x      |
| 50        | ~100s      | ~10s (20 workers)   | 10x     |

*Times are approximate and depend on notebook size, LLM response time, and hardware.*

## Progress Monitoring

When processing notebooks, you'll see real-time progress:

```
Step 6: Extracting metrics from notebook outputs using LLM...
Processing 5 notebooks in parallel...
Processing 5 notebooks with 5 parallel workers...
  [1/5] Processed 1_data_cleaning_understanding.ipynb
  [2/5] Processed 2_eda.ipynb
  [3/5] Processed 3_pd_modeling.ipynb
  [4/5] Processed 4_lgd_ead_modeling.ipynb
  [5/5] Processed 5_pd_model_monitoring.ipynb
Completed parallel processing of 5 notebooks
Extracted 8 metrics from outputs
```

## Error Handling

If a notebook fails, the error is logged but other notebooks continue:

```
Processing 5 notebooks with 5 parallel workers...
  [1/5] Processed notebook_1.ipynb
  [2/5] Failed notebook_2.ipynb: Invalid JSON structure
  [3/5] Processed notebook_3.ipynb
  [4/5] Failed notebook_4.ipynb: Missing output cells
  [5/5] Processed notebook_5.ipynb
Completed parallel processing of 5 notebooks
Extracted 6 metrics from outputs (3 notebooks succeeded)
```

## What Gets Extracted

From each notebook, the LLM extracts:

- **Performance Metrics**: AUC, ROC-AUC, accuracy, precision, recall, F1
- **Statistical Measures**: KS statistic, Gini coefficient, R², RMSE, MAE
- **Dataset Info**: Training set size, test set size, split ratios
- **Custom Metrics**: Any other quantitative metrics in outputs

## Thread Safety

The implementation is thread-safe:
- Each notebook is read independently
- LLM API calls are concurrent-safe (OpenAI and Anthropic handle this)
- Results are merged safely using a single-threaded collector

## Troubleshooting

### Agent Still Seems Slow

**Check:**
1. LLM API response time (network latency)
2. Notebook size (very large notebooks take longer)
3. Number of output cells (more cells = more processing)

**Solutions:**
- Use faster LLM models (gpt-4o-mini, claude-3-haiku)
- Increase worker count if you have many notebooks
- Check network connection to LLM provider

### Memory Issues

If processing many large notebooks causes memory issues:

**Solution:**
1. Reduce `max_workers` to 3-5
2. Process notebooks in batches
3. Truncate very long outputs (already implemented at 8000 chars)

### Rate Limits

Some LLM providers have rate limits:

**OpenAI:**
- Free tier: ~3 requests/minute
- Paid tier: ~3500 requests/minute

**Anthropic:**
- Tier 1: ~50 requests/minute
- Higher tiers: More requests

**Solution:**
- Reduce `max_workers` if hitting rate limits
- Add delays between batches
- Upgrade your API tier

## Code Structure

```
agent_main.py
  ├─ Step 3: Find notebooks (no conversion)
  └─ Step 6: Extract metrics
      └─ llm_extractor_tool.py
          ├─ ThreadPoolExecutor (parallel workers)
          ├─ process_notebook() (per-notebook logic)
          │   ├─ _read_notebook_outputs()
          │   └─ _llm_extract_metrics()
          └─ Collect and merge results
```

## Testing the Fix

1. **Start the API server:**
   ```bash
   cd services/codeact_cardcheck
   python api_server.py
   ```

2. **Send a verification request:**
   ```bash
   curl -X POST http://localhost:8001/verify/stream \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-api-key" \
     -d '{
       "model_card_text": "# Model Card\n\n## Metrics\n...",
       "repo_path": "/path/to/Lending-Club-Credit-Scoring"
     }'
   ```

3. **Watch the progress:**
   - Step 3 should complete immediately (no conversion)
   - Step 6 should show parallel processing messages
   - All notebooks should be processed quickly

## Next Steps

- **Scale Up**: Try with larger repositories (20+ notebooks)
- **Tune Workers**: Adjust `max_workers` based on your use case
- **Monitor Performance**: Track processing times for optimization
- **Add Caching**: Consider caching extracted metrics for faster re-runs

## Related Documentation

- [CODEACT_AGENT_HANG_FIX.md](CODEACT_AGENT_HANG_FIX.md) - Technical details of the fix
- [LLM_INTEGRATION.md](services/codeact_cardcheck/LLM_INTEGRATION.md) - LLM provider setup
- [API Server Documentation](services/codeact_cardcheck/README.md) - API endpoints

## Support

If you encounter issues:
1. Check the agent logs for error messages
2. Verify LLM API key is set correctly
3. Ensure notebooks are not corrupted
4. Review the troubleshooting section above

