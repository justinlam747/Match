"""
Download real resume-job matching datasets from Hugging Face
and convert them into fine-tuning format for Qwen/Llama.

Datasets used:
  1. 0xnbk/resume-ats-score-v1-en — 6,370 resume+JD pairs with ATS scores (0-100)
  2. netsol/resume-score-details — 1,031 pairs with detailed multi-dimensional scoring

Output:
  data/train.jsonl  — training split (chat format for SFT)
  data/val.jsonl    — validation split
  data/stats.json   — dataset statistics

No API keys needed. All data is public + Apache 2.0 licensed.
"""

import json
import os
import random
from datasets import load_dataset

os.makedirs("data", exist_ok=True)

# ── 1. Load the ATS score dataset ──
print("Downloading resume-ats-score-v1-en (6,370 samples)...")
ats_dataset = load_dataset("0xnbk/resume-ats-score-v1-en")
print(f"  Train: {len(ats_dataset['train'])} | Val: {len(ats_dataset['validation'])}")

# ── 2. Load the detailed score dataset ──
print("Downloading resume-score-details (1,031 samples)...")
try:
    detail_dataset = load_dataset("netsol/resume-score-details")
    detail_data = detail_dataset["train"]
    print(f"  Loaded: {len(detail_data)} samples")
except Exception as e:
    print(f"  Warning: Could not load detail dataset ({e}), proceeding with ATS only")
    detail_data = None

# ── 3. Define the system prompt (same one used for inference) ──
SYSTEM_PROMPT = """You are an expert technical recruiter scoring resume-job matches. You must output ONLY valid JSON.

Score each dimension 0-25:
- techScore: How well the candidate's technical skills match the job requirements. 0=no overlap, 25=perfect match.
- industryScore: How relevant the candidate's industry experience is to this role/company. 0=unrelated, 25=exact domain.
- stageScore: How well the candidate's seniority and experience level fits what the role needs. 0=completely wrong level, 25=ideal level.
- hiringScore: Overall job-fit signal — does this person meet the core requirements? 0=no, 25=exceeds all requirements.

Also provide a 2-sentence explanation of the match quality.

Output format (ONLY this JSON, nothing else):
{"techScore": N, "industryScore": N, "stageScore": N, "hiringScore": N, "explanation": "..."}"""


def ats_score_to_dimensions(ats_score: float) -> dict:
    """
    Convert a single ATS score (0-100) into 4 dimensions (0-25 each).
    We use a heuristic split since the ATS dataset doesn't have sub-scores.

    The split ratios are based on ATS weighting research:
      - Tech/skills match: 35% weight
      - Industry/domain relevance: 25% weight
      - Experience level fit: 20% weight
      - Overall job requirements: 20% weight
    """
    total = max(0, min(100, ats_score))
    tech = round(total * 0.35 / 100 * 25)
    industry = round(total * 0.25 / 100 * 25)
    stage = round(total * 0.20 / 100 * 25)
    hiring = round(total * 0.20 / 100 * 25)

    # Redistribute rounding error
    diff = round(total) - (tech + industry + stage + hiring)
    tech = max(0, min(25, tech + diff))

    return {
        "techScore": tech,
        "industryScore": industry,
        "stageScore": stage,
        "hiringScore": hiring,
    }


def make_example_from_ats(row: dict) -> dict | None:
    """Convert an ATS dataset row into chat-format training example."""
    text = row.get("text", "")
    score = row.get("ats_score")

    if not text or score is None:
        return None

    # The text field contains resume + job description separated by SEP
    parts = text.split(" SEP ")
    if len(parts) < 2:
        # Try other separators
        for sep in ["\nSEP\n", "SEP", "\n---\n"]:
            parts = text.split(sep)
            if len(parts) >= 2:
                break

    if len(parts) < 2:
        return None

    resume_text = parts[0].strip()[:2000]  # Truncate long resumes
    jd_text = parts[1].strip()[:1500]

    if len(resume_text) < 50 or len(jd_text) < 50:
        return None

    dims = ats_score_to_dimensions(score)

    quality = "poor" if score < 30 else "weak" if score < 50 else "good" if score < 70 else "strong" if score < 85 else "excellent"
    explanation = f"This is a {quality} match with an overall score of {round(score)}/100. "
    if dims["techScore"] >= 7:
        explanation += "The candidate's technical skills show meaningful alignment with the role requirements."
    else:
        explanation += "There is limited technical overlap between the candidate's skills and role requirements."

    output = {**dims, "explanation": explanation}

    user_prompt = f"""Score this match:

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}"""

    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
            {"role": "assistant", "content": json.dumps(output)},
        ]
    }


