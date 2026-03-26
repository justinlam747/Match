"""
YC Match — Local fine-tuning on RTX 4060 (8GB VRAM)
====================================================
Uses plain transformers + peft (no unsloth/triton needed).

Usage:  python scripts/train-local.py
Takes ~30-40 minutes on RTX 4060.
"""

import sys, io, os
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import load_dataset
from trl import SFTTrainer, SFTConfig

print("=" * 50)
print("YC Match - Local Model Training")
print(f"GPU: {torch.cuda.get_device_name(0)}")
print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
print("=" * 50)

MODEL_NAME = "Qwen/Qwen2.5-1.5B-Instruct"

# ── 1. Load model in 4-bit ──
print("\n[1/5] Loading model (4-bit quantized)...")
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
    torch_dtype=torch.bfloat16,
)

model = prepare_model_for_kbit_training(model)

# Add LoRA
lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                     "gate_proj", "up_proj", "down_proj"],
    bias="none",
    task_type="CAUSAL_LM",
)
model = get_peft_model(model, lora_config)

trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
total = sum(p.numel() for p in model.parameters())
print(f"  Trainable: {trainable:,} / {total:,} ({100*trainable/total:.1f}%)")

# ── 2. Load data ──
print("[2/5] Loading training data...")

def format_chat(example):
    text = tokenizer.apply_chat_template(
        example["messages"], tokenize=False, add_generation_prompt=False
    )
    return {"text": text}

train_dataset = load_dataset("json", data_files="data/train.jsonl", split="train")
val_dataset = load_dataset("json", data_files="data/val.jsonl", split="train")
train_dataset = train_dataset.map(format_chat)
val_dataset = val_dataset.map(format_chat)
print(f"  Train: {len(train_dataset)} | Val: {len(val_dataset)}")

# ── 3. Train ──
print("[3/5] Training (~30-40 min)...")

trainer = SFTTrainer(
    model=model,
    processing_class=tokenizer,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    args=SFTConfig(
        output_dir="./model-output",
        num_train_epochs=2,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_steps=20,
        logging_steps=25,
        eval_strategy="steps",
        eval_steps=200,
        save_strategy="epoch",
        bf16=True,
        optim="adamw_torch",
        seed=42,
        max_length=768,
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
    ),
)

stats = trainer.train()
print(f"\n  Loss: {stats.training_loss:.4f}")
print(f"  Runtime: {stats.metrics['train_runtime']:.0f}s")

# ── 4. Test ──
print("\n[4/5] Testing model...")
model.eval()

test_messages = [
    {"role": "system", "content": "You are an expert technical recruiter scoring resume-job matches. Output ONLY valid JSON with techScore, industryScore, stageScore, hiringScore (each 0-25), and explanation."},
    {"role": "user", "content": "Score this match:\n\nRESUME:\nSenior fullstack engineer, 5 years. TypeScript, React, Next.js, PostgreSQL, AWS.\n\nJOB DESCRIPTION:\nLooking for a senior backend engineer with Go, PostgreSQL, AWS to build payment APIs."},
]

inputs = tokenizer.apply_chat_template(test_messages, tokenize=True, add_generation_prompt=True, return_tensors="pt").to("cuda")

with torch.no_grad():
    outputs = model.generate(input_ids=inputs, max_new_tokens=256, temperature=0.1, do_sample=True)

result = tokenizer.decode(outputs[0][inputs.shape[-1]:], skip_special_tokens=True)
print(f"  Output: {result}")

# ── 5. Save ──
print("\n[5/5] Saving model...")
model.save_pretrained("./yc-match-scorer")
tokenizer.save_pretrained("./yc-match-scorer")

# Also merge and save for easier deployment
merged = model.merge_and_unload()
merged.save_pretrained("./yc-match-scorer-merged")
tokenizer.save_pretrained("./yc-match-scorer-merged")

print(f"\n{'='*50}")
print("Done! Model saved to ./yc-match-scorer-merged/")
print("\nTo push to HuggingFace:")
print("  huggingface-cli login")
print("  huggingface-cli upload YOUR_USERNAME/yc-match-scorer ./yc-match-scorer-merged")
print(f"{'='*50}")
