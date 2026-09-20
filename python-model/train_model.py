#!/usr/bin/env python3
"""Train and evaluate the resume–job matching classifier.

This is the Python equivalent of scripts/src/train-resume-model.ts. It uses
only the Python standard library and writes JSON artifacts consumed by the API.

Usage:
    python3 artifacts/api-server/model/train_model.py

Optional paths:
    python3 artifacts/api-server/model/train_model.py \
      --dataset path/to/dataset.json \
      --model-output path/to/model.json \
      --evaluation-output path/to/evaluation.json
"""

from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Callable


SEED = 20260918
DIMENSIONS = 256
TEST_FRACTION = 0.25
EPOCHS = 2500
LEARNING_RATE = 0.08
L2_STRENGTH = 0.01
MODEL_VERSION = "resume-match-logistic-v1"
GENERATED_AT = "2026-09-18T00:00:00.000Z"

FEATURE_NAMES = [
    "semantic_similarity",
    "skill_coverage",
    "experience_alignment",
    "education_signal",
    "certification_signal",
]

SKILLS = [
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
    "terraform",
]

TOKEN_PATTERN = re.compile(r"[^a-z0-9+#.]+")
YEARS_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)", re.IGNORECASE
)
EDUCATION_PATTERN = re.compile(
    r"(bachelor|master|phd|doctorate|degree)", re.IGNORECASE
)
CERTIFICATION_PATTERN = re.compile(
    r"(certified|certification|fundamentals)", re.IGNORECASE
)


def round6(value: float) -> float:
    return float(f"{value:.6f}")


def tokenize(text: str) -> list[str]:
    normalized = TOKEN_PATTERN.sub(" ", text.lower()).strip()
    return normalized.split() if normalized else []


def fnv1a_32(value: str) -> int:
    """Match the unsigned 32-bit FNV-1a hash used by the TypeScript runtime."""
    result = 2166136261
    for character in value:
        result ^= ord(character)
        result = (result * 16777619) & 0xFFFFFFFF
    return result


def embed(text: str) -> list[float]:
    words = tokenize(text)
    grams = words + [
        f"{words[index]}_{words[index + 1]}"
        for index in range(len(words) - 1)
    ]
    counts = Counter(grams)
    vector = [0.0] * DIMENSIONS

    for gram, count in counts.items():
        sign = 1.0 if fnv1a_32(f"sign:{gram}") & 1 else -1.0
        vector[fnv1a_32(gram) % DIMENSIONS] += sign * (1.0 + math.log(count))

    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def cosine(left: list[float], right: list[float]) -> float:
    return sum(a * b for a, b in zip(left, right))


def extract_years(text: str) -> float:
    values = [float(match) for match in YEARS_PATTERN.findall(text)]
    return max(values, default=0.0)


def model_features(job: str, resume: str) -> list[float]:
    lower_job = job.lower()
    lower_resume = resume.lower()
    job_skills = [skill for skill in SKILLS if skill in lower_job]
    resume_skills = [skill for skill in SKILLS if skill in lower_resume]
    required_years = extract_years(job)
    resume_years = extract_years(resume)

    skill_coverage = (
        sum(skill in resume_skills for skill in job_skills) / len(job_skills)
        if job_skills
        else 0.0
    )
    experience_alignment = (
        min(1.0, resume_years / required_years)
        if required_years
        else min(1.0, resume_years / 3.0)
    )

    return [
        max(0.0, cosine(embed(job), embed(resume))),
        skill_coverage,
        experience_alignment,
        1.0 if EDUCATION_PATTERN.search(resume) else 0.0,
        1.0 if CERTIFICATION_PATTERN.search(resume) else 0.0,
    ]


def seeded_random(seed: int) -> Callable[[], float]:
    """Match the linear-congruential generator used by the TypeScript trainer."""
    state = seed & 0xFFFFFFFF

    def random_value() -> float:
        nonlocal state
        state = (1664525 * state + 1013904223) & 0xFFFFFFFF
        return state / 4294967296

    return random_value


def shuffle(items: list[dict], random_value: Callable[[], float]) -> list[dict]:
    shuffled = list(items)
    for index in range(len(shuffled) - 1, 0, -1):
        swap_index = math.floor(random_value() * (index + 1))
        shuffled[index], shuffled[swap_index] = (
            shuffled[swap_index],
            shuffled[index],
        )
    return shuffled


def sigmoid(value: float) -> float:
    clipped = max(-30.0, min(30.0, value))
    return 1.0 / (1.0 + math.exp(-clipped))


