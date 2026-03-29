"""
FINORA Standardized Transaction Schema — Indian Account Aggregator (AA) Ecosystem
Supports GSTIN, IFSC, UPI VPA, and Sahmati AA consent artifacts.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class IndianMetadata(BaseModel):
    gstin: Optional[str] = Field(None, description="15-digit GST Identification Number")
    ifsc: Optional[str] = Field(None, description="11-char IFSC code for the bank branch")
    upi_vpa: Optional[str] = Field(None, description="UPI Virtual Payment Address, e.g. vendor@upi")
    pan: Optional[str] = Field(None, description="10-char PAN of the transacting entity")
    employee_id: Optional[str] = None
    user_login_count: Optional[int] = 0
    location: Optional[str] = None
    regional_price_index: Optional[float] = None


class StandardizedTransaction(BaseModel):
    id: str
    date: str
    amount: float
    currency: str = "INR"
    vendor_name: str
    category: str
    status: str = "pending"  # pending | approved | flagged
    metadata: IndianMetadata = IndianMetadata()


class RiskVerdict(BaseModel):
    transaction_id: str
    gstin_valid: bool = False
    employee_verified: bool = False
    smurfing_detected: bool = False
    risk_score: int = Field(0, ge=0, le=100, description="Composite risk score 0-100")
    findings: list[str] = []


class AAConsentArtifact(BaseModel):
    """Sahmati Account Aggregator consent reference"""
    consent_id: Optional[str] = None
    fip_id: Optional[str] = Field(None, description="Financial Information Provider ID")
    fiu_id: Optional[str] = Field(None, description="Financial Information User ID (FINORA)")
    consent_status: str = "PENDING"  # PENDING | ACTIVE | REVOKED | EXPIRED
    data_range_from: Optional[str] = None
    data_range_to: Optional[str] = None
