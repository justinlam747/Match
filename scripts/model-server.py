"""
Local model inference server for YC Match scoring.
Loads the fine-tuned model once, serves scoring requests via HTTP.

Usage:  python scripts/model-server.py
Runs on http://localhost:8787

The Next.js app calls this instead of spawning Python per request.
"""

import sys, io, os, json
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from http.server import HTTPServer, BaseHTTPRequestHandler
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

MODEL_PATH = "./yc-match-scorer-merged"
PORT = 8787

print(f"Loading model from {MODEL_PATH}...")
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
)
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
model.eval()
print(f"Model loaded! GPU: {torch.cuda.get_device_name(0)}")


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/score":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length))

        system_prompt = body.get("system", "")
        user_prompt = body.get("prompt", "")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(text, return_tensors="pt").to("cuda")

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=256,
                temperature=0.1,
                do_sample=True,
            )

        result = tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"result": result}).encode())

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "model": MODEL_PATH}).encode())
            return
        self.send_error(404)

    def log_message(self, format, *args):
        # Quiet logging
        pass


print(f"Serving on http://localhost:{PORT}")
print("Endpoints: POST /score, GET /health")
HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
