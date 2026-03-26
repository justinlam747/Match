"""
YC Match — Fine-tune Qwen2.5-1.5B for resume-company scoring
=============================================================

Run this in Google Colab (free T4 GPU):
  1. Upload train.jsonl and val.jsonl to Colab
  2. Run all cells
  3. Model gets pushed to your Hugging Face account

Install: pip install unsloth transformers datasets huggingface_hub
"""

# ── Cell 1: Install dependencies ──
# !pip install -q unsloth transformers datasets huggingface_hub trl peft

# ── Cell 2: Imports ──
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer, SFTConfig
from transformers import TrainingArguments
import torch, json

# ── Cell 3: Load model with Unsloth (4-bit quantized, fits on free T4) ──
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Qwen2.5-1.5B-Instruct-bnb-4bit",  # Small, fast, free
    max_seq_length=2048,
    load_in_4bit=True,
)

# Add LoRA adapters (only trains ~2% of params)
model = FastLanguageModel.get_peft_model(
    model,
    r=16,              # LoRA rank
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                     "gate_proj", "up_proj", "down_proj"],
    bias="none",
    use_gradient_checkpointing="unsloth",
)

# ── Cell 4: Load training data ──
# Upload train.jsonl and val.jsonl to Colab first!

def format_chat(example):
    """Convert our JSONL chat format to the model's chat template."""
    messages = example["messages"]
    text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
    return {"text": text}

train_dataset = load_dataset("json", data_files="train.jsonl", split="train")
val_dataset = load_dataset("json", data_files="val.jsonl", split="train")

train_dataset = train_dataset.map(format_chat)
val_dataset = val_dataset.map(format_chat)

print(f"Train: {len(train_dataset)} examples")
print(f"Val:   {len(val_dataset)} examples")
print(f"\nSample:\n{train_dataset[0]['text'][:500]}...")

# ── Cell 5: Train ──
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    args=SFTConfig(
        output_dir="./yc-match-scorer",
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=2,
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_ratio=0.1,
        logging_steps=10,
        eval_strategy="steps",
        eval_steps=50,
        save_strategy="steps",
        save_steps=50,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        optim="adamw_8bit",
        seed=42,
        max_seq_length=2048,
        dataset_text_field="text",
        packing=True,  # Pack short examples together for efficiency
    ),
)

print("Starting training...")
stats = trainer.train()
print(f"\nTraining complete!")
print(f"  Loss: {stats.training_loss:.4f}")
print(f"  Runtime: {stats.metrics['train_runtime']:.0f}s")

# ── Cell 6: Test the model ──
FastLanguageModel.for_inference(model)

test_prompt = """Score this match:

CANDIDATE:
- Summary: Senior fullstack engineer, 5 years. TypeScript, React, Next.js, PostgreSQL, AWS.
- Skills: TypeScript, React, Next.js, Node.js, PostgreSQL, AWS, Docker
- Industries: Fintech, Developer Tools
- Seniority: senior (5 years)

COMPANY: PayFlex (YC W24, series_a)
- Description: API-first payment infrastructure for emerging markets.
- Tech stack: Go, TypeScript, React, PostgreSQL, AWS, Kubernetes
- Industries: Fintech, Payments, B2B
- Actively hiring: Yes"""

messages = [
    {"role": "system", "content": "You are an expert technical recruiter scoring resume-company matches. Output ONLY valid JSON with techScore, industryScore, stageScore, hiringScore (each 0-25), and explanation."},
    {"role": "user", "content": test_prompt},
]

inputs = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True, return_tensors="pt").to("cuda")
outputs = model.generate(input_ids=inputs, max_new_tokens=256, temperature=0.1)
result = tokenizer.decode(outputs[0][inputs.shape[-1]:], skip_special_tokens=True)
print(f"\nModel output:\n{result}")

# ── Cell 7: Push to Hugging Face ──
# First: run `huggingface-cli login` or set HF_TOKEN

HF_USERNAME = "YOUR_HF_USERNAME"  # ← Change this!
REPO_NAME = "yc-match-scorer"

model.push_to_hub_merged(
    f"{HF_USERNAME}/{REPO_NAME}",
    tokenizer,
    save_method="merged_16bit",  # Merge LoRA weights for easy inference
)
print(f"\nModel pushed to https://huggingface.co/{HF_USERNAME}/{REPO_NAME}")
print("You can now use it via the free HF Inference API!")
