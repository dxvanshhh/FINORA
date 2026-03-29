"""
FINORA — Adaptive ML Forensic Engine
Uses Isolation Forest with engineered features for real‑time anomaly detection.
Retrains every 50 new transactions for continual learning.
"""

import json
import os
import math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np

# ─── Try scikit-learn (optional dep) ───────────────────────────────────────────
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    SKLEARN_OK = True
except ImportError:
    SKLEARN_OK = False

# ─── Paths ─────────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).parent
FLAW_REGISTRY_PATH = BACKEND_DIR / "flaw_registry.json"
MODEL_STATE_PATH   = BACKEND_DIR / "ml_model_state.json"

RETRAIN_INTERVAL = 50   # retrain every N new transactions

# ─── Globals ───────────────────────────────────────────────────────────────────
_model: Optional[object] = None
_scaler: Optional[object] = None
_transactions_seen = 0  # counter since last train
_adaptation_log: list[str] = []   # in-memory log ring buffer (20 entries max)

# ─── State helpers ─────────────────────────────────────────────────────────────

def _load_flaw_registry() -> list:
    if FLAW_REGISTRY_PATH.exists():
        with open(FLAW_REGISTRY_PATH) as f:
            return json.load(f)
    return []


def _save_flaw_registry(registry: list):
    with open(FLAW_REGISTRY_PATH, "w") as f:
        json.dump(registry, f, indent=2)


def _log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    entry = f"[{ts}] {msg}"
    _adaptation_log.append(entry)
    if len(_adaptation_log) > 20:
        _adaptation_log.pop(0)


# ─── Feature Engineering ───────────────────────────────────────────────────────

def _build_features(txs: list) -> np.ndarray:
    """
    For each transaction produce a feature vector:
      [amount, hour_of_day, time_delta_secs, velocity_60min, vpa_trust_score,
       has_gstin, tds_flag, amount_ratio_to_regional]
    """
    # Sort by date
    sorted_txs = sorted(txs, key=lambda t: t.get("date", ""))
    date_map: dict[str, datetime] = {}
    for t in sorted_txs:
        try:
            date_map[t["id"]] = datetime.fromisoformat(t["date"])
        except Exception:
            date_map[t["id"]] = datetime.now()

    # VPA frequency (trust score = 1 / freq; rare VPAs get high score → suspicious)
    vpa_counts: dict[str, int] = {}
    for t in sorted_txs:
        vpa = (t.get("metadata") or {}).get("upi_vpa") or "unknown"
        vpa_counts[vpa] = vpa_counts.get(vpa, 0) + 1
    total_txs = max(len(sorted_txs), 1)

    rows = []
    for i, t in enumerate(sorted_txs):
        amount = float(t.get("amount", 0))
        dt = date_map[t["id"]]
        hour = dt.hour

        # time_delta: seconds since previous tx
        time_delta = 86400.0  # default 24h
        if i > 0:
            prev_dt = date_map[sorted_txs[i - 1]["id"]]
            time_delta = max((dt - prev_dt).total_seconds(), 1)

        # velocity: total amount in 60 min window before this tx
        window_start = dt - timedelta(hours=1)
        velocity = sum(
            float(sorted_txs[j].get("amount", 0))
            for j in range(i)
            if date_map[sorted_txs[j]["id"]] >= window_start
        )

        meta = t.get("metadata") or {}
        vpa = meta.get("upi_vpa") or "unknown"
        vpa_freq = vpa_counts.get(vpa, 1)
        vpa_trust_score = 1.0 - (vpa_freq / total_txs)   # rare → high → suspicious

        has_gstin = 1.0 if meta.get("gstin") else 0.0
        tds_flag  = 1.0 if meta.get("tds_deducted") else 0.0
        regional  = float(meta.get("regional_price_index") or amount)
        amount_ratio = amount / max(regional, 1)

        rows.append([amount, hour, time_delta, velocity, vpa_trust_score,
                     has_gstin, tds_flag, amount_ratio])

    return np.array(rows, dtype=float)


# ─── Model Training ────────────────────────────────────────────────────────────

def retrain_model(transactions: list):
    global _model, _scaler, _transactions_seen

    if not SKLEARN_OK:
        _log("scikit-learn not available — rule-based fallback active.")
        return

    if len(transactions) < 10:
        _log("Insufficient data (<10 txns) — skipping retrain.")
        return

    X = _build_features(transactions)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=150,
        contamination=0.05,   # expect ~5% anomalies
        random_state=42,
        warm_start=False,
    )
    model.fit(X_scaled)

    _model   = model
    _scaler  = scaler
    _transactions_seen = 0

    n = len(transactions)
    _log(f"Model retrained on {n} transactions. Baseline updated.")
    _log(f"Pattern Learned: {n} VPA signatures ingested. Contamination=5%.")

    # Persist light state
    state = {"trained_on": n, "retrained_at": datetime.now().isoformat()}
    with open(MODEL_STATE_PATH, "w") as f:
        json.dump(state, f)


def maybe_retrain(transactions: list):
    """Call this each time new transactions arrive."""
    global _transactions_seen
    _transactions_seen += 1
    if _model is None or _transactions_seen >= RETRAIN_INTERVAL:
        _log(f"Trigger: {_transactions_seen} new txns → retraining...")
        retrain_model(transactions)


# ─── Scoring ───────────────────────────────────────────────────────────────────

