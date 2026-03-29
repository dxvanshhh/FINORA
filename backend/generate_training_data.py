"""
FINORA — Training Data Generator
Generates 200 normal transactions + 3 sophisticated injected flaws.
Run: python generate_training_data.py
"""

import json
import uuid
import random
from datetime import datetime, timedelta

random.seed(2026)

VENDORS = [
    "Zoho Corp", "Freshworks", "Infosys", "Wipro", "TCS",
    "Amazon Web Services", "Google Cloud India", "Azure India",
    "Razorpay", "PhonePe Business", "Paytm for Business",
    "Swiggy Corporate", "Zomato Business", "Flipkart Wholesale",
    "Urban Company", "MakeMyTrip Corporate", "OYO Rooms Business",
    "BYJU's", "Unacademy", "Cleartax", "Zerodha Corporate",
]
CATEGORIES = [
    "Software", "Cloud Infrastructure", "Consulting", "Marketing",
    "Travel", "Meals", "Hardware", "Legal", "Logistics", "Office Supplies",
]
CITIES = ["Mumbai", "Delhi", "Bengaluru", "Pune", "Chennai", "Hyderabad",
          "Kolkata", "Ahmedabad", "Surat", "Jaipur"]
UPI_HANDLES = ["@okaxis", "@ybl", "@upi", "@paytm", "@okicici", "@okhdfcbank"]
# Valid state codes for GSTIN
VALID_STATE_CODES = ["07", "08", "19", "24", "27", "29", "33", "36"]

BASE_DATE = datetime(2026, 1, 1)


