from fastapi import APIRouter

router = APIRouter()

@router.get("/smart-sorter/summary")
def get_smart_sorter():
    return {"status": "optimized", "categories_sorted": 10, "unrecognized_vendors": 0}

@router.get("/negotiator/savings")
def get_negotiator():
    # Mock data for Savings Bar Chart
    return {
        "savings_ytd": 45000,
        "active_negotiations": 3,
        "chart_data": [
            {"month": "Jan", "savings": 4000},
            {"month": "Feb", "savings": 3500},
            {"month": "Mar", "savings": 5000},
            {"month": "Apr", "savings": 4500},
            {"month": "May", "savings": 6000},
            {"month": "Jun", "savings": 7000},
            {"month": "Jul", "savings": 8000},
            {"month": "Aug", "savings": 7000},
        ]
    }

@router.get("/tax-compliance/status")
def get_tax_compliance():
    return {"status": "compliant", "flags": 0, "audit_risk_score": 12.5}

@router.get("/burn-oracle/burn-rate")
def get_burn_oracle():
    # Mock data for Burn Rate graph
    return {
        "current_runway_months": 18,
        "forecast_status": "stable",
        "chart_data": [
            {"week": "W1", "burn": 120000},
            {"week": "W2", "burn": 115000},
            {"week": "W3", "burn": 130000},
            {"week": "W4", "burn": 125000},
            {"week": "W5", "burn": 110000},
            {"week": "W6", "burn": 105000},
            {"week": "W7", "burn": 140000},
            {"week": "W8", "burn": 135000},
        ]
    }

@router.get("/vendor-rep/score")
def get_vendor_rep():
    return {"vendors_analyzed": 45, "high_risk_vendors": 2, "average_score": 88}

@router.get("/trust-approvals/queue")
def get_trust_approvals():
    return {"pending_approvals": 4, "auto_approved_ytd": 420, "requires_human_review": 2}

@router.get("/esg-tracker/metrics")
def get_esg_tracker():
    return {"carbon_offset": "140 tons", "diversity_score": "A-", "green_suppliers": "34%"}

@router.get("/global-arbitrage/opportunities")
def get_global_arbitrage():
    return {"active_opportunities": 2, "potential_gain": "$12,400", "regions": ["EU", "APAC"]}
