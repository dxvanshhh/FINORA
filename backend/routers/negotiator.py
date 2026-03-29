import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class NegotiateRequest(BaseModel):
    transaction_id: str

@router.post("/api/negotiate")
def negotiate(req: NegotiateRequest):
    try:
        with open("mock_data.json", "r") as f:
            transactions = json.load(f)
    except Exception:
        transactions = []
        
    tx = next((t for t in transactions if t["id"] == req.transaction_id), None)
    if not tx:
        raise HTTPException(status_code=404, detail="Not found")
        
    vendor = tx["vendor_name"]
    amount = tx["amount"]
    
    reason = "a regional price disparity of 12% in the APAC region. We request a price match."
    metadata = tx.get("metadata", {})
    if metadata.get("user_login_count") == 0:
        reason = "zero user activity over recent billing cycles."
        
    email_text = f"Subject: FINORA Procurement Review: {vendor}\n\nDear {vendor},\n\nOur internal audit found {reason} Please apply a refund or a 20% loyalty discount.\n\nBest,\nFINORA Procurement."
    
    return {"email_body": email_text}
