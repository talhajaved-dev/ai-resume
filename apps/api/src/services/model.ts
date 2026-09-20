export const LIVE_MODEL = {
  "schemaVersion": 1,
  "modelVersion": "resume-match-logistic-v1",
  "trainedAt": "2026-09-18T00:00:00.000Z",
  "seed": 20260918,
  "featureNames": [
    "semantic_similarity",
    "skill_coverage",
    "experience_alignment",
    "education_signal",
    "certification_signal"
  ],
  "means": [
    0.303937,
    0.457937,
    0.955556,
    0.333333,
    0.1
  ],
  "scales": [
    0.194724,
    0.469212,
    0.150206,
    0.471405,
    0.3
  ],
  "weights": [
    1.220511,
    2.724402,
    0.220853,
    0.431826,
    0.16601
  ],
  "bias": 0.179543,
  "threshold": 0.5,
  "embedding": {
    "kind": "feature-hashed-term-frequency",
    "dimensions": 256,
    "ngramRange": [
      1,
      2
    ]
  },
  "dataset": {
    "name": "Synthetic Resume\u2013Job Match Corpus v1",
    "license": "MIT",
    "records": 40
  },
  "evaluationFile": "evaluation-v1.json",
  "displayEvaluationFile": "legacy-evaluation-v1.json"
} as const;
export const LIVE_EVALUATION = {
  "modelVersion": "resume-match-logistic-v1",
  "generatedAt": "2026-09-18T00:00:00.000Z",
  "split": {
    "strategy": "deterministic stratified holdout",
    "seed": 20260918,
    "testFraction": 0.25,
    "trainingRecords": 30,
    "testRecords": 10
  },
  "metrics": {
    "accuracy": 1.0,
    "precision": 1.0,
    "recall": 1.0,
    "f1": 1.0
  },
  "confusionMatrix": [
    [
      5,
      0
    ],
    [
      0,
      5
    ]
  ],
  "comparison": [
    {
      "model": "Trained logistic classifier",
      "f1": 1.0
    }
  ]
} as const;
export const LIVE_SKILLS = [
  "python",
  "sql",
  "machine learning",
  "react",
  "typescript",
  "javascript",
  "aws",
  "docker",
  "kubernetes",
  "pandas",
  "numpy",
  "scikit-learn",
  "nlp",
  "tensorflow",
  "pytorch",
  "fastapi",
  "git",
  "figma",
  "azure",
  "spark",
  "tableau",
  "node",
  "testing",
  "terraform"
] as const;
