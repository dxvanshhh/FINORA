import json, random, uuid
from datetime import datetime, timedelta

CATEGORIES = ["Office Supplies", "Software", "Travel", "Meals", "Consulting", "Legal", "Marketing", "Logistics", "Hardware", "Cloud Infrastructure"]
VENDORS = ["Tata Consultancy", "Infosys", "Wipro", "Reliance Digital", "Zoho", "Freshworks", "Razorpay", "PhonePe Business", "Flipkart Wholesale", "Amazon Business India", "Swiggy Corporate", "Urban Company"]
CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad"]
STATES = ["27", "07", "29", "36", "33", "24", "19", "08"]
IFSC_PFX = ["SBIN0", "HDFC0", "ICIC0", "UTIB0", "KKBK0"]
START = datetime(2026, 1, 1)

def rd(): return START + timedelta(days=random.randint(0, 365), hours=random.randint(8, 18))
def rgstin():
    s = random.choice(STATES)
    a = ''.join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=5))
    d = ''.join(random.choices("0123456789", k=4))
    c = random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    e = random.choice("123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    ck = random.choice("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    return f"{s}{a}{d}{c}{e}Z{ck}"

txs = []

# 3 Smurfing (same UPI VPA, amounts just under ₹50,000, same day)
vpa = "structuredpay999@ybl"
bd = START + timedelta(days=random.randint(30, 300))
for i in range(3):
    txs.append({"id": str(uuid.uuid4()), "date": (bd + timedelta(hours=i*2)).isoformat(), "amount": round(random.uniform(45000, 49999), 2), "currency": "INR", "vendor_name": "GlobalTech Solutions Pvt Ltd", "category": "Consulting", "status": "approved", "metadata": {"gstin": "27AABCG1234A1Z5", "ifsc": "HDFC0001234", "upi_vpa": vpa, "pan": "AABCG1234A", "location": "Mumbai", "employee_id": "EMP-999", "user_login_count": 3, "tds_deducted": False, "regional_price_index": 48000.0}})

# 5 Ghost Seats
for i, v in enumerate(["CloudSync Pro", "DataStack Analytics", "Nexus Stream", "OmniTool Plus", "Vanguard Sec"]):
    amt = round(random.uniform(999, 19999), 2)
    txs.append({"id": str(uuid.uuid4()), "date": rd().isoformat(), "amount": amt, "currency": "INR", "vendor_name": v, "category": "Software", "status": "approved", "metadata": {"gstin": rgstin(), "ifsc": random.choice(IFSC_PFX) + ''.join(random.choices("0123456789", k=6)), "upi_vpa": f"{v.lower().replace(' ','')}@upi", "pan": None, "location": "Online", "employee_id": "EMP-LEFT", "user_login_count": 0, "tds_deducted": False, "regional_price_index": amt}})

# 2 Null GSTIN vendors
for v in ["Unknown Shell Pvt Ltd", "Silent Partners LLP"]:
    amt = round(random.uniform(50000, 500000), 2)
    txs.append({"id": str(uuid.uuid4()), "date": rd().isoformat(), "amount": amt, "currency": "INR", "vendor_name": v, "category": "Consulting", "status": "approved", "metadata": {"gstin": None, "ifsc": random.choice(IFSC_PFX) + ''.join(random.choices("0123456789", k=6)), "upi_vpa": f"shell{random.randint(1,9)}@paytm", "pan": None, "location": random.choice(["Kolkata","Lucknow"]), "employee_id": "EMP-101", "user_login_count": 2, "tds_deducted": False, "regional_price_index": round(amt * 0.88, 2)}})

# Fill to 500
for _ in range(500 - len(txs)):
    amt = round(random.uniform(500, 200000), 2)
    txs.append({"id": str(uuid.uuid4()), "date": rd().isoformat(), "amount": amt, "currency": "INR", "vendor_name": random.choice(VENDORS), "category": random.choice(CATEGORIES), "status": random.choice(["approved","pending"]), "metadata": {"gstin": rgstin() if random.random() > 0.05 else None, "ifsc": random.choice(IFSC_PFX) + ''.join(random.choices("0123456789", k=6)), "upi_vpa": f"vendor{random.randint(100,999)}@{random.choice(['upi','ybl','okaxis','paytm'])}", "pan": ''.join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ",k=5))+''.join(random.choices("0123456789",k=4))+random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), "location": random.choice(CITIES), "employee_id": f"EMP-{random.randint(100,999)}", "user_login_count": random.randint(1, 50), "tds_deducted": random.choice([True, False]) if amt > 30000 else False, "regional_price_index": round(amt * random.uniform(0.85, 1.1), 2)}})

random.shuffle(txs)
with open("mock_data.json", "w") as f:
    json.dump(txs, f, indent=2, ensure_ascii=False)
print(f"✓ Generated {len(txs)} INR transactions")
