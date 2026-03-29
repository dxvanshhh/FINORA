"""
FINORA — Full Feature Backend Extensions
Ghost Seats, Burn Oracle, 26AS TDS, Negotiator, Tax GST, Vendor Rep
"""

import json, re, math, random, statistics
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

# ── Gemini helper ──────────────────────────────────────────────────────────────
import urllib.request, ssl

GEMINI_API_KEY ="AIzaSyBHaFJl5Z5T-kfBMsbcKi9TXqKxigdjNNc"

def gemini_call(prompt: str, temperature: float = 0.5, max_tokens: int = 800) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens}
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        with urllib.request.urlopen(req, timeout=25, context=ctx) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except urllib.error.HTTPError as e:
        if e.code == 429:
            return "RATE_LIMIT"
        return f"[Gemini error: {str(e)}]"
    except Exception as e:
        return f"[Gemini error: {str(e)}]"

# ──────────────────────────────────────────────────────────────────────────────
# GHOST SEATS — Advanced subscription waste detection
# ──────────────────────────────────────────────────────────────────────────────

GHOST_RISK_DESCRIPTORS = {
    "Critical": ("bg-red-100 text-red-700", "🔴"),
    "High": ("bg-orange-100 text-orange-700", "🟠"),
    "Medium": ("bg-yellow-100 text-yellow-700", "🟡"),
    "Low": ("bg-green-100 text-green-700", "🟢"),
}

def analyze_ghost_seats(transactions: list) -> dict:
    """Extended ghost detection: zero usage, duplicate subs, dormant VPAs, SaaS overlap."""
    vendor_groups = {}
    vpa_activity = {}
    
    for t in transactions:
        vendor = t["vendor_name"]
        meta = t.get("metadata") or {}
        logins = meta.get("user_login_count", -1)
        vpa = meta.get("upi_vpa") or "unknown"
        amt = float(t.get("amount", 0))
        cat = t.get("category", "")

        if vendor not in vendor_groups:
            vendor_groups[vendor] = {"txns": [], "logins": [], "amounts": [], "vpas": set()}
        vendor_groups[vendor]["txns"].append(t)
        vendor_groups[vendor]["logins"].append(logins)
        vendor_groups[vendor]["amounts"].append(amt)
        vendor_groups[vendor]["vpas"].add(vpa)
        
        vpa_activity[vpa] = vpa_activity.get(vpa, {"count": 0, "total": 0})
        vpa_activity[vpa]["count"] += 1
        vpa_activity[vpa]["total"] += amt

    seats = []
    
    for vendor, data in vendor_groups.items():
        logins = [l for l in data["logins"] if l >= 0]
        if not logins:
            continue
        avg_logins = statistics.mean(logins)
        total_spent = sum(data["amounts"])
        zero_months = sum(1 for l in logins if l == 0)
        low_months  = sum(1 for l in logins if 0 < l <= 2)
        
        # Risk classification
        if zero_months >= 2:
            risk = "Critical"
            waste_pct = zero_months / max(len(logins), 1)
        elif zero_months == 1 or avg_logins < 3:
            risk = "High"
            waste_pct = 0.6
        elif avg_logins < 8 and low_months > 0:
            risk = "Medium"
            waste_pct = 0.3
        elif avg_logins < 15:
            risk = "Low"
            waste_pct = 0.1
        else:
            continue

        estimated_waste = round(total_spent * waste_pct)
        if estimated_waste < 500:
            continue

        seats.append({
            "vendor_name": vendor,
            "category": data["txns"][0].get("category", "Software"),
            "total_spent": round(total_spent),
            "avg_logins": round(avg_logins, 1),
            "zero_login_months": zero_months,
            "low_login_months": low_months,
            "subscription_count": len(data["txns"]),
            "estimated_waste": estimated_waste,
            "waste_percent": round(waste_pct * 100),
            "risk_level": risk,
            "action": "Cancel immediately" if risk == "Critical" else
                       "Downgrade plan" if risk == "High" else
                       "Review & warn team" if risk == "Medium" else "Monitor",
            "monthly_savings_possible": round(total_spent / max(len(data["txns"]), 1) * waste_pct),
        })

    seats.sort(key=lambda x: x["estimated_waste"], reverse=True)
    
    total_waste  = sum(s["estimated_waste"] for s in seats)
    critical_cnt = sum(1 for s in seats if s["risk_level"] == "Critical")

    return {
        "seats": seats,
        "total_estimated_waste": total_waste,
        "annual_recovery_potential": total_waste * 12,
        "critical_count": critical_cnt,
        "total_subscriptions_analyzed": len(vendor_groups),
    }


