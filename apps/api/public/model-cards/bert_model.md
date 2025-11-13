# Model Card: BERT Base Uncased

**Model Version:** bert-base-uncased-v1.0

## Model Overview

BERT (Bidirectional Encoder Representations from Transformers) is a transformer-based machine learning technique for natural language processing pre-training developed by Google.

## Model Details

- **Model Type:** Transformer-based Language Model
- **Architecture:** 12-layer, 768-hidden, 12-heads, 110M parameters
- **Training Data:** BooksCorpus (800M words) + English Wikipedia (2,500M words)
- **Vocabulary Size:** 30,522 wordpiece tokens
- **Max Sequence Length:** 512 tokens

## Intended Use

### Primary Uses
- Text classification
- Named entity recognition (NER)
- Question answering
- Sentence pair classification
- Token-level classification

### Out-of-Scope Uses
- Generation of long-form text (use GPT models instead)
- Real-time inference for latency-critical applications
- Languages other than English

## Training Procedure

### Pre-training Tasks
1. **Masked Language Modeling (MLM):** Randomly mask 15% of tokens and predict them
2. **Next Sentence Prediction (NSP):** Predict if sentence B follows sentence A

### Hyperparameters
- **Batch Size:** 256 sequences
- **Learning Rate:** 1e-4
- **Warmup Steps:** 10,000
- **Training Steps:** 1,000,000
- **Optimizer:** Adam with β₁=0.9, β₂=0.999

## Performance Metrics

### GLUE Benchmark Results

| Task | BERT-base | Previous SOTA |
|------|-----------|---------------|
| MNLI | 84.6      | 80.6          |
| QQP  | 71.2      | 66.1          |
| QNLI | 90.5      | 87.4          |
| SST-2| 93.5      | 93.2          |
| CoLA | 52.1      | 35.0          |
| STS-B| 85.8      | 81.0          |
| MRPC | 88.9      | 86.0          |
| RTE  | 66.4      | 61.7          |

### SQuAD Results
- **SQuAD v1.1 F1:** 88.5
- **SQuAD v1.1 EM:** 80.8
- **SQuAD v2.0 F1:** 76.3
- **SQuAD v2.0 EM:** 73.7

## Limitations

1. **Fixed Context Window:** Cannot handle sequences longer than 512 tokens
2. **Computational Cost:** Requires significant compute for fine-tuning
3. **English Only:** Pre-trained exclusively on English text
4. **Bias:** May exhibit biases present in training data
5. **Domain Shift:** Performance may degrade on specialized domains

## Bias and Fairness

BERT has been shown to exhibit various biases:
- Gender bias in pronoun resolution
- Racial and ethnic stereotypes
- Occupational biases

**Mitigation:** Always evaluate on domain-specific fairness metrics before deployment.

## Environmental Impact

- **Training CO2 Emissions:** ~1,438 lbs (652 kg)
- **Training Time:** ~4 days on 64 TPU chips
- **Training Location:** Google Cloud (Iowa, USA)

## Citation

```bibtex
@article{devlin2018bert,
  title={BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding},
  author={Devlin, Jacob and Chang, Ming-Wei and Lee, Kenton and Toutanova, Kristina},
  journal={arXiv preprint arXiv:1810.04805},
  year={2018}
}
```

## Model Maintenance

- **Last Updated:** October 2019
- **Maintenance Status:** Community-maintained
- **Known Issues:** See GitHub issues page

## Contact

For questions or issues, please open an issue on the Hugging Face Transformers repository.

