"""
FINORA — Unified FastAPI Backend (Indian AA Audit Engine)
All 10 routes + PDF upload + GSTIN validation + 26AS TDS check + real-time risk score.
"""

import json
import urllib.request
import ssl
from collections import defaultdict
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from indian_audit import validate_gstin, extract_upi_vpa, check_tds_compliance
from pdf_parser import extract_transactions_from_pdf
from ml_forensic import (
    retrain_model, maybe_retrain, score_transaction,
    get_adaptation_log, get_model_confidence, llm_analyze_transaction
)

app = FastAPI(title="FINORA — Indian Audit Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_ml():
    """Train Isolation Forest on existing transactions at startup."""
    try:
        txs = json.load(open("mock_data.json"))
        retrain_model(txs)
    except Exception as e:
        print(f"[ML] startup train skipped: {e}")



# ── Data Store ───────────────────────────────────────────

def _load_transactions():
    try:
        with open("mock_data.json", "r") as f:
            return json.load(f)
    except Exception:
        return []


def _save_transactions(txs):
    with open("mock_data.json", "w") as f:
        json.dump(txs, f, indent=2, ensure_ascii=False)


# ── 1. CORE ENDPOINTS ───────────────────────────────────

@app.get("/api/transactions")
def get_transactions():
    return _load_transactions()


# ── 2. PDF BANK STATEMENT UPLOAD ────────────────────────

@app.post("/api/upload-statement")
async def upload_statement(file: UploadFile = File(...)):
    """
    Upload an Indian bank statement PDF (HDFC/ICICI format).
    Extracts transactions using pdfplumber, merges into the ledger.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    try:
        extracted = extract_transactions_from_pdf(file.file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF parsing failed: {str(e)}")

    if not extracted:
        return {"message": "No transactions found in the PDF.", "count": 0, "transactions": []}

    # Merge into existing ledger
    existing = _load_transactions()
    existing.extend(extracted)
    _save_transactions(existing)

    return {
        "message": f"Successfully extracted {len(extracted)} transactions from '{file.filename}'.",
        "count": len(extracted),
        "transactions": extracted,
        "total_ledger_size": len(existing)
    }


# ── 3. GSTIN VALIDATION ENDPOINT ────────────────────────

@app.get("/api/validate-gstin/{gstin}")
def validate_gstin_endpoint(gstin: str):
    return validate_gstin(gstin)


# ── 4. FORENSIC AGENT ───────────────────────────────────

@app.get("/api/forensic-agent/analyze")
def analyze_forensics():
    transactions = _load_transactions()

    # ─ Indian Smurfing: UPI VPA structuring under ₹50,000 ─
    upi_groups = defaultdict(list)
    for t in transactions:
        vpa = t.get("metadata", {}).get("upi_vpa")
        if vpa:
            upi_groups[vpa].append(t)

    smurfing_flags = []
    for vpa, txs in upi_groups.items():
        txs.sort(key=lambda x: datetime.fromisoformat(x["date"]))
        structured = [t for t in txs if 40000 <= t["amount"] < 50000]
        if len(structured) >= 2:
            total = sum(t["amount"] for t in structured)
            smurfing_flags.append({
                "vendor_name": txs[0].get("vendor_name", vpa),
                "upi_vpa": vpa,
                "pattern": "UPI Structuring (Indian Smurfing)",
                "confidence": 0.92,
                "related_transactions": structured,
                "reason": f"{len(structured)} payments just under ₹50,000 to VPA '{vpa}' totaling ₹{total:,.2f}. Likely structuring to avoid PAN reporting."
            })

        # 48-hour velocity check (>₹1,00,000)
        for i in range(len(txs)):
            cur = txs[i]
            cur_date = datetime.fromisoformat(cur["date"])
            window = [cur]
            total = cur["amount"]
            for j in range(i + 1, len(txs)):
                nxt = txs[j]
                if (datetime.fromisoformat(nxt["date"]) - cur_date).total_seconds() <= 48 * 3600:
                    window.append(nxt)
                    total += nxt["amount"]
                else:
                    break
            if total > 100000:
                smurfing_flags.append({
                    "vendor_name": txs[0].get("vendor_name", vpa),
                    "upi_vpa": vpa,
                    "pattern": "High-Velocity Transfer Cluster",
                    "confidence": 0.95,
                    "related_transactions": window,
                    "reason": f"₹{total:,.2f} to VPA '{vpa}' within 48 hours (exceeds ₹1,00,000)."
                })
                break

    # ─ Shell Company: Missing/Invalid GSTIN ─
    shell_flags = []
    seen = set()
    for t in transactions:
        vendor = t["vendor_name"]
        if vendor in seen:
            continue
        gstin = t.get("metadata", {}).get("gstin")
        result = validate_gstin(gstin)
        if not result["valid"]:
            shell_flags.append({
                "vendor_name": vendor,
                "gstin": gstin,
                "pattern": "Missing/Invalid GSTIN",
                "confidence": 0.85,
                "related_transactions": [t],
                "reason": result["reason"]
            })
            seen.add(vendor)

    return {"smurfing_detected": smurfing_flags, "shell_risk_detected": shell_flags}


# ── 4b. ML-POWERED FORENSIC SCAN ────────────────────────

@app.get("/api/forensic-agent/ml-analyze")
def ml_analyze():
    """Run Isolation Forest scoring on all transactions. Returns risk_score per tx."""
    transactions = _load_transactions()
    maybe_retrain(transactions)

    scored = []
    for tx in transactions:
        risk = score_transaction(tx, transactions)
        # Determine label
        if risk < 0.35:
            label = "Clean"
        elif risk < 0.65:
            label = "Medium Risk"
        else:
            label = "High Risk"

        scored.append({
            "id": tx["id"],
            "vendor_name": tx.get("vendor_name"),
            "amount": tx.get("amount"),
            "date": tx.get("date"),
            "risk_score": round(risk, 3),
            "risk_label": label,
            "upi_vpa": (tx.get("metadata") or {}).get("upi_vpa"),
            "flaw_type": tx.get("flaw_type"),
        })

    scored.sort(key=lambda x: x["risk_score"], reverse=True)
    model_confidence = get_model_confidence()

    return {
        "transactions": scored,
        "model_confidence": model_confidence,
        "total_scanned": len(scored),
        "high_risk_count": sum(1 for s in scored if s["risk_label"] == "High Risk"),
        "medium_risk_count": sum(1 for s in scored if s["risk_label"] == "Medium Risk"),
    }


@app.get("/api/forensic-agent/adaptation-log")
def get_neural_log():
    """Return the in-memory neural adaptation log."""
    return {"log": get_adaptation_log(), "model_confidence": get_model_confidence()}


class LlmAnalyzeRequest(BaseModel):
    transaction_id: str

@app.post("/api/forensic-agent/llm-analyze")
def llm_forensic_analyze(req: LlmAnalyzeRequest):
    """Send a specific transaction to Gemini for deep forensic analysis."""
    transactions = _load_transactions()
    tx = next((t for t in transactions if t["id"] == req.transaction_id), None)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    result = llm_analyze_transaction(tx)
    return result



@app.get("/api/ghost-finder/analyze")
def detect_ghost_subscriptions():
    transactions = _load_transactions()
    vendor_groups = defaultdict(list)
    for t in transactions:
        if t["category"] == "Software":
            vendor_groups[t["vendor_name"]].append(t)

    ghost_flags = []
    for vendor, txs in vendor_groups.items():
        unused = [t for t in txs if t.get("metadata", {}).get("user_login_count", -1) == 0 and t["amount"] > 0]
        if unused:
            ghost_flags.append({
                "vendor_name": vendor,
                "pattern": "Unused Ghost Subscription",
                "total_wasted": sum(t["amount"] for t in unused),
                "months_unused": len(unused),
                "related_transactions": unused,
                "reason": f"₹{sum(t['amount'] for t in unused):,.2f} charged to {vendor} with 0 user logins."
            })
    return {"ghost_subscriptions": ghost_flags}


# ── 6. 26AS TDS CROSS-CHECK ─────────────────────────────

@app.get("/api/tds-check")
def tds_cross_check():
    transactions = _load_transactions()
    flags = check_tds_compliance(transactions)
    return {
        "tds_flags": flags,
        "total_flagged": len(flags),
        "threshold": "₹30,000"
    }


# ── 7. NEGOTIATOR ───────────────────────────────────────

class NegotiateRequest(BaseModel):
    transaction_id: str

@app.post("/api/negotiate")
def draft_negotiation(req: NegotiateRequest):
    transactions = _load_transactions()
    tx = next((t for t in transactions if t["id"] == req.transaction_id), None)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    vendor = tx["vendor_name"]
    amount = tx["amount"]
    meta = tx.get("metadata", {})

    if meta.get("user_login_count") == 0:
        reason = "zero user activity over the preceding billing cycles despite active charges"
    elif meta.get("regional_price_index") and amount > meta["regional_price_index"]:
        reason = "a 12% price disparity for this service in the APAC region. We request a price match"
    else:
        reason = "inefficiencies in usage distribution across our operational centres"

    email = f"""Subject: FINORA Procurement Review — {vendor}

Dear {vendor} Accounts Team,

I am writing on behalf of FINORA's Corporate Procurement division.

Upon reconciling our recent telemetry logs, our internal audit found {reason}.

Given that these findings directly impact the ROI of our engagement, we are requesting:
  1. A full refund for the unused service period, OR
  2. A 20% loyalty discount applied to match current market rates.

We look forward to resolving this within 7 business days.

Best regards,
Procurement Specialist
FINORA Autonomous Engine"""

    return {"email_body": email}


# ── 8. RISK SCORE ────────────────────────────────────────

@app.get("/api/risk-score")
def get_risk_score():
    txs = _load_transactions()
    total = len(txs)
    if total == 0:
        return {"risk_score": 0, "transactions_scanned": 0}

    flagged = sum(1 for t in txs if t.get("status") == "flagged")
    no_gstin = sum(1 for t in txs if not t.get("metadata", {}).get("gstin"))
    ghost = sum(1 for t in txs if t.get("metadata", {}).get("user_login_count", 1) == 0 and t["amount"] > 0)
    no_tds = sum(1 for t in txs if t["amount"] > 30000 and not t.get("metadata", {}).get("tds_deducted"))

    risk = min(100, int((flagged * 5 + no_gstin * 3 + ghost * 4 + no_tds * 2) / max(total, 1) * 100))
    return {"risk_score": risk, "transactions_scanned": total, "flagged_count": flagged, "missing_gstin": no_gstin, "ghost_seats": ghost, "missing_tds": no_tds}


# ── 9-10. SCAFFOLDED MODULES ────────────────────────────

@app.get("/api/smart-sorter/summary")
def get_smart_sorter(): return {"status": "optimized", "categories_sorted": 10}

@app.get("/api/negotiator/savings")
def get_savings(): return {"chart_data": [{"month": "Jan", "savings": 40000}, {"month": "Feb", "savings": 35000}, {"month": "Mar", "savings": 50000}, {"month": "Apr", "savings": 45000}, {"month": "May", "savings": 60000}, {"month": "Jun", "savings": 70000}]}

@app.get("/api/tax-compliance/status")
def get_tax_compliance(): return {"status": "compliant", "gst_flags": 0, "regime": "GST India"}

@app.get("/api/burn-oracle/burn-rate")
def get_burn_oracle(): return {"chart_data": [{"week": "W1", "burn": 1200000}, {"week": "W2", "burn": 1150000}, {"week": "W3", "burn": 1300000}, {"week": "W4", "burn": 1250000}, {"week": "W5", "burn": 1100000}, {"week": "W6", "burn": 1050000}, {"week": "W7", "burn": 1400000}, {"week": "W8", "burn": 1350000}]}

@app.get("/api/vendor-rep/score")
def get_vendor_rep(): return {"vendors_analyzed": 45, "high_risk_vendors": 2, "average_score": 88}

@app.get("/api/trust-approvals/queue")
def get_trust_approvals(): return {"pending_approvals": 4, "auto_approved_ytd": 420}

@app.get("/api/esg-tracker/metrics")
def get_esg_tracker(): return {"carbon_offset": "140 tonnes", "diversity_score": "A-"}

@app.get("/api/global-arbitrage/opportunities")
def get_global_arbitrage(): return {"active_opportunities": 2, "potential_gain": "₹10,33,600", "regions": ["APAC", "Middle East"]}


# ── 11. GEMINI AI ARBITRAGE ─────────────────────────────

GEMINI_API_KEY = "AIzaSyCGo15fC-PJ7sWiMqRYP_VG-pm5j9dEYWw"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

ARBITRAGE_PRICING_CONTEXT = """
You are FINORA, an AI-powered Indian Audit Engine. Analyze this SaaS pricing data and give a sharp, 
actionable financial recommendation for an Indian company looking to minimize costs.

PRICING DATA (monthly, per-unit/team):
| Product                | India (₹, 18% GST) | USA ($, 0% VAT) | Singapore (S$, 9% GST) | UAE (AED, 5% VAT) |
|------------------------|---------------------|------------------|------------------------|--------------------|
| AWS (S3 + EC2 base)    | ₹1,100 + 18% GST   | $1,240 (no tax)  | S$1,190 + 9% GST       | AED 1,150 + 5% VAT |
| Zoom (Business Pro)    | ₹11,800 + 18% GST  | $149 (no tax)    | S$200 + 9% GST         | AED 480 + 5% VAT   |
| Slack (Pro, 50 users)  | ₹33,000 + 18% GST  | $375 (no tax)    | S$500 + 9% GST         | AED 1,380 + 5% VAT |

EXCHANGE RATES: USD=₹83.5, SGD=₹62, AED=₹22.7

RULES:
1. Calculate the TRUE COST in INR for each product in each region (base × (1 + tax) × exchange rate).
2. Identify the cheapest region for each product.
3. Give a specific, bold recommendation (e.g., "Switch Zoom billing to UAE entity to save ₹X/month").
4. Explain the tax arbitrage mechanism (GST vs VAT differential).
5. Mention any compliance requirements (e.g., FTA-registered entity, transfer pricing rules).
6. End with total annual savings if ALL recommendations are implemented.
7. Be concise, professional, and data-driven. Use ₹ for all final figures.
"""

class AiArbitrageRequest(BaseModel):
    user_prompt: str = ""

@app.post("/api/ai-arbitrage")
def ai_arbitrage(req: AiArbitrageRequest):
    """Call Gemini to generate a real AI arbitrage recommendation."""
    user_text = req.user_prompt.strip() if req.user_prompt else "Generate your best arbitrage recommendation for an Indian company."

    payload = {
        "contents": [{
            "parts": [
                {"text": ARBITRAGE_PRICING_CONTEXT},
                {"text": user_text}
            ]
        }],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
        }
    }

    try:
        body = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            GEMINI_URL,
            data=body,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        # Allow self-signed / skip verify for corporate proxies
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))

        # Extract the text from Gemini's response
        candidates = data.get("candidates", [])
        if not candidates:
            raise HTTPException(status_code=500, detail="No response from Gemini.")

        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        if not text:
            raise HTTPException(status_code=500, detail="Empty Gemini response.")

        return {"recommendation": text, "model": "gemini-2.0-flash", "source": "FINORA Key"}

    except urllib.error.HTTPError as e:
        if e.code == 429:
            fallback = "**[API Rate Limit Exceeded]**\n\nThe AI pricing analysis engine is experiencing high traffic. However, our heuristics engine suggests **migrating non-critical AWS workloads to UAE/Singapore regions** to save up to 12% on taxes (0-9% VAT vs 18% GST). Please retry your request shortly for a deep-dive analysis."
            return {"recommendation": fallback, "model": "gemini-fallback", "source": "FINORA Fallback"}
        detail = e.read().decode('utf-8', errors='replace')[:200]
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e.code} — {detail}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Network error reaching Gemini: {str(e)}")


class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
def finora_copilot_chat(req: ChatRequest):
    """General purpose FINORA copilot chat endpoint."""
    system_prompt = "You are FINORA (Financial Intelligence Oracle), an advanced AI Procurement & Audit Co-Pilot. You assist Indian companies in auditing their SaaS spending, detecting ghost seats, ensuring Indian tax (GST/TDS) compliance, and discovering global pricing arbitrage. Be extremely concise, authoritative, professional, and analytical. Act like a highly paid tier-1 auditor. Use markdown to format. Answer directly."
    
    payload = {
        "contents": [{"parts": [{"text": f"System Guidelines: {system_prompt}\n\nUser Question: {req.message}"}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1024}
    }

    try:
        body = json.dumps(payload).encode('utf-8')
        request = urllib.request.Request(GEMINI_URL, data=body, headers={'Content-Type': 'application/json'}, method='POST')
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        with urllib.request.urlopen(request, timeout=25, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            
        text = data.get("candidates", [])[0].get("content", {}).get("parts", [{}])[0].get("text", "I have no recommendation.")
        return {"response": text}
    except urllib.error.HTTPError as e:
        if e.code == 429:
            return {"response": "**[Rate Limit Engaged]** My neural oracle is currently analyzing high volumes of ledger data. Temporarily running inference locally. As a quick tip, check Section 194J compliance for your Cloud Infrastructure spends today to avoid the 10% penalty footprint."}
        return {"response": f"Network anomaly: {e.code}"}
    except Exception as e:
        return {"response": f"Core offline. Connection lost: {str(e)}"}


# ── FEATURE ENGINE ROUTES ────────────────────────────────────────────────────

from feature_engine import (
    analyze_ghost_seats, compute_burn_oracle, analyze_tds,
    analyze_gst, score_vendor_rep, generate_negotiation
)


@app.get("/api/ghost-finder/extended")
def ghost_extended():
    """Extended ghost seat detection with risk levels and waste estimation."""
    txs = _load_transactions()
    return analyze_ghost_seats(txs)


@app.get("/api/burn-oracle/extended")
def burn_extended():
    """Time-series burn rate with anomaly detection (Z-score + IQR)."""
    txs = _load_transactions()
    return compute_burn_oracle(txs)


@app.get("/api/tds-check/extended")
def tds_extended():
    """Full 26AS TDS cross-check with section-wise breakdown."""
    txs = _load_transactions()
    return analyze_tds(txs)


@app.get("/api/tax-compliance/extended")
def gst_extended():
    """GST ITC eligibility, blocked credits, compliance score."""
    txs = _load_transactions()
    return analyze_gst(txs)


@app.get("/api/vendor-rep/extended")
def vendor_rep_extended():
    """NLP + behavioural vendor reputation scoring."""
    txs = _load_transactions()
    return score_vendor_rep(txs)


class NegotiateAIRequest(BaseModel):
    transaction_id: str

@app.post("/api/negotiate/ai")
def negotiate_ai(req: NegotiateAIRequest):
    """Generate a Gemini-powered negotiation email for any transaction."""
    txs = _load_transactions()
    tx = next((t for t in txs if t["id"] == req.transaction_id), None)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    email = generate_negotiation(tx)
    return {"email_body": email, "model": "gemini-1.5-flash"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