# ──────────────────────────────────────────────────────────────────────────────
# BURN ORACLE — Anomaly detection on spending velocity
# ──────────────────────────────────────────────────────────────────────────────

def compute_burn_oracle(transactions: list) -> dict:
    """
    Groups spend by ISO week, computes weekly burn rate, detects spike weeks
    using Z-score and IQR fence, annotates anomaly type with NLP heuristics.
    """
    if not transactions:
        return {"weeks": [], "anomalies": [], "forecast": []}

    week_data: dict = {}
    for t in transactions:
        try:
            dt = datetime.fromisoformat(t["date"])
        except Exception:
            continue
        w = dt.strftime("%Y-W%U")
        week_data.setdefault(w, {"week": w, "total": 0, "count": 0, "categories": {}, "date": dt})
        week_data[w]["total"] += float(t.get("amount", 0))
        week_data[w]["count"] += 1
        cat = t.get("category", "Other")
        week_data[w]["categories"][cat] = week_data[w]["categories"].get(cat, 0) + float(t.get("amount", 0))

    weeks = sorted(week_data.values(), key=lambda x: x["date"])[-20:]  # last 20 weeks
    
    if len(weeks) < 3:
        return {"weeks": weeks, "anomalies": [], "forecast": []}

    totals = [w["total"] for w in weeks]
    mean_burn = statistics.mean(totals)
    stdev_burn = statistics.stdev(totals) if len(totals) > 1 else 1
    q1, q3 = sorted(totals)[len(totals)//4], sorted(totals)[3*len(totals)//4]
    iqr = q3 - q1
    upper_fence = q3 + 1.5 * iqr

    anomalies = []
    processed_weeks = []
    for w in weeks:
        z = (w["total"] - mean_burn) / max(stdev_burn, 1)
        is_spike = w["total"] > upper_fence or z > 2.0
        is_dip = z < -2.0
        
        top_cat = max(w["categories"], key=w["categories"].get) if w["categories"] else "Unknown"
        
        entry = {
            "week": w["week"],
            "burn": round(w["total"]),
            "count": w["count"],
            "z_score": round(z, 2),
            "is_spike": is_spike,
            "is_dip": is_dip,
            "top_category": top_cat,
        }
        processed_weeks.append(entry)
        
        if is_spike:
            anomalies.append({
                "week": w["week"],
                "burn": round(w["total"]),
                "deviation": f"+{round((w['total']/mean_burn - 1)*100)}%",
                "type": "Spend Spike",
                "top_driver": top_cat,
                "severity": "Critical" if z > 3 else "High",
                "recommendation": f"Audit {top_cat} spend this week — {round(w['total']/1000)}K vs avg {round(mean_burn/1000)}K",
            })
        elif is_dip:
            anomalies.append({
                "week": w["week"],
                "burn": round(w["total"]),
                "deviation": f"{round((w['total']/mean_burn - 1)*100)}%",
                "type": "Unusual Dip",
                "top_driver": top_cat,
                "severity": "Medium",
                "recommendation": "Verify invoices weren't deferred or deferred budget carries over.",
            })

    # Simple linear forecast (next 4 weeks)
    if len(totals) >= 4:
        slope = (totals[-1] - totals[-4]) / 3
    else:
        slope = 0
    forecast = [{"week": f"Forecast+{i+1}", "burn": round(totals[-1] + slope * (i+1))} for i in range(4)]

    return {
        "weeks": processed_weeks,
        "anomalies": anomalies,
        "mean_weekly_burn": round(mean_burn),
        "forecast_next_4_weeks": forecast,
        "total_anomaly_weeks": len(anomalies),
        "projected_monthly": round(mean_burn * 4.33),
    }


# ──────────────────────────────────────────────────────────────────────────────
# 26AS / TDS — Cross-check with Indian TDS thresholds
# ──────────────────────────────────────────────────────────────────────────────

# Indian TDS sections
TDS_SECTIONS = {
    "Consulting":        {"section": "194J", "threshold": 30000, "rate": 0.10, "nature": "Professional Fees"},
    "Legal":             {"section": "194J", "threshold": 30000, "rate": 0.10, "nature": "Professional Services"},
    "Software":          {"section": "194J", "threshold": 30000, "rate": 0.10, "nature": "Technical Services"},
    "Cloud Infrastructure": {"section": "194J", "threshold": 30000, "rate": 0.10, "nature": "Technical Services"},
    "Logistics":         {"section": "194C", "threshold": 30000, "rate": 0.02, "nature": "Contractor"},
    "Marketing":         {"section": "194C", "threshold": 30000, "rate": 0.02, "nature": "Contractor"},
    "Hardware":          {"section": "194Q", "threshold": 50000, "rate": 0.001, "nature": "Goods Purchase"},
    "Office Supplies":   {"section": "194Q", "threshold": 50000, "rate": 0.001, "nature": "Goods Purchase"},
    "Travel":            {"section": "194C", "threshold": 30000, "rate": 0.02, "nature": "Contractor"},
    "Meals":             {"section": "None", "threshold": 999999, "rate": 0.0,  "nature": "Exempt"},
}

def analyze_tds(transactions: list) -> dict:
    """Full 26AS TDS cross-check with vendor-level section-aware breakdown."""
    flags, compliant, vendor_totals = [], [], {}

    # Aggregate by vendor for annual threshold check
    for t in transactions:
        v = t["vendor_name"]
        vendor_totals.setdefault(v, {"total": 0, "txns": []})
        vendor_totals[v]["total"] += float(t.get("amount", 0))
        vendor_totals[v]["txns"].append(t)

    for t in transactions:
        amt = float(t.get("amount", 0))
        cat = t.get("category", "Other")
        meta = t.get("metadata") or {}
        tds_done = meta.get("tds_deducted", False)
        vendor = t["vendor_name"]
        annual_total = vendor_totals[vendor]["total"]

        rule = TDS_SECTIONS.get(cat)
        if not rule or rule["rate"] == 0:
            continue

        tds_applicable = amt >= rule["threshold"] or annual_total > rule["threshold"] * 3
        tds_amount = round(amt * rule["rate"])
        required_pct = rule['rate'] * 100

        if tds_applicable and not tds_done:
            short_deduction = tds_amount
            penalty = round(short_deduction * 0.01 * 3)
            violation_reason = (
                f"Section {rule['section']} requires {required_pct:.1f}% TDS on {rule['nature']}, "
                f"but 0% was deducted on \u20b9{amt:,.0f} payment."
            )
            flags.append({
                "id": t["id"],
                "vendor_name": vendor,
                "amount": amt,
                "category": cat,
                "section": rule["section"],
                "nature": rule["nature"],
                "tds_rate": f"{required_pct:.1f}%",
                "tds_applicable": tds_amount,
                "tds_deducted": 0,
                "shortfall": short_deduction,
                "interest_penalty": penalty,
                "total_liability": short_deduction + penalty,
                "violation_reason": violation_reason,
                "status": "Non-Compliant",
                "risk": "High" if amt > 100000 else "Medium",
            })
        elif tds_done or not tds_applicable:
            compliant.append({
                "id": t["id"],
                "vendor_name": vendor,
                "amount": amt,
                "section": rule["section"],
                "nature": rule.get("nature", ""),
                "tds_rate": f"{required_pct:.1f}%",
                "tds_deducted": round(tds_amount) if tds_done else 0,
                "status": "Compliant",
                "risk": "None",
            })

    # ── Vendor-level section grouping ─────────────────────────────────────────
    vendor_map: dict = {}
    for f in flags:
        v = f["vendor_name"]
        if v not in vendor_map:
            vendor_map[v] = {
                "vendor_name": v,
                "total_amount": 0.0,
                "total_shortfall": 0,
                "total_penalty": 0,
                "total_liability": 0,
                "max_risk": "Medium",
                "sections": {},
            }
        vm = vendor_map[v]
        vm["total_amount"] += f["amount"]
        vm["total_shortfall"] += f["shortfall"]
        vm["total_penalty"] += f["interest_penalty"]
        vm["total_liability"] += f["total_liability"]
        if f["risk"] == "High":
            vm["max_risk"] = "High"

        sec = f["section"]
        if sec not in vm["sections"]:
            vm["sections"][sec] = {
                "section": sec,
                "nature": f["nature"],
                "tds_rate": f["tds_rate"],
                "shortfall": 0,
                "penalty": 0,
                "liability": 0,
                "violation_reason": f["violation_reason"],
                "transaction_count": 0,
            }
        sv = vm["sections"][sec]
        sv["shortfall"] += f["shortfall"]
        sv["penalty"] += f["interest_penalty"]
        sv["liability"] += f["total_liability"]
        sv["transaction_count"] += 1

    vendor_breakdown = []
    for vm in vendor_map.values():
        vm["sections"] = sorted(vm["sections"].values(), key=lambda s: s["liability"], reverse=True)
        vm["total_amount"] = round(vm["total_amount"])
        vendor_breakdown.append(vm)
    vendor_breakdown.sort(key=lambda x: x["total_liability"], reverse=True)

    total_liability = sum(f["total_liability"] for f in flags)
    total_shortfall = sum(f["shortfall"] for f in flags)

    return {
        "flags": sorted(flags, key=lambda x: x["total_liability"], reverse=True),
        "compliant": compliant[:20],
        "vendor_breakdown": vendor_breakdown,
        "total_non_compliant": len(flags),
        "total_compliant": len(compliant),
        "total_tds_shortfall": round(total_shortfall),
        "total_interest_penalty": round(total_liability - total_shortfall),
        "total_liability": round(total_liability),
        "summary_by_section": _tds_section_summary(flags),
    }

def _tds_section_summary(flags: list) -> dict:
    s: dict = {}
    for f in flags:
        sec = f["section"]
        s.setdefault(sec, {"count": 0, "liability": 0})
        s[sec]["count"] += 1
        s[sec]["liability"] += f["total_liability"]
    return s


# ──────────────────────────────────────────────────────────────────────────────
# TAX & GST — Regime detection, ITC eligibility, compliance score
# ──────────────────────────────────────────────────────────────────────────────

VALID_GSTIN_STATES = {
    "01":"J&K","02":"HP","03":"PB","04":"CH","05":"UK","06":"HR","07":"DL",
    "08":"RJ","09":"UP","10":"BR","11":"SK","12":"AR","13":"NL","14":"MN",
    "15":"MZ","16":"TR","17":"ML","18":"AS","19":"WB","20":"JH","21":"OR",
    "22":"CG","23":"MP","24":"GJ","25":"DD","26":"MH","27":"KA","28":"TG",
    "29":"AP","30":"TN","31":"PY","32":"KL","33":"AN","35":"LD","36":"TS",
    "37":"LA","38":"GJ2"
}

GST_RATES = {"Software":0.18,"Cloud Infrastructure":0.18,"Hardware":0.18,
             "Consulting":0.18,"Legal":0.18,"Marketing":0.18,"Logistics":0.12,
             "Travel":0.05,"Meals":0.05,"Office Supplies":0.18}

def analyze_gst(transactions: list) -> dict:
    """GST input tax credit eligibility, regime compliance, state-wise analysis."""
    itc_eligible, itc_blocked, missing_gstin, flag_count = [], [], [], 0
    state_spend = {}

    for t in transactions:
        meta = t.get("metadata") or {}
        gstin = meta.get("gstin")
        amt = float(t.get("amount", 0))
        cat = t.get("category", "Other")
        gst_rate = GST_RATES.get(cat, 0.18)
        gst_amount = round(amt * gst_rate)

        # State analysis
        if gstin and len(gstin) >= 2:
            state_code = gstin[:2]
            state = VALID_GSTIN_STATES.get(state_code, f"Unknown({state_code})")
            state_spend[state] = state_spend.get(state, 0) + amt
            valid_state = state_code in VALID_GSTIN_STATES
        else:
            valid_state = False

        if not gstin:
            missing_gstin.append({
                "vendor": t["vendor_name"],
                "amount": amt,
                "gst_impact": gst_amount,
                "itc_loss": gst_amount,
                "issue": "Missing GSTIN — ITC not claimable",
            })
            flag_count += 1
        elif not valid_state:
            flag_count += 1
            missing_gstin.append({
                "vendor": t["vendor_name"],
                "amount": amt,
                "gstin": gstin,
                "gst_impact": gst_amount,
                "itc_loss": gst_amount,
                "issue": f"Invalid state code '{gstin[:2]}' — ITC blocked",
            })
        else:
            if cat in ["Meals", "Travel"]:
                itc_blocked.append({
                    "vendor": t["vendor_name"],
                    "amount": amt,
                    "gst_amount": gst_amount,
                    "reason": f"Section 17(5) — {cat} ITC blocked",
                })
            else:
                itc_eligible.append({
                    "vendor": t["vendor_name"],
                    "amount": amt,
                    "gst_amount": gst_amount,
                    "section": "Eligible under CGST/SGST",
                })

    total_itc_eligible   = sum(x["gst_amount"] for x in itc_eligible)
    total_itc_blocked    = sum(x["gst_amount"] for x in itc_blocked)
    total_itc_lost_missing = sum(x["itc_loss"] for x in missing_gstin)
    compliance_score = max(0, 100 - (flag_count / max(len(transactions),1) * 200))

    return {
        "itc_eligible_count": len(itc_eligible),
        "itc_eligible_amount": round(total_itc_eligible),
        "itc_blocked_count": len(itc_blocked),
        "itc_blocked_amount": round(total_itc_blocked),
        "missing_gstin_count": len(missing_gstin),
        "itc_lost_to_missing_gstin": round(total_itc_lost_missing),
        "compliance_score": round(compliance_score, 1),
        "state_spend": dict(sorted(state_spend.items(), key=lambda x: x[1], reverse=True)[:10]),
        "top_itc_eligible": sorted(itc_eligible, key=lambda x: x["gst_amount"], reverse=True)[:10],
        "top_itc_blocked": sorted(itc_blocked, key=lambda x: x["gst_amount"], reverse=True)[:10],
        "missing_gstin_vendors": sorted(missing_gstin, key=lambda x: x["itc_loss"], reverse=True)[:15],
        "net_itc_recoverable": round(total_itc_eligible),
        "total_gst_liability": round(total_itc_eligible + total_itc_blocked + total_itc_lost_missing),
    }


# ──────────────────────────────────────────────────────────────────────────────
# VENDOR REP — NLP + behavioral scoring
# ──────────────────────────────────────────────────────────────────────────────

HIGH_RISK_KEYWORDS  = ["urgent", "disconnect", "recharge", "helpdesk", "emergency",
                       "last warning", "penalty", "blocked", "kyc update", "verify now"]
MEDIUM_RISK_KEYWORDS = ["unknown", "misc", "vendor", "pvt", "enterprises", "trading",
                         "associates", "unregistered", "freelance"]

def score_vendor_rep(transactions: list) -> dict:
    """Multi-signal vendor reputation: NLP on name, payment regularity, GSTIN, TDS."""
    vendor_map: dict = {}

    for t in transactions:
        v = t["vendor_name"]
        meta = t.get("metadata") or {}
        vendor_map.setdefault(v, {
            "name": v, "txn_count": 0, "total": 0, "categories": set(),
            "gstin": None, "tds_compliance": [], "login_counts": [],
            "amounts": [], "dates": [],
        })
        d = vendor_map[v]
        d["txn_count"] += 1
        d["total"] += float(t.get("amount", 0))
        d["categories"].add(t.get("category", "Other"))
        d["gstin"] = meta.get("gstin") or d["gstin"]
        d["tds_compliance"].append(bool(meta.get("tds_deducted")))
        lc = meta.get("user_login_count", -1)
        if lc >= 0:
            d["login_counts"].append(lc)
        d["amounts"].append(float(t.get("amount", 0)))
        d["dates"].append(t.get("date", ""))

    vendors = []
    for name, d in vendor_map.items():
        name_lower = name.lower()
        # NLP signal
        nlp_penalty = sum(4 for kw in HIGH_RISK_KEYWORDS if kw in name_lower) + \
                      sum(2 for kw in MEDIUM_RISK_KEYWORDS if kw in name_lower)

        # Payment regularity
        amt_cv = (statistics.stdev(d["amounts"]) / max(statistics.mean(d["amounts"]), 1)) if len(d["amounts"]) > 1 else 0

        # GSTIN
        gstin_score = 25 if d["gstin"] else 0

        # TDS
        tds_rate = sum(d["tds_compliance"]) / max(len(d["tds_compliance"]), 1) * 100
        tds_score = round(tds_rate * 0.25)

        # Activity
        avg_logins = statistics.mean(d["login_counts"]) if d["login_counts"] else 5
        login_score = min(25, round(avg_logins / 2))

        # Base score
        base = gstin_score + tds_score + login_score + max(0, 15 - round(amt_cv * 10))
        final_score = max(0, min(100, base - nlp_penalty))

        if final_score >= 75:
            grade, risk = "A", "Low"
        elif final_score >= 55:
            grade, risk = "B", "Medium"
        elif final_score >= 35:
            grade, risk = "C", "High"
        else:
            grade, risk = "D", "Critical"

        vendors.append({
            "name": name,
            "score": final_score,
            "grade": grade,
            "risk_level": risk,
            "total_spent": round(d["total"]),
            "txn_count": d["txn_count"],
            "has_gstin": bool(d["gstin"]),
            "tds_compliance_rate": round(tds_rate, 1),
            "avg_login_activity": round(avg_logins, 1),
            "nlp_flags": [kw for kw in HIGH_RISK_KEYWORDS + MEDIUM_RISK_KEYWORDS if kw in name_lower],
            "categories": list(d["categories"])[:3],
            "red_flags": ([] +
                (["Missing GSTIN"] if not d["gstin"] else []) +
                (["Low TDS compliance"] if tds_rate < 30 else []) +
                (["NLP risk keywords detected"] if nlp_penalty > 0 else []) +
                (["Zero user activity"] if avg_logins < 1 else [])
            ),
        })

    vendors.sort(key=lambda x: x["score"])
    return {
        "vendors": vendors,
        "total_vendors": len(vendors),
        "critical_count": sum(1 for v in vendors if v["risk_level"] == "Critical"),
        "high_risk_count": sum(1 for v in vendors if v["risk_level"] == "High"),
        "avg_score": round(statistics.mean(v["score"] for v in vendors)) if vendors else 0,
        "critical_vendors": [v for v in vendors if v["risk_level"] == "Critical"][:5],
    }


# ──────────────────────────────────────────────────────────────────────────────
# NEGOTIATOR — Gemini AI email + savings strategy generator
# ──────────────────────────────────────────────────────────────────────────────

def generate_negotiation(transaction: dict, ghost_data: Optional[dict] = None) -> str:
    meta = transaction.get("metadata") or {}
    vendor = transaction["vendor_name"]
    amount = transaction.get("amount", 0)
    cat = transaction.get("category", "")
    logins = meta.get("user_login_count", "unknown")
    regional = meta.get("regional_price_index", amount)
    overpay_pct = round(((amount - regional) / max(regional, 1)) * 100, 1) if regional else 0

    context = f"""
You are FINORA's AI Procurement Negotiator. Write a sharp, professional corporate email in the  
Indian B2B context. The recipient is the accounts/vendor team of {vendor}.

Facts:
- Category: {cat}
- Current monthly charge: ₹{amount:,.0f}
- Regional market benchmark: ₹{regional:,.0f}
- User login count last month: {logins}
- Overpayment vs benchmark: {overpay_pct}%
- GSTIN provided: {"Yes" if meta.get('gstin') else "No"}

Email goals:
1. Request a {min(30, max(10, abs(overpay_pct)))}% price reduction citing APAC pricing parity
2. If logins < 3, ask for a usage-based pricing tier
3. Reference "Account Aggregator AA Framework audit findings" to signal seriousness
4. Keep tone corporate, factual, non-confrontational
5. Request response within 5 business days

Format: Subject line first, then full email. Sign as "FINORA Procurement Intelligence, GLA University"."""

    response = gemini_call(context, temperature=0.6, max_tokens=700)
    
    if response == "RATE_LIMIT":
        if logins != "unknown" and logins == 0:
            return f"""Subject: FINORA Account Review — {vendor} (Idle Subscriptions)

Dear {vendor} Accounts Team,

Our internal audit engine has flagged recent billing cycles showing zero active user logins for our account.

To optimize our procurement spend, we request an immediate pause on active billing for these unused licenses or a prorated refund for the preceding dormant period. 

Please treat this as a formal account review request. We look forward to your prompt response.

Best regards,
FINORA Procurement Intelligence"""
        elif overpay_pct > 5:
            return f"""Subject: FINORA Procurement Review — {vendor} (Pricing Parity)

Dear {vendor} Accounts Team,

Our automated procurement engine recently conducted an APAC benchmark analysis of our software expenditures. The data indicates that our current tier is priced at approximately {overpay_pct}% above the regional median.

We formally request a price adjustment or loyalty discount to align our account with current market rates. Continuing our partnership at the current benchmark will require us to evaluate alternative vendors.

We look forward to an actionable proposal.

Best regards,
FINORA Procurement Intelligence"""
        else:
            return f"""Subject: FINORA Annual Vendor Review — {vendor}

Dear {vendor} Accounts Team,

We are conducting our automated mid-year vendor audit across our software portfolio. 

As part of our cost-efficiency mandate, we would like to schedule a review of our current pricing structure with {vendor}. Specifically, we are looking for opportunities to consolidate billing or transition to an aggregate usage-based tier.

Please let us know your availability for a brief discussion this week.

Best regards,
FINORA Procurement Intelligence"""

    return response
