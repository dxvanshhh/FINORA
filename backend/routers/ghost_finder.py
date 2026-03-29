from fastapi import APIRouter
from data_store import transactions
from collections import defaultdict
from itertools import groupby

router = APIRouter()

@router.get("/analyze")
def detect_ghost_subscriptions():
    # Detect Ghost Subscriptions: Software vendors with recurring charges but 0 user logins
    
    vendor_groups = defaultdict(list)
    for t in transactions:
        if t["category"] == "Software":
            vendor_groups[t["vendor_name"]].append(t)
            
    ghost_flags = []
    
    for vendor, txs in vendor_groups.items():
        # Check if transactions have 0 user logins and amount > 0
        unused_txs = [t for t in txs if t.get("metadata", {}).get("user_login_count", -1) == 0 and t["amount"] > 0]
        
        if unused_txs:
            ghost_flags.append({
                "vendor_name": vendor,
                "pattern": "Unused Ghost Subscription",
                "total_wasted": sum(t["amount"] for t in unused_txs),
                "months_unused": len(unused_txs),
                "related_transactions": unused_txs,
                "confidence": 0.98,
                "reason": f"Active subscription charge > 0 detected for {vendor} with 0 user logins."
            })
            
    return {
        "ghost_subscriptions": ghost_flags
    }
