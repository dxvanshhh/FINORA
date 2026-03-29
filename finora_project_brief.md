# FINORA — Complete Project Brief
### Indian AI Audit Engine · GLA University · 2026

---

## What is FINORA?

FINORA is a **production-grade AI-powered Indian Financial Audit Engine** built to detect, analyze, and prevent the ₹1.2 Trillion annual financial leakage in Indian enterprises. It combines Machine Learning, LLM forensics, NLP scoring, real-time telemetry, and Indian regulatory compliance (GST, TDS, UPI, GSTIN) into a single platform.

---

## Tech Stack — Complete

### Frontend
| Layer | Tech | Purpose |
|-------|------|---------|
| **Framework** | React 18 + Vite | SPA, HMR dev server |
| **Language** | TypeScript (TSX) | Type-safe components |
| **Styling** | Vanilla CSS + TailwindCSS v4 | Glassmorphic design system |
| **3D Background** | React Three Fiber + Three.js | Animated floating glass panes |
| **Animations** | Framer Motion | Page transitions, micro-animations, AnimatePresence |
| **Charts** | Recharts | Area charts, Pie charts, Reference lines |
| **Icons** | Lucide React | Consistent icon system |
| **Font** | Inter (Google Fonts) | Premium sans-serif |
| **HTTP** | Native `fetch()` API | Backend communication |
| **State** | React `useState` / `useEffect` | Local component state |
| **Routing** | State-based tab switching | No Router dependency |

### Backend
| Layer | Tech | Purpose |
|-------|------|---------|
| **Framework** | FastAPI (Python 3.13) | REST API, async endpoints |
| **Server** | Uvicorn (ASGI) | Hot-reload dev server |
| **ML Engine** | scikit-learn — Isolation Forest | Anomaly detection (150 trees, contamination=5%) |
| **Feature Scaling** | scikit-learn — StandardScaler | Normalizes 8-feature vectors |
| **AI / LLM** | Google Gemini 2.0 Flash API | Forensic analysis, email drafting, arbitrage recommendations |
| **HTTP Client** | Python `urllib.request` (stdlib) | Zero-dependency Gemini API calls |
| **PDF Parsing** | pdfplumber (lazy import) | Indian bank statement extraction |
| **Data Validation** | Pydantic v2 | Request/response models |
| **CORS** | FastAPI CORSMiddleware | Cross-origin frontend access |
| **Persistence** | JSON flat-file (`mock_data.json`, `flaw_registry.json`) | Transaction store + flaw patterns |
| **NLP** | Keyword pattern matching | Vendor reputation, social engineering detection |

---

## Full Feature Inventory

### 1. 🔐 Secure Login Gateway
- Dedicated `/login` route with "Secure Audit Portal" branding
- "Login with PAN/GST" — Indian-specific authentication flow
- "Sign in with SSO" button — enterprise corporate login ready
- State-based auth toggle (Dashboard ↔ Login)
- Powered by GLA Fintech Lab branding footer

---

### 2. 🖥️ Command Center (Dashboard Overview)
- **Animated KPI counters** — total spend, flagged transactions, savings found
- **Live transaction feed** — fetches from `/api/transactions`
- **Category breakdown** — spend by Software, Consulting, Cloud, etc.
- **Real-time telemetry** — pulsing "Telemetry Active" indicator
- **Glassmorphic stat cards** with smooth entrance animations

---

### 3. 🧠 Forensic AI Brain (ML Engine)
**Engine:** scikit-learn Isolation Forest + Gemini LLM

**8 Engineered Features:**
| Feature | Signal |
|---------|--------|
| `amount` | Transaction value |
| `hour_of_day` | Off-hours activity |
| `time_delta` | Burst / velocity |
| `velocity_60min` | Money moved in 60 min |
| `vpa_trust_score` | Rare UPI VPA = suspicious |
| `has_gstin` | Missing = shell risk |
| `tds_flag` | TDS missing on large amounts |
| `amount_ratio` | Price vs regional benchmark |

**Components:**
- **Model Confidence Meter** — animated 0–100% gauge with live fluctuation
- **Neural Adaptation Log** — scrolling real-time console (auto-refresh 5s)
- **Risk Map** — 212 transactions color-graded Green → Orange → Glowing Red
- **Retrain loop** — every 50 new transactions, model retrains automatically

**LLM Layer (Gemini):**
- Medium/High risk transactions sent to "Senior Indian Forensic Auditor" prompt
- Detects: Phishing, SIM Cloning, Fake GST, UPI Structuring, Social Engineering
- **Auto-updates `flaw_registry.json`** with newly discovered patterns

**Global Flaw Registry (`flaw_registry.json`):**
- Checked before every ML scan
- Seeded with known patterns
- Self-growing via LLM discovery

---

