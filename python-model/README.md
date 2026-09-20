# Resume AI Python Model Package

## Files

- `train_model.py` — dependency-free Python trainer
- `dataset-v1.json` — 40 synthetic labelled training examples
- `model-v1.json` — trained logistic-classifier parameters used for live scoring
- `evaluation-v1.json` — generated 10-record holdout evaluation of the trained model
- `legacy-evaluation-v1.json` — original website's 124-record displayed benchmark

`model-v1.json` identifies both files:

- `evaluationFile`: generated trained-model evaluation
- `displayEvaluationFile`: original website benchmark shown on Model performance

## Run training

Requires Python 3.10+. No third-party packages are required.

```bash
python3 train_model.py
```

This retrains the live logistic classifier and overwrites `model-v1.json` and
`evaluation-v1.json`. It does not overwrite `legacy-evaluation-v1.json`, so the
old website's displayed benchmark remains unchanged.

## Original website benchmark

- Sample records: 124
- Accuracy: 0.855
- Precision: 0.818
- Recall: 0.783
- F1: 0.800
- Confusion matrix: `[[70, 8], [10, 36]]`
- Model F1 values: Logistic Regression 0.73, SVM 0.77, Naive Bayes 0.68,
  Random Forest 0.80

These are illustrative legacy demonstration results, not metrics calculated
from the bundled 40-record synthetic training dataset.

