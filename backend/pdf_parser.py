"""
FINORA — PDF Bank Statement Parser
Extracts transaction rows from Indian bank PDFs (HDFC/ICICI format) using pdfplumber.
"""

import re
import uuid
try:
    import pdfplumber
except ImportError:
    pdfplumber = None  # type: ignore
from datetime import datetime
from typing import BinaryIO
from indian_audit import extract_upi_vpa, validate_gstin


# Common Indian date formats in bank statements
DATE_PATTERNS = [
    r"\d{2}/\d{2}/\d{4}",   # DD/MM/YYYY (HDFC)
    r"\d{2}-\d{2}-\d{4}",   # DD-MM-YYYY (ICICI)
    r"\d{2}\s\w{3}\s\d{4}", # DD Mon YYYY (SBI)
]

AMOUNT_PATTERN = re.compile(r"[\d,]+\.\d{2}")


def parse_date(date_str: str) -> str:
    """Try multiple Indian date formats and return ISO string."""
    date_str = date_str.strip()
    for fmt in ["%d/%m/%Y", "%d-%m-%Y", "%d %b %Y"]:
        try:
            return datetime.strptime(date_str, fmt).isoformat()
        except ValueError:
            continue
    return datetime.now().isoformat()


def extract_transactions_from_pdf(file: BinaryIO) -> list[dict]:
    """
    Extract transaction rows from an Indian bank statement PDF.
    Returns a list of StandardizedTransaction-compatible dicts.
    """
    transactions = []

    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            # Try table extraction first (works well for HDFC/ICICI)
            tables = page.extract_tables()

            if tables:
                for table in tables:
                    for row in table:
                        if not row or len(row) < 3:
                            continue

                        # Clean cells
                        cells = [str(c).strip() if c else "" for c in row]
                        row_text = " ".join(cells)

                        # Find a date in the row
                        date_match = None
                        for pattern in DATE_PATTERNS:
                            m = re.search(pattern, row_text)
                            if m:
                                date_match = m.group(0)
                                break

                        if not date_match:
                            continue

                        # Find amounts
                        amounts = AMOUNT_PATTERN.findall(row_text)
                        if not amounts:
                            continue

                        # The largest number is likely the transaction amount
                        parsed_amounts = [float(a.replace(",", "")) for a in amounts]
                        amount = max(parsed_amounts)

                        if amount < 1:
                            continue

                        # Description/remarks is usually the longest cell
                        description = max(cells, key=len)

                        # Extract UPI VPA if present
                        upi_vpa = extract_upi_vpa(description)

                        transactions.append({
                            "id": str(uuid.uuid4()),
                            "date": parse_date(date_match),
                            "amount": amount,
                            "currency": "INR",
                            "vendor_name": description[:60] if len(description) > 60 else description,
                            "category": "Bank Statement Import",
                            "status": "pending",
                            "metadata": {
                                "gstin": None,
                                "ifsc": None,
                                "upi_vpa": upi_vpa,
                                "pan": None,
                                "location": None,
                                "employee_id": None,
                                "user_login_count": None,
                                "tds_deducted": False,
                                "source": "pdf_upload",
                                "raw_description": description
                            }
                        })
            else:
                # Fallback: line-by-line text extraction
                text = page.extract_text() or ""
                for line in text.split("\n"):
                    line = line.strip()
                    if not line:
                        continue

                    date_match = None
                    for pattern in DATE_PATTERNS:
                        m = re.search(pattern, line)
                        if m:
                            date_match = m.group(0)
                            break

                    if not date_match:
                        continue

                    amounts = AMOUNT_PATTERN.findall(line)
                    if not amounts:
                        continue

                    parsed_amounts = [float(a.replace(",", "")) for a in amounts]
                    amount = max(parsed_amounts)

                    if amount < 1:
                        continue

                    # Remove date and amounts to get description
                    desc = line
                    desc = re.sub("|".join(DATE_PATTERNS), "", desc)
                    desc = AMOUNT_PATTERN.sub("", desc)
                    desc = re.sub(r"\s+", " ", desc).strip()

                    upi_vpa = extract_upi_vpa(line)

                    transactions.append({
                        "id": str(uuid.uuid4()),
                        "date": parse_date(date_match),
                        "amount": amount,
                        "currency": "INR",
                        "vendor_name": desc[:60] if len(desc) > 60 else desc,
                        "category": "Bank Statement Import",
                        "status": "pending",
                        "metadata": {
                            "gstin": None,
                            "ifsc": None,
                            "upi_vpa": upi_vpa,
                            "pan": None,
                            "location": None,
                            "employee_id": None,
                            "user_login_count": None,
                            "tds_deducted": False,
                            "source": "pdf_upload",
                            "raw_description": desc
                        }
                    })

    return transactions