### 4. 💀 Ghost Seats Detector
**Engine:** Multi-signal heuristics (login frequency, zero-month analysis, spend-to-usage ratio)

**Risk Tiers:**
| Level | Trigger | Action |
|-------|---------|--------|
| 🔴 Critical | 2+ zero-login months | Cancel immediately |
| 🟠 High | Low avg logins | Downgrade plan |
| 🟡 Medium | Infrequent use | Review & warn team |
| 🟢 Low | Slightly underused | Monitor |

- Estimates waste ₹ per subscription (waste % of total spend)
- Annual recovery potential calculation
- **Gemini AI negotiation email** generated on click

---

### 5. 🔥 Burn Oracle
**Engine:** Z-score + IQR fence anomaly detection on weekly burn

- Groups all transactions by ISO week
- Computes mean, standard deviation, Q1/Q3/IQR
- Flags **Spend Spikes** (Z > 2.0 or above upper fence)
- Flags **Unusual Dips** (Z < -2.0)
- **Linear forecast** — 4-week burn rate projection
- Interactive Recharts area chart with red/yellow spike/dip markers

---

### 6. 📄 26AS / TDS Cross-Check
**Engine:** Indian Tax Section rule engine

**Sections covered:**
| Section | Applied to | Rate |
|---------|-----------|------|
| **194J** | Software, Consulting, Legal | 10% |
| **194C** | Logistics, Marketing, Travel | 2% |
| **194Q** | Hardware, Office Supplies | 0.1% |

- Per-transaction TDS shortfall calculation
- **Interest penalty** (1%/month × 3 months default)
- Section-wise liability summary
- Compliant vs Non-Compliant transaction tabs
- Total liability dashboard

---

### 7. 🏛️ Tax & GST Intelligence
**Engine:** GSTIN state-code validation + CGST/SGST rules

- **ITC Eligible** — all inputs with valid GSTIN in non-blocked categories
- **ITC Blocked (Sec 17(5))** — Meals, Travel auto-excluded
- **Missing GSTIN detection** — ITC loss quantified per vendor
- **Invalid state code detection** — state `99`, `00` flagged
- **Compliance Score** (0–100%) based on GSTIN coverage
- **State-wise spend map** — top 10 states by expenditure
- Pie chart breakdown: Eligible vs Blocked vs Lost

---

### 8. 👥 Vendor Reputation Engine
**Engine:** NLP keyword scoring + behavioral signal analysis

**Signals scored:**

| Signal | Weight |
|--------|--------|
| GSTIN present | +25 pts |
| TDS compliance rate | up to +25 pts |
| Avg login activity | up to +25 pts |
| Payment regularity (CV) | up to +15 pts |
| High-risk NLP keywords | -4 pts each |
| Medium-risk NLP keywords | -2 pts each |

**Grade system:** A (75+) · B (55+) · C (35+) · D (<35)

**NLP watchlist keywords:**
- High risk: `urgent`, `disconnect`, `recharge`, `helpdesk`, `last warning`, `kyc update`, `penalty`
- Medium risk: `unknown`, `misc`, `unregistered`, `freelance`, `trading`, `enterprises`

- Red flag badges: Missing GSTIN, Low TDS compliance, NLP risk, Zero activity
- **Gemini AI negotiation email** generated on click

---

### 9. ✉️ AI Negotiator
**Engine:** Google Gemini 2.0 Flash

- **5 quick templates:** Price Reduction, SIM Subscription, GSTIN Clarification, Early Settlement, Usage Review
- Transaction picker — browse live transactions
- Custom instructions textarea
- **Gemini drafts full corporate email** with:
  - APAC pricing parity arguments
  - Usage-based tier requests
  - Account Aggregator framework references
  - 5-business-day response deadline
- One-click **Copy to clipboard**

---

### 10. 🌍 Global Arbitrage Intelligence
**Engine:** True Cost calculation (Base × (1+Tax) × Exchange Rate) + Gemini

**Pricing Matrix:** AWS · Zoom · Slack across India 🇮🇳 USA 🇺🇸 Singapore 🇸🇬 UAE 🇦🇪

**Tax comparison:**
- India: 18% GST
- UAE: 5% VAT → Tax Arbitrage opportunity
- Singapore: 9% GST
- USA: 0%

- Cheapest region per product calculation
- **Live Gemini AI recommendation** — "Switch Zoom to UAE entity → save ₹14,200/month"
- Model attribution badge (Gemini 2.0 Flash · FINORA Key)

---

### 11. 📤 Upload Document
- PDF bank statement upload (HDFC, ICICI, SBI, Axis, Kotak formats)
- `pdfplumber` extracts: transaction dates, amounts, UPI VPAs, descriptions
- Auto-runs GSTIN validation + UPI VPA extraction on import
- Extracted transactions feed into all analysis modules

---

