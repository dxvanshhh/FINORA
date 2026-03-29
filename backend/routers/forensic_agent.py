from fastapi import APIRouter
from data_store import transactions
from datetime import datetime
from collections import defaultdict

router = APIRouter()

@router.get("/analyze")
def analyze_forensics():
    # Detect Smurfing: Multiple transactions to same vendor around 9k-10k
    
    vendor_groups = defaultdict(list)
    for t in transactions:
        vendor_groups[t["vendor_name"]].append(t)
        
    smurfing_flags = []
    
    for vendor, txs in vendor_groups.items():
        # Sort by date
        txs.sort(key=lambda x: datetime.fromisoformat(x["date"]))
        
        # Look for sequences greater than 100,000 within 48 hours
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
                    "vendor_name": vendor,
                    "pattern": "Potential Smurfing / Structuring",
                    "confidence": 0.95,
                    "related_transactions": window_txs,
                    "reason": f"Group of transactions totaling {total_amount:,.2f} within 48 hours."
                })
                break

    # Shell Company Heuristic (Invalid or Null GST ID)
    shell_flags = []
    flagged_shell_vendors = set()
    for t in transactions:
        vendor = t["vendor_name"]
        if vendor in flagged_shell_vendors:
            continue
            
        gst_id = t.get("metadata", {}).get("gst_id")
        if not gst_id or not isinstance(gst_id, str) or len(gst_id.strip()) < 5:
            shell_flags.append({
                "vendor_name": vendor,
                "pattern": "Invalid GST ID (Shell Risk)",
                "confidence": 0.85,
                "related_transactions": [t],
                "reason": f"Vendor lacks a valid GST ID structure: {repr(gst_id)}."
            })
            flagged_shell_vendors.add(vendor)

    return {
        "smurfing_detected": smurfing_flags,
        "shell_risk_detected": shell_flags,
        "circular_detected": [] # mock
    }
