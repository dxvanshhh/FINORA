import json

transactions = []
try:
    with open("mock_data.json", "r") as f:
        transactions = json.load(f)
except Exception as e:
    print("Failed reloading mock data:", e)