### 12. ℹ️ About FINORA
- Hero card with mission statement
- **3-Column Core Pillars:** Transparency · Compliance · Arbitrage
- GLA University attribution
- Indian regulatory framework context

---

## Training Dataset

| Type | Count | Description |
|------|-------|-------------|
| Normal | 200 | Realistic transactions over 1 year |
| Clean/Low-Risk | 30 | High logins, valid GSTIN, TDS-compliant, fair prices |
| Medium Risk | 20 | Dormant SaaS (1 login/mo), late-night near-threshold, price anomaly +60%, missing TDS |
| High Risk | 12 | **Smurfer** (10×₹19,999 in 5min) · **Ghost GST** (state 99) · **Social Engineer** (URGENT DISCONNECT ELECTRICITY) |

---

## 3 Injected Forensic Flaws

### 🔴 The Smurfer
10 payments of exactly ₹19,999 to 10 different UPI IDs within 5 minutes.
> Exploits: India's ₹20,000 cash reporting threshold. Classic structuring / layering pattern.

### 🔴 The Ghost GST
₹4,85,000 invoice from "Shri Balaji Enterprises" with GSTIN using **state code `99`** (does not exist in India).
> Exploits: GST number format is valid (15 digits) but the state is non-existent. ITC fraudulently claimed.

### 🔴 The Social Engineer
Vendor name literally: `"URGENT: DISCONNECT ELECTRICITY RECHARGE NOW"`
> Exploits: Panic-based social engineering. Common in Indian utility fraud. Flaw Registry seeded with this pattern.

---

## API Endpoints (Backend)

| Method | Endpoint | Engine |
|--------|----------|--------|
| GET | `/api/transactions` | JSON store |
| GET | `/api/overview` | KPI aggregation |
| POST | `/api/upload-pdf` | pdfplumber |
| GET | `/api/forensic-agent/analyze` | Rule-based (smurfing, GSTIN) |
| GET | `/api/forensic-agent/ml-analyze` | **Isolation Forest** |
| GET | `/api/forensic-agent/adaptation-log` | Neural log |
| POST | `/api/forensic-agent/llm-analyze` | **Gemini forensic** |
| GET | `/api/ghost-finder/extended` | Ghost Seats heuristics |
| GET | `/api/burn-oracle/extended` | Z-score + IQR |
| GET | `/api/tds-check/extended` | 194J/C/Q rules |
| GET | `/api/tax-compliance/extended` | ITC + GSTIN |
| GET | `/api/vendor-rep/extended` | NLP scoring |
| POST | `/api/negotiate/ai` | **Gemini email** |
| POST | `/api/ai-arbitrage` | **Gemini arbitrage** |

---

## File Structure

```
FINORA/
├── backend/
│   ├── main.py               ← FastAPI app + all route handlers
│   ├── ml_forensic.py        ← Isolation Forest + LLM forensic layer
│   ├── feature_engine.py     ← 6 analysis engines (Ghost/Burn/TDS/GST/Vendor/Negotiate)
│   ├── indian_audit.py       ← GSTIN validator, UPI VPA extractor, TDS checker
│   ├── pdf_parser.py         ← pdfplumber PDF transaction extractor
│   ├── generate_training_data.py ← 262-transaction dataset generator
│   ├── mock_data.json        ← Live transaction store (262 records)
│   ├── flaw_registry.json    ← Self-growing pattern database
│   └── ml_model_state.json   ← Model training metadata
│
└── frontend/src/
    ├── App.tsx               ← Root app + all page routing
    ├── pages/
    │   ├── Login.tsx         ← PAN/GST + SSO login
    │   ├── ForensicAgent.tsx ← ML brain + LLM panel
    │   ├── GhostSeatsView.tsx← Subscription waste detector
    │   ├── BurnOracleView.tsx← Burn rate anomaly chart
    │   ├── TDSView.tsx       ← 26AS TDS cross-check
    │   ├── TaxGSTView.tsx    ← ITC + GST compliance
    │   ├── VendorRepView.tsx ← NLP vendor scoring
    │   └── NegotiatorView.tsx← Gemini email generator
    └── components/
        ├── FloatingDock.tsx  ← Apple-style macOS dock (11 tabs, magnification)
        └── Background3D.tsx  ← Three.js animated glass panes
```

---

## AI Key Used
**Gemini API Key:** `AIzaSyCGo15fC-PJ7sWiMqRYP_VG-pm5j9dEYWw`
**Name:** FINORA Key
**Model:** `gemini-2.0-flash`
**Used for:** Forensic analysis · Arbitrage recommendations · Negotiation emails

---

## Ports
- **Frontend:** `http://localhost:5173` (Vite dev server)
- **Backend:** `http://localhost:8000` (Uvicorn)
- **API Docs:** `http://localhost:8000/docs` (FastAPI Swagger)
