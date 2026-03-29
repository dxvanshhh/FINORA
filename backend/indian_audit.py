"""
FINORA Indian Audit Utilities
- GSTIN validation (15-digit regex)
- UPI VPA extraction from transaction remarks
- 26AS TDS cross-check
"""

import re
from typing import Optional

# ──────────────────────────────────────────────
# 1. GSTIN VALIDATOR
# ──────────────────────────────────────────────
# Format: 22AAAAA0000A1Z5  (15 chars)
#   [0-1]  State code 01-37
#   [2-6]  PAN alpha
#   [7-10] PAN digits
#   [11]   PAN check letter
#   [12]   Entity code (1-9 or A-Z)
#   [13]   'Z' (default)
#   [14]   Check digit (0-9 or A-Z)

GSTIN_PATTERN = re.compile(
    r"^(?:0[1-9]|[12]\d|3[0-7])"   # state code 01-37
    r"[A-Z]{5}"                      # PAN letters
    r"\d{4}"                         # PAN digits
    r"[A-Z]"                         # PAN check
    r"[1-9A-Z]"                      # entity type
    r"Z"                             # fixed 'Z'
    r"[0-9A-Z]$"                     # check digit
)


def validate_gstin(gstin: Optional[str]) -> dict:
    """Validate a 15-digit Indian GSTIN and return structured result."""
    if not gstin or not isinstance(gstin, str):
        return {"valid": False, "gstin": gstin, "reason": "GSTIN is null or empty."}

    gstin = gstin.strip().upper()

    if len(gstin) != 15:
        return {"valid": False, "gstin": gstin, "reason": f"Must be 15 characters, got {len(gstin)}."}

    if not GSTIN_PATTERN.match(gstin):
        return {"valid": False, "gstin": gstin, "reason": "Does not match Indian GSTIN format."}

    state_code = int(gstin[:2])
    return {
        "valid": True,
        "gstin": gstin,
        "state_code": state_code,
        "pan": gstin[2:12],
        "reason": "Structurally valid GSTIN."
    }


# ──────────────────────────────────────────────
# 2. UPI VPA EXTRACTOR
# ──────────────────────────────────────────────
# Matches patterns like: name@okicici, shop123@ybl, vendor@upi, pay@paytm

UPI_VPA_PATTERN = re.compile(r"[a-zA-Z0-9._-]+@[a-zA-Z]{2,}")


def extract_upi_vpa(remarks: str) -> Optional[str]:
    """Extract a UPI Virtual Payment Address from transaction remarks text."""
    if not remarks:
        return None
    match = UPI_VPA_PATTERN.search(remarks)
    return match.group(0).lower() if match else None


# ──────────────────────────────────────────────
# 3. 26AS TDS CROSS-CHECK
# ──────────────────────────────────────────────

def check_tds_compliance(transactions: list, tds_entries: list = None) -> list:
    """
    Flag transactions > ₹30,000 that are missing a corresponding TDS entry.
    
    In production, `tds_entries` would come from a parsed Form 26AS.
    For now, we simulate by checking if transactions have a `tds_deducted` field.
    """
    if tds_entries is None:
        tds_entries = []

    tds_tx_ids = {e.get("transaction_id") for e in tds_entries}
    flags = []

    for t in transactions:
        amount = t.get("amount", 0)
        if amount > 30000:
            tx_id = t.get("id")
            has_tds = t.get("metadata", {}).get("tds_deducted", False)

            if not has_tds and tx_id not in tds_tx_ids:
                flags.append({
                    "transaction_id": tx_id,
                    "vendor_name": t.get("vendor_name", "Unknown"),
                    "amount": amount,
                    "pattern": "Missing TDS Entry",
                    "reason": f"Payment of ₹{amount:,.2f} to '{t.get('vendor_name')}' exceeds ₹30,000 but has no TDS deduction on record (26AS gap)."
                })

    return flags
