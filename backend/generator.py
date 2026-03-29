import json
import random
import uuid
from datetime import datetime, timedelta

# Categories
CATEGORIES = ["Office Supplies", "Software", "Travel", "Meals", "Consulting", "Legal", "Marketing", "Logistics", "Hardware", "Cloud Infrastructure"]
VENDORS = ["Amazon Business", "Dell", "Stripe", "Delta Airlines", "Uber", "Salesforce", "Google Workspace", "Microsoft", "WeWork", "McKinsey", "FedEx", "AWS", "Azure"]
CURRENCY = "USD"
STATUS = ["approved", "pending", "flagged"]

# Dates for 2026
START_DATE = datetime(2026, 1, 1)

def random_date():
    return START_DATE + timedelta(days=random.randint(0, 365), hours=random.randint(8, 18))

def generate_random_transaction():
    amount = round(random.uniform(50.0, 15000.0), 2)
    # Give some random regional_price_index. Sometimes lower (disparity), sometimes higher
    regional_price_index = round(amount * random.uniform(0.8, 1.1), 2)
    return {
        "id": str(uuid.uuid4()),
        "date": random_date().isoformat(),
        "amount": amount,
        "currency": CURRENCY,
        "vendor_name": random.choice(VENDORS),
        "category": random.choice(CATEGORIES),
        "status": random.choice(["approved", "pending"]),
        "metadata": {
            "gst_id": f"GST-{random.randint(1000, 9999)}",
            "location": random.choice(["New York", "London", "Dubai", "Singapore", "San Francisco"]),
            "employee_id": f"EMP-{random.randint(100, 999)}",
            "user_login_count": random.randint(1, 50),
            "regional_price_index": regional_price_index
        }
    }

transactions = []

# --- INJECT EXACTLY 3 SMURFED TRANSACTIONS ---
base_date = START_DATE + timedelta(days=random.randint(10, 300))
for i in range(3):
    transactions.append({
        "id": str(uuid.uuid4()),
        "date": (base_date + timedelta(hours=i)).isoformat(), # Same day
        "amount": 35000.0,
        "currency": CURRENCY,
        "vendor_name": "Global Tech Corp",
        "category": "Consulting",
        "status": "approved",
        "metadata": {
            "gst_id": f"GST-SMURF",
            "location": "Cayman Islands",
            "employee_id": "EMP-999",
            "user_login_count": random.randint(1, 5),
            "regional_price_index": 35000.0 # Match so it's not a price disparity issue
        }
    })

# --- INJECT EXACTLY 5 GHOST TRANSACTIONS ---
ghost_vendors = ["CloudSync Pro", "DataStack Analytics", "Nexus Stream", "OmniTool Plus", "Vanguard Sec"]
for vendor in ghost_vendors:
    amount = round(random.uniform(49.99, 499.99), 2)
    transactions.append({
        "id": str(uuid.uuid4()),
        "date": random_date().isoformat(),
        "amount": amount,
        "currency": CURRENCY,
        "vendor_name": vendor,
        "category": "Software",
        "status": "approved",
        "metadata": {
            "gst_id": f"GST-GHOST",
            "location": "Online",
            "employee_id": "EMP-LEFT-42",
            "user_login_count": 0,
            "regional_price_index": amount # Not a price issue, it's a ghost issue
        }
    })

# --- INJECT EXACTLY 2 VENDORS WITH NULL GST_ID ---
shell_vendors = ["Unknown Shell LLC", "Silent Partners Inc"]
for vendor in shell_vendors:
    amount = round(random.uniform(1000.0, 50000.0), 2)
    transactions.append({
        "id": str(uuid.uuid4()),
        "date": random_date().isoformat(),
        "amount": amount,
        "currency": CURRENCY,
        "vendor_name": vendor,
        "category": "Consulting",
        "status": "approved",
        "metadata": {
            "gst_id": None, # Will become null in JSON
            "location": "Panama",
            "employee_id": "EMP-101",
            "user_login_count": random.randint(1, 5),
            "regional_price_index": round(amount * 0.88, 2) # Inject a 12% price disparity!
        }
    })

# --- FILL THE REST ---
remaining_count = 500 - len(transactions)
for _ in range(remaining_count):
    transactions.append(generate_random_transaction())

# Shuffle for realism
random.shuffle(transactions)

with open("mock_data.json", "w") as f:
    json.dump(transactions, f, indent=2)

print(f"Generated {len(transactions)} mock transactions in mock_data.json")