def random_gstin(state_code=None):
    if state_code is None:
        state_code = random.choice(VALID_STATE_CODES)
    pan = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=5))
    pan += "".join(random.choices("0123456789", k=4))
    pan += random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    suffix = random.choice("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    check = random.choice("ZABC")
    return f"{state_code}{pan}1Z{check}"


def random_tx(date_offset_days: float, amount_range=(1000, 195000)):
    date = BASE_DATE + timedelta(days=date_offset_days, hours=random.randint(8, 20))
    amount = round(random.uniform(*amount_range), 2)
    vendor = random.choice(VENDORS)
    vpa_user = f"vendor{random.randint(100, 999)}"
    vpa = vpa_user + random.choice(UPI_HANDLES)
    return {
        "id": str(uuid.uuid4()),
        "date": date.isoformat(),
        "amount": amount,
        "currency": "INR",
        "vendor_name": vendor,
        "category": random.choice(CATEGORIES),
        "status": random.choice(["approved", "approved", "pending"]),
        "risk_score": 0.0,
        "metadata": {
            "gstin": random_gstin() if random.random() > 0.15 else None,
            "ifsc": f"HDFC{random.randint(1000000, 9999999)}",
            "upi_vpa": vpa,
            "pan": "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=5))
                   + "".join(random.choices("0123456789", k=4))
                   + random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
            "location": random.choice(CITIES),
            "employee_id": f"EMP-{random.randint(100, 999)}",
            "user_login_count": random.randint(1, 50),
            "tds_deducted": random.random() > 0.45,
            "regional_price_index": round(amount * random.uniform(0.85, 1.15), 2),
            "raw_description": f"Payment to {vendor} - Invoice #{random.randint(10000,99999)}",
        },
    }


def medium_risk_tx(date: datetime, vendor: str, amount: float, reason: str, logins: int = 2):
    """Transactions with a real but moderate anomaly."""
    vpa = f"vendor{random.randint(100,999)}@{random.choice(['ybl','upi','paytm'])}"
    return {
        "id": str(uuid.uuid4()),
        "date": date.isoformat(),
        "amount": amount,
        "currency": "INR",
        "vendor_name": vendor,
        "category": random.choice(["Software", "Consulting", "Cloud Infrastructure"]),
        "status": "approved",
        "risk_label_hint": "Medium Risk",
        "risk_reason": reason,
        "metadata": {
            "gstin": random_gstin() if random.random() > 0.4 else None,
            "ifsc": f"ICIC{random.randint(1000000, 9999999)}",
            "upi_vpa": vpa,
            "pan": "A" * 5 + str(random.randint(1000, 9999)) + "Z",
            "location": random.choice(CITIES),
            "employee_id": f"EMP-{random.randint(100, 900)}",
            "user_login_count": logins,
            "tds_deducted": random.random() > 0.6,
            "regional_price_index": round(amount * random.uniform(0.7, 0.95), 2),
            "raw_description": f"{vendor} - auto-renew subscription {reason[:30]}",
        },
    }


def low_risk_tx(date: datetime):
    """Clean, fully compliant transactions that should score near zero."""
    vendor = random.choice(["Zoho Corp", "Freshworks", "TCS", "Infosys", "Amazon Web Services"])
    amount = round(random.uniform(5000, 50000), 2)
    vpa = f"corp.{vendor.split()[0].lower()}@okicici"
    return {
        "id": str(uuid.uuid4()),
        "date": date.isoformat(),
        "amount": amount,
        "currency": "INR",
        "vendor_name": vendor,
        "category": random.choice(["Software", "Cloud Infrastructure"]),
        "status": "approved",
        "risk_label_hint": "Clean",
        "metadata": {
            "gstin": random_gstin(),  # Always has valid GSTIN
            "ifsc": f"HDFC{random.randint(1000000, 9999999)}",
            "upi_vpa": vpa,
            "pan": "".join(random.choices("ABCDEFGHIJKLMNOP", k=5)) + str(random.randint(1000,9999)) + "A",
            "location": random.choice(["Mumbai", "Bengaluru", "Pune"]),
            "employee_id": f"EMP-{random.randint(100, 500)}",
            "user_login_count": random.randint(10, 50),   # High usage
            "tds_deducted": True,                          # Always TDS-compliant
            "regional_price_index": round(amount * random.uniform(0.98, 1.02), 2),  # Fair price
            "raw_description": f"Approved recurring payment - {vendor} Ent License",
        },
    }


def generate():
    txs = []
    BASE = datetime(2026, 1, 1)

    # ── 200 Normal Transactions ──────────────────────────────────────────────────
    for i in range(200):
        offset = random.uniform(0, 365)
        txs.append(random_tx(offset))

    # ── 30 Explicitly Clean/Low-Risk ────────────────────────────────────────────
    for i in range(30):
        d = BASE + timedelta(days=random.uniform(0, 90), hours=random.randint(9, 17))
        txs.append(low_risk_tx(d))

    # ── 20 Medium-Risk Scenarios ─────────────────────────────────────────────────

    # 1. Dormant SaaS — paid but almost never used
    for i in range(5):
        d = BASE + timedelta(days=random.uniform(0, 60), hours=random.randint(10, 18))
        txs.append(medium_risk_tx(d, f"SlackPro Team-{i+1}", random.uniform(12000, 28000),
                                  "subscription renewed / 1 login last 30 days", logins=1))

    # 2. Late-night micro-structuring (₹29k range, just under TDS threshold)
    for i in range(5):
        d = BASE + timedelta(days=random.uniform(5, 120), hours=random.randint(22, 23))
        txs.append(medium_risk_tx(d, f"Creative Studio {i+1}", 29800 + random.uniform(0, 100),
                                  "payment near TDS threshold at unusual hour", logins=3))

    # 3. Price anomaly — 50–70% above regional index
    for i in range(5):
        base_amt = random.uniform(60000, 120000)
        d = BASE + timedelta(days=random.uniform(30, 180))
        t = medium_risk_tx(d, f"Global IT Solutions {i+1}", base_amt,
                            "invoice 60% above regional benchmark", logins=8)
        t["metadata"]["regional_price_index"] = round(base_amt * 0.55, 2)
        txs.append(t)

    # 4. Missing TDS on large Software invoices
    for i in range(5):
        d = BASE + timedelta(days=random.uniform(10, 200))
        t = medium_risk_tx(d, f"ConsultEase Pvt Ltd {i+1}", random.uniform(45000, 95000),
                            "TDS section 194J likely applicable but not deducted", logins=12)
        t["metadata"]["tds_deducted"] = False
        t["metadata"]["gstin"] = None   # adds missing-GSTIN medium signal too
        txs.append(t)

    # ── HIGH RISK FLAWS ───────────────────────────────────────────────────────────

    # FLAW 1: The Smurfer — 10 × ₹19,999 in 5 min
    smurfer_base = datetime(2026, 3, 15, 14, 0, 0)
    for i in range(10):
        vpa = f"smurf{random.randint(1000, 9999)}@upi"
        txs.append({
            "id": str(uuid.uuid4()),
            "date": (smurfer_base + timedelta(seconds=i*30)).isoformat(),
            "amount": 19999.0,
            "currency": "INR",
            "vendor_name": f"Unknown Vendor {i+1}",
            "category": "Consulting",
            "status": "pending",
            "risk_score": 0.0,
            "flaw_type": "SMURFER",
            "metadata": {
                "gstin": None, "ifsc": f"SBIN{random.randint(1000000, 9999999)}",
                "upi_vpa": vpa, "pan": None, "location": "Unknown",
                "employee_id": None, "user_login_count": 0,
                "tds_deducted": False, "regional_price_index": 19999.0,
                "raw_description": f"UPI transfer to {vpa} REF#{random.randint(100000,999999)}",
            },
        })

    # FLAW 2: Ghost GST (state code 99)
    ghost_gstin = random_gstin(state_code="99")
    txs.append({
        "id": str(uuid.uuid4()),
        "date": datetime(2026, 3, 20, 11, 30).isoformat(),
        "amount": 485000.0, "currency": "INR",
        "vendor_name": "Shri Balaji Enterprises Pvt Ltd",
        "category": "Hardware", "status": "approved",
        "flaw_type": "GHOST_GST",
        "metadata": {
            "gstin": ghost_gstin, "ifsc": "ICIC0000099",
            "upi_vpa": "balaji99@ybl", "pan": "AABCS1429B",
            "location": "Unknown State", "employee_id": "EMP-099",
            "user_login_count": 1, "tds_deducted": False,
            "regional_price_index": 200000.0,
            "raw_description": "Hardware supply against PO 99-2026-FAKE",
        },
    })

    # FLAW 3: Social Engineer
    txs.append({
        "id": str(uuid.uuid4()),
        "date": datetime(2026, 3, 22, 9, 15).isoformat(),
        "amount": 4999.0, "currency": "INR",
        "vendor_name": "URGENT: DISCONNECT ELECTRICITY RECHARGE NOW",
        "category": "Utilities", "status": "pending",
        "flaw_type": "SOCIAL_ENGINEER",
        "metadata": {
            "gstin": None, "ifsc": "SCBL0036078",
            "upi_vpa": "discom.helpdesk99@ybl",
            "pan": None, "location": "Unknown",
            "employee_id": None, "user_login_count": 0,
            "tds_deducted": False, "regional_price_index": 499.0,
            "raw_description": "URGENT: DISCONNECT ELECTRICITY RECHARGE NOW - LAST WARNING",
        },
    })

    txs.sort(key=lambda t: t["date"])
    return txs


if __name__ == "__main__":
    data = generate()
    out_path = "mock_data.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    flaws   = [t for t in data if t.get("flaw_type")]
    medium  = [t for t in data if t.get("risk_label_hint") == "Medium Risk"]
    clean   = [t for t in data if t.get("risk_label_hint") == "Clean"]
    normal  = len(data) - len(flaws) - len(medium) - len(clean)
    print(f"✅ Generated {len(data)} transactions: {normal} normal | {len(clean)} clean | {len(medium)} medium-risk | {len(flaws)} high-risk flaws")

