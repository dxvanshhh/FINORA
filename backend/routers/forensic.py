"""
FINORA Forensic Agent — Indian Regulatory Intelligence
- GSTIN validation (15-digit Indian GST format)
- Indian Smurfing: UPI VPA structuring under ₹50,000 PAN reporting limit
- Shell Company: Invalid/missing GSTIN
"""

import re
import json
from datetime import datetime
from collections import defaultdict
from fastapi import APIRouter

router = APIRouter()


# --- GSTIN Validation ---

GSTIN_REGEX = re.compile(
    r"^[0-9]{2}"           # 2-digit state code (01-37)
    r"[A-Z]{5}"            # 5 letters of PAN
    r"[0-9]{4}"            # 4 digits of PAN
    r"[A-Z]{1}"            # 1 letter of PAN
    r"[1-9A-Z]{1}"         # entity type code
    r"Z"                   # default 'Z'
    r"[0-9A-Z]{1}$"        # check digit
)


def validate_gstin(gst_number: str) -> dict:
    """
    Validate a 15-digit Indian GSTIN.
    Format: 22AAAAA0000A1Z5
      - Positions 1-2:  State code (01-37)
      - Positions 3-7:  PAN alpha part
      - Positions 8-11: PAN numeric part
      - Position 12:    PAN check letter
      - Position 13:    Entity type
      - Position 14:    'Z' (default)
      - Position 15:    Check digit
    """
    if not gst_number or not isinstance(gst_number, str):
        return {"valid": False, "reason": "GSTIN is null or empty."}

    gst_number = gst_number.strip().upper()

    if len(gst_number) != 15:
        return {"valid": False, "reason": f"GSTIN must be 15 characters, got {len(gst_number)}."}

    if not GSTIN_REGEX.match(gst_number):
        return {"valid": False, "reason": "GSTIN format does not match the Indian regulatory pattern."}

    state_code = int(gst_number[:2])
    if state_code < 1 or state_code > 37:
        return {"valid": False, "reason": f"Invalid state code: {state_code}. Must be 01-37."}

    return {"valid": True, "reason": "GSTIN is structurally valid.", "state_code": state_code}


# --- Load transactions ---

def _load_transactions():
    try:
        with open("mock_data.json", "r") as f:
            return json.load(f)
    except Exception:
        return []


# --- Endpoints ---

@router.get("/analyze")
def analyze_forensics():
    transactions = _load_transactions()

    # ---- INDIAN SMURFING DETECTOR ----
    # Flag UPI VPAs receiving multiple payments just under ₹50,000
    # (PAN reporting threshold for cash/UPI aggregation)

    upi_groups = defaultdict(list)
    for t in transactions:
        vpa = t.get("metadata", {}).get("upi_vpa")
        if vpa:
            upi_groups[vpa].append(t)

    smurfing_flags = []

    for vpa, txs in upi_groups.items():
        txs.sort(key=lambda x: datetime.fromisoformat(x["date"]))

        # Find transactions just under ₹50,000 (between ₹40,000 and ₹49,999)
        structured_txs = [t for t in txs if 40000 <= t["amount"] < 50000]

        if len(structured_txs) >= 2:
            total = sum(t["amount"] for t in structured_txs)
            smurfing_flags.append({
                "vendor_name": txs[0].get("vendor_name", vpa),
                "upi_vpa": vpa,
                "pattern": "Indian Smurfing — UPI Structuring",
                "confidence": 0.92,
                "related_transactions": structured_txs,
                "reason": (
                    f"{len(structured_txs)} payments just under ₹50,000 to UPI VPA '{vpa}' "
                    f"totaling ₹{total:,.2f}. Likely structuring to avoid PAN reporting limits."
                )
            })

        # Also check 48-hour high-velocity window (legacy >₹1,00,000 rule)
        for i in range(len(txs)):
            current_tx = txs[i]
            current_date = datetime.fromisoformat(current_tx["date"])
            window_txs = [current_tx]
            total_amount = current_tx["amount"]

            for j in range(i + 1, len(txs)):
                next_tx = txs[j]
                next_date = datetime.fromisoformat(next_tx["date"])
                if (next_date - current_date).total_seconds() <= 48 * 3600:
                    window_txs.append(next_tx)
                    total_amount += next_tx["amount"]
                else:
                    break

            if total_amount > 100000:
                smurfing_flags.append({
                    "vendor_name": txs[0].get("vendor_name", vpa),
                    "upi_vpa": vpa,
                    "pattern": "High-Velocity Transfer Cluster",
                    "confidence": 0.95,
                    "related_transactions": window_txs,
                    "reason": (
                        f"₹{total_amount:,.2f} transferred to '{vpa}' within 48 hours, "
                        f"exceeding ₹1,00,000 threshold."
                    )
                })
                break

    # ---- SHELL COMPANY / GSTIN CHECK ----

    shell_flags = []
    flagged_vendors = set()

    for t in transactions:
        vendor = t["vendor_name"]
        if vendor in flagged_vendors:
            continue

        gstin = t.get("metadata", {}).get("gstin")
        if not gstin:
            shell_flags.append({
                "vendor_name": vendor,
                "pattern": "Missing GSTIN (Shell Risk)",
                "confidence": 0.85,
                "related_transactions": [t],
                "reason": f"Vendor '{vendor}' has no GSTIN on record."
            })
            flagged_vendors.add(vendor)
            continue

        validation = validate_gstin(gstin)
        if not validation["valid"]:
            shell_flags.append({
                "vendor_name": vendor,
                "pattern": "Invalid GSTIN (Shell Risk)",
                "confidence": 0.90,
                "related_transactions": [t],
                "reason": f"GSTIN '{gstin}' failed validation: {validation['reason']}"
            })
            flagged_vendors.add(vendor)

    return {
        "smurfing_detected": smurfing_flags,
        "shell_risk_detected": shell_flags
    }


@router.get("/validate-gstin/{gstin}")
def validate_gstin_endpoint(gstin: str):
    """Public endpoint to validate any GSTIN string."""
    return validate_gstin(gstin)