def score_transaction(tx: dict, all_txs: list) -> float:
    """
    Returns a risk_score in [0.0, 1.0].
    0.0 = clean, 1.0 = highly anomalous.
    """
    # 1. Check flaw registry first
    registry = _load_flaw_registry()
    meta = tx.get("metadata") or {}
    remarks = str(tx.get("vendor_name", "")) + " " + str(meta.get("raw_description", ""))

    for flaw in registry:
        pattern = flaw.get("pattern", "").lower()
        if pattern and pattern in remarks.lower():
            _log(f"Flaw Registry hit: '{flaw.get('name')}' matched → score=1.0")
            return 1.0

    if not SKLEARN_OK or _model is None:
        # Rule‑based fallback
        return _rule_based_score(tx, all_txs)

    # 2. ML scoring
    try:
        # Build features for the full set (keep ordering consistent)
        txs_with_target = [t for t in all_txs if t["id"] != tx["id"]] + [tx]
        X = _build_features(txs_with_target)
        X_scaled = _scaler.transform(X)               # type: ignore
        scores = _model.score_samples(X_scaled)        # type: ignore
        # Isolation Forest: more negative = more anomalous
        # Typical range for fitted data: ~[-0.25, 0.05]
        # Map so that -0.25 → 1.0 (anomaly) and 0.05 → 0.0 (normal)
        raw = float(scores[-1])
        lo, hi = -0.25, 0.05
        normalised = 1.0 - (raw - lo) / (hi - lo)
        return max(0.0, min(1.0, normalised))
    except Exception as e:
        _log(f"ML scoring error: {e} — fallback to rules")
        return _rule_based_score(tx, all_txs)


def _rule_based_score(tx: dict, all_txs: list) -> float:
    """Simple rule-based scorer as fallback."""
    score = 0.0
    amount = float(tx.get("amount", 0))
    meta = tx.get("metadata") or {}

    if 40000 <= amount < 50000:
        score += 0.4   # structuring range
    if amount > 150000:
        score += 0.2
    if not meta.get("gstin"):
        score += 0.25
    if not meta.get("tds_deducted") and amount > 30000:
        score += 0.15

    return min(score, 1.0)


# ─── LLM Forensic Layer ────────────────────────────────────────────────────────

GEMINI_API_KEY = "AIzaSyCGo15fC-PJ7sWiMqRYP_VG-pm5j9dEYWw"
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
)

FORENSIC_SYSTEM_PROMPT = """You are a Senior Indian Forensic Auditor specializing in financial crime detection.
Analyze the following transaction for social engineering indicators common in India:
- Phishing (urgent language, fake authority)
- SIM cloning / account takeover patterns
- Fake GST claims (invalid GSTIN formats, non-existent state codes)
- UPI structuring (splitting payments to avoid ₹50,000 PAN reporting)
Look specifically at the 'remarks' / vendor_name for high-pressure language.

Return ONLY a JSON object with:
{
  "confirmed": true/false,
  "risk_type": "Phishing|SIM_Clone|Fake_GST|UPI_Structuring|Social_Engineering|Clean",
  "confidence": 0.0-1.0,
  "reasoning": "one sentence",
  "new_pattern": "null or a short pattern string to add to registry"
}"""


def llm_analyze_transaction(tx: dict) -> dict:
    """Send medium-risk transaction to Gemini for deep forensic analysis."""
    import urllib.request
    import ssl

    meta = tx.get("metadata") or {}
    tx_summary = {
        "id": tx.get("id"),
        "amount_inr": tx.get("amount"),
        "vendor_name": tx.get("vendor_name"),
        "remarks": meta.get("raw_description", tx.get("vendor_name", "")),
        "upi_vpa": meta.get("upi_vpa"),
        "gstin": meta.get("gstin"),
        "tds_deducted": meta.get("tds_deducted"),
    }

    payload = {
        "contents": [{
            "parts": [
                {"text": FORENSIC_SYSTEM_PROMPT},
                {"text": f"Transaction: {json.dumps(tx_summary, ensure_ascii=False)}"}
            ]
        }],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 512}
    }

    try:
        body = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            GEMINI_URL, data=body,
            headers={"Content-Type": "application/json"}, method="POST"
        )
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, timeout=20, context=ctx) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        raw_text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "{}")
        )
        # Strip markdown fences if present
        raw_text = raw_text.strip().strip("```json").strip("```").strip()
        result = json.loads(raw_text)

        # Update flaw registry if LLM found a new pattern
        new_pattern = result.get("new_pattern")
        if new_pattern and new_pattern != "null":
            registry = _load_flaw_registry()
            existing = [f.get("pattern", "") for f in registry]
            if new_pattern not in existing:
                registry.append({
                    "name": result.get("risk_type", "Unknown"),
                    "pattern": new_pattern,
                    "discovered_at": datetime.now().isoformat(),
                    "source": "gemini-forensic-agent",
                })
                _save_flaw_registry(registry)
                _log(f"New pattern added to Flaw Registry: '{new_pattern}'")

        return result

    except Exception as e:
        _log(f"LLM analysis error: {e}")
        return {"confirmed": False, "risk_type": "Unknown", "confidence": 0.0,
                "reasoning": str(e), "new_pattern": None}


# ─── Exported API ──────────────────────────────────────────────────────────────

def get_adaptation_log() -> list[str]:
    return list(_adaptation_log)


def get_model_confidence() -> float:
    """Returns a 0-1 float representing overall model health."""
    if _model is None:
        return 0.15
    state_path = MODEL_STATE_PATH
    if state_path.exists():
        try:
            with open(state_path) as f:
                state = json.load(f)
            n = state.get("trained_on", 0)
            return min(0.5 + (n / 400), 0.99)
        except Exception:
            pass
    return 0.6