def make_example_from_detail(row: dict) -> dict | None:
    """Convert a detail dataset row into chat-format training example."""
    try:
        # Handle both string and dict inputs
        if isinstance(row, str):
            data = json.loads(row)
        else:
            data = row

        inp = data.get("input", {})
        out = data.get("output", {})

        if not inp or not out:
            return None

        resume_text = inp.get("resume", "")[:2000]
        jd_text = inp.get("job_description", "")[:1500]

        if len(str(resume_text)) < 50 or len(str(jd_text)) < 50:
            return None

        # Extract scores
        scores = out.get("scores", {})
        agg = scores.get("aggregated_scores", {})
        macro = agg.get("macro_scores", 50)
        micro = agg.get("micro_scores", 50)

        if not isinstance(macro, (int, float)):
            macro = 50
        if not isinstance(micro, (int, float)):
            micro = 50

        # Map to our 4 dimensions
        overall = (macro + micro) / 2
        dims = ats_score_to_dimensions(overall)

        # Use justification if available
        justifications = out.get("justification", [])
        if justifications and isinstance(justifications, list):
            explanation = " ".join(str(j) for j in justifications[:2])[:300]
        else:
            explanation = f"Match score: {round(overall)}/100 based on macro ({round(macro)}) and micro ({round(micro)}) criteria alignment."

        output = {**dims, "explanation": explanation}

        user_prompt = f"""Score this match:

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}"""

        return {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
                {"role": "assistant", "content": json.dumps(output)},
            ]
        }
    except Exception:
        return None


# ── 4. Process all data ──
print("\nProcessing ATS dataset...")
all_examples = []

for row in ats_dataset["train"]:
    ex = make_example_from_ats(row)
    if ex:
        all_examples.append(ex)

for row in ats_dataset["validation"]:
    ex = make_example_from_ats(row)
    if ex:
        all_examples.append(ex)

print(f"  ATS examples: {len(all_examples)}")

if detail_data:
    print("Processing detail dataset...")
    detail_count = 0
    for row in detail_data:
        ex = make_example_from_detail(row)
        if ex:
            all_examples.append(ex)
            detail_count += 1
    print(f"  Detail examples: {detail_count}")

print(f"\nTotal examples: {len(all_examples)}")

# ── 5. Shuffle and split ──
random.seed(42)
random.shuffle(all_examples)

split_idx = int(len(all_examples) * 0.9)
train_examples = all_examples[:split_idx]
val_examples = all_examples[split_idx:]

# ── 6. Write JSONL files ──
with open("data/train.jsonl", "w", encoding="utf-8") as f:
    for ex in train_examples:
        f.write(json.dumps(ex, ensure_ascii=False) + "\n")

with open("data/val.jsonl", "w", encoding="utf-8") as f:
    for ex in val_examples:
        f.write(json.dumps(ex, ensure_ascii=False) + "\n")

# ── 7. Stats ──
stats = {
    "total_examples": len(all_examples),
    "train_examples": len(train_examples),
    "val_examples": len(val_examples),
    "sources": {
        "ats_score_dataset": "0xnbk/resume-ats-score-v1-en",
        "detail_dataset": "netsol/resume-score-details",
    },
    "format": "chat-completion JSONL (system + user + assistant messages)",
    "license": "Apache 2.0",
}

with open("data/stats.json", "w") as f:
    json.dump(stats, f, indent=2)

print(f"\n{'='*50}")
print(f"Done!")
print(f"  Train: data/train.jsonl ({len(train_examples)} examples)")
print(f"  Val:   data/val.jsonl ({len(val_examples)} examples)")
print(f"  Stats: data/stats.json")
print(f"\nNext steps:")
print(f"  1. Upload data/train.jsonl + data/val.jsonl to Google Colab")
print(f"  2. Run finetune-colab.py to fine-tune Qwen2.5-1.5B")
print(f"  3. Push to Hugging Face and use for free inference")