def train_and_evaluate(dataset: dict) -> tuple[dict, dict]:
    records = dataset["records"]
    random_value = seeded_random(SEED)
    training_records: list[dict] = []
    test_records: list[dict] = []

    for label in (0, 1):
        labelled = shuffle(
            [record for record in records if record["label"] == label],
            random_value,
        )
        test_count = round(len(labelled) * TEST_FRACTION)
        test_records.extend(labelled[:test_count])
        training_records.extend(labelled[test_count:])

    training_features = [
        model_features(record["job"], record["resume"])
        for record in training_records
    ]
    means = [
        sum(row[index] for row in training_features) / len(training_features)
        for index in range(len(FEATURE_NAMES))
    ]
    scales = [
        math.sqrt(
            sum((row[index] - means[index]) ** 2 for row in training_features)
            / len(training_features)
        )
        or 1.0
        for index in range(len(FEATURE_NAMES))
    ]

    def standardize(row: list[float]) -> list[float]:
        return [
            (value - means[index]) / scales[index]
            for index, value in enumerate(row)
        ]

    weights = [0.0] * len(FEATURE_NAMES)
    bias = 0.0

    for _ in range(EPOCHS):
        weight_gradients = [0.0] * len(FEATURE_NAMES)
        bias_gradient = 0.0

        for record, raw_row in zip(training_records, training_features):
            row = standardize(raw_row)
            probability = sigmoid(
                bias + sum(value * weights[index] for index, value in enumerate(row))
            )
            error = probability - record["label"]
            for index, value in enumerate(row):
                weight_gradients[index] += error * value
            bias_gradient += error

        count = len(training_records)
        weights = [
            weight
            - LEARNING_RATE
            * (weight_gradients[index] / count + L2_STRENGTH * weight)
            for index, weight in enumerate(weights)
        ]
        bias -= LEARNING_RATE * bias_gradient / count

    true_negative = false_positive = false_negative = true_positive = 0
    for record in test_records:
        row = standardize(model_features(record["job"], record["resume"]))
        probability = sigmoid(
            bias + sum(value * weights[index] for index, value in enumerate(row))
        )
        prediction = 1 if probability >= 0.5 else 0

        if record["label"] == 0 and prediction == 0:
            true_negative += 1
        elif record["label"] == 0 and prediction == 1:
            false_positive += 1
        elif record["label"] == 1 and prediction == 0:
            false_negative += 1
        else:
            true_positive += 1

    accuracy = (true_positive + true_negative) / len(test_records)
    precision = true_positive / max(1, true_positive + false_positive)
    recall = true_positive / max(1, true_positive + false_negative)
    f1_score = 2 * precision * recall / max(1e-12, precision + recall)

    model = {
        "schemaVersion": 1,
        "modelVersion": MODEL_VERSION,
        "trainedAt": GENERATED_AT,
        "seed": SEED,
        "featureNames": FEATURE_NAMES,
        "means": [round6(value) for value in means],
        "scales": [round6(value) for value in scales],
        "weights": [round6(value) for value in weights],
        "bias": round6(bias),
        "threshold": 0.5,
        "embedding": {
            "kind": "feature-hashed-term-frequency",
            "dimensions": DIMENSIONS,
            "ngramRange": [1, 2],
        },
        "dataset": {
            "name": dataset["name"],
            "license": dataset["license"],
            "records": len(records),
        },
        "evaluationFile": "evaluation-v1.json",
        "displayEvaluationFile": "legacy-evaluation-v1.json",
    }
    evaluation = {
        "modelVersion": MODEL_VERSION,
        "generatedAt": GENERATED_AT,
        "split": {
            "strategy": "deterministic stratified holdout",
            "seed": SEED,
            "testFraction": TEST_FRACTION,
            "trainingRecords": len(training_records),
            "testRecords": len(test_records),
        },
        "metrics": {
            "accuracy": round6(accuracy),
            "precision": round6(precision),
            "recall": round6(recall),
            "f1": round6(f1_score),
        },
        "confusionMatrix": [
            [true_negative, false_positive],
            [false_negative, true_positive],
        ],
        "comparison": [
            {"model": "Trained logistic classifier", "f1": round6(f1_score)}
        ],
    }
    return model, evaluation


def parse_args() -> argparse.Namespace:
    model_directory = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description="Train the resume–job logistic matching model."
    )
    parser.add_argument(
        "--dataset",
        type=Path,
        default=model_directory / "dataset-v1.json",
    )
    parser.add_argument(
        "--model-output",
        type=Path,
        default=model_directory / "model-v1.json",
    )
    parser.add_argument(
        "--evaluation-output",
        type=Path,
        default=model_directory / "evaluation-v1.json",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dataset = json.loads(args.dataset.read_text(encoding="utf-8"))
    model, evaluation = train_and_evaluate(dataset)

    args.model_output.parent.mkdir(parents=True, exist_ok=True)
    args.evaluation_output.parent.mkdir(parents=True, exist_ok=True)
    args.model_output.write_text(
        json.dumps(model, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    args.evaluation_output.write_text(
        json.dumps(evaluation, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(
        f"Wrote {model['modelVersion']}: "
        f"accuracy={evaluation['metrics']['accuracy']:.3f} "
        f"f1={evaluation['metrics']['f1']:.3f}"
    )


if __name__ == "__main__":
    main()