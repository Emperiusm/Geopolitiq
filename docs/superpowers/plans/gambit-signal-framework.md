# Gambit Signal — Behavioral Intelligence Framework

> **This document supersedes the patent-centric Gambit IP model.** Gambit Signal is a corporate intelligence platform that measures the gap between what entities say and what they do. The gap is where the intelligence lives.

---

## 1. Core Concept

Every entity — company, government, organization — produces two types of signals:

**Declarative signals** are what they tell the world: press releases, earnings call rhetoric, marketing, strategy presentations, policy announcements. These are curated, intentional, and often misleading.

**Behavioral signals** are what they actually do: file patents, build factories, hire specific talent, import materials, register domains, pay maintenance fees, award contracts. These are harder to fake because they involve real money, legal commitments, and physical actions.

**The gap between declarative and behavioral signals is the intelligence product.**

```
                         REALITY SCORE
                              │
    ┌─────────────────────────┼─────────────────────────┐
    │                         │                         │
    │   DECLARATIVE           │       BEHAVIORAL        │
    │   (what they say)       │       (what they do)    │
    │                         │                         │
    │   Press releases        │   Patent filings        │
    │   Earnings rhetoric     │   R&D spend (XBRL)      │
    │   Marketing             │   Building permits      │
    │   Strategy decks        │   Import/customs records │
    │   ESG reports           │   Job posting language   │
    │   Investor promises     │   Domain/trademark reg   │
    │   Partnership annc.     │   Supply chain activity  │
    │   CEO interviews        │   Maintenance fees       │
    │   Policy statements     │   Gov contract awards    │
    │   Conference keynotes   │   Academic co-authorship │
    │                         │   Examiner prosecution   │
    │                         │   Supplier mentions      │
    │                         │   Construction permits   │
    └─────────────────────────┼─────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   GAP ANALYSIS    │
                    │                   │
                    │  Gap ≈ 0: Real    │
                    │  D > B: Hype      │
                    │  B > D: Stealth   │
                    │  Contradiction:   │
                    │    Pivot/misdir.  │
                    └───────────────────┘
```

---

## 2. Signal Taxonomy

### 2.1 Declarative Signals (what they say)

These are publicly stated intentions. Easy to collect, hard to trust alone.

| Signal | Source | Update freq | Trust level |
|---|---|---|---|
| **Press releases** | PR Newswire, BusinessWire, company newsrooms | Real-time | Low — curated messaging |
| **Earnings call rhetoric** | SEC EDGAR (transcript), Seeking Alpha, Motley Fool | Quarterly | Medium — some legal accountability |
| **Marketing / product announcements** | Company websites, tech press | As published | Low — aspirational |
| **Strategy presentations** | Investor day decks (SEC filings) | Annual | Medium — directional but vague |
| **ESG / sustainability reports** | Company websites, CDP, GRI | Annual | Low — often greenwashing |
| **CEO / executive interviews** | Media, podcasts, conference recordings | Ongoing | Low-Medium — performative |
| **Partnership announcements** | Press releases, SEC 8-K | As announced | Medium — some have teeth |
| **Government policy statements** | Government websites, Federal Register | As published | Medium — intent, not action |
| **Conference keynotes / demos** | Conference proceedings, tech press | Event-driven | Medium — product demonstrations have some weight |

### 2.2 Behavioral Signals (what they do)

These involve money, legal commitments, or physical actions. Harder to fake.

#### Tier 1: High reliability (legal filings, financial commitments)

| Signal | Source | Update freq | Why it's reliable |
|---|---|---|---|
| **Patent filings** | USPTO, EPO, WIPO, Google Patents, Lens.org | Weekly | Legal commitment to describe technology in detail. Costs money to file and prosecute. |
| **Patent prosecution behavior** | USPTO PAIR/PEDS | Real-time | How hard they fight for specific claims. Examiner interactions reveal technical priorities. |
| **Patent abandonment** | USPTO maintenance fee records | Quarterly | Letting a patent expire = explicit deprioritization. Strongest negative behavioral signal. |
| **Patent assignment / transfer** | USPTO Assignment DB | Weekly | IP changing hands reveals acquisitions, licensing, and strategic divestment. |
| **SEC financial data (XBRL)** | SEC EDGAR | Quarterly | R&D spend, CapEx, segment revenue — audited numbers with legal liability. |
| **SEC material event filings (8-K)** | SEC EDGAR | Real-time | Acquisitions, leadership changes, contract wins — legally required disclosures. |
| **Government contract awards** | USAspending.gov, SAM.gov, SBIR.gov | Daily | Government money is committed, not promised. Awards = actual funding. |
| **Building permits / construction** | Local municipal databases, Dodge Data | As filed | Can't build a $5.5B factory without permits. Physical infrastructure is the hardest signal to fake. |
| **Trademark / domain registration** | USPTO TESS, ICANN WHOIS, domain monitors | Real-time | Product naming signals commercialization intent 6-12 months before launch. |

#### Tier 2: Strong reliability (market actions, supply chain)

| Signal | Source | Update freq | Why it's reliable |
|---|---|---|---|
| **Import / customs records** | ImportGenius, Panjiva, US Census trade data | Daily-Monthly | Physical goods crossing borders = real supply chain investment. |
| **Venture funding rounds** | Crunchbase, PitchBook, SEC Form D | As announced | Investors do due diligence. Funding = external validation with money. |
| **Investor identity (who invested)** | SEC filings, Crunchbase | Per round | Competitor co-investment is the strongest acquisition signal. |
| **Job posting language** | Indeed, LinkedIn, Greenhouse, company career pages | Real-time | Specific technical skill requirements reveal internal roadmaps HR publishes unintentionally. |
| **Hiring velocity by function** | LinkedIn, company career pages | Weekly | Surge in manufacturing hiring = approaching production. Surge in regulatory = approaching approval. |
| **H-1B visa applications** | USCIS data | Quarterly | Specialized talent importation in specific technical domains. |

#### Tier 3: Moderate reliability (indirect signals)

| Signal | Source | Update freq | Why it's useful |
|---|---|---|---|
| **Academic paper co-authorships** | arXiv, IEEE, PubMed, Semantic Scholar | Real-time | Company engineers publishing with university labs = pre-patent technology development. |
| **Conference talk abstracts** | Conference proceedings (Hot Chips, OFC, NeurIPS, etc.) | Event-driven | Engineers present work before it becomes products. Technical detail reveals roadmap. |
| **Supplier earnings call mentions** | Seeking Alpha, SEC transcripts | Quarterly | Suppliers mention "a major customer" increasing orders = demand signal from supply side. |
| **Patent examiner art unit analysis** | USPTO examiner statistics | Quarterly | Which art unit a company files in reveals technical domain positioning. Examiner grant rates indicate IP quality. |
| **University tech transfer filings** | University TTO websites, USPTO assignment | Monthly | Licensed university patents = technology pipeline from academia to industry. |
| **Foreign patent filing geography** | INPADOC, WIPO | Monthly | New jurisdictions = planned market entry in 2-3 years. Jurisdiction withdrawal = market exit. |

---

## 3. Gap Analysis Methodology

### 3.1 Signal Alignment Score

For each company-technology pair, compute alignment between declarative and behavioral signals:

```
ALIGNMENT = Σ(behavioral_signals) / Σ(declarative_signals)

Where:
  behavioral_signals = weighted count of behavioral actions in technology domain
  declarative_signals = weighted count of public statements about technology domain
```

**Score interpretation:**

| Alignment | Meaning | Investment implication |
|---|---|---|
| **0.8 - 1.2** | Say and do are aligned | High confidence in stated direction. Reality score high. |
| **> 1.5** | Doing more than saying | **Stealth project.** Company is investing heavily but not talking about it. Early signal. Potential alpha. |
| **< 0.5** | Saying more than doing | **Hype / vaporware.** Company talks big but isn't backing it up. Skepticism warranted. |
| **Negative correlation** | Say one thing, do another | **Pivot or misdirection.** CEO downplays tech on calls but patent filings accelerate. Strongest stealth signal. |

### 3.2 Stealth Project Detection

The highest-value output of the platform. A stealth project is detected when:

1. **Patent filing velocity** increases in a technology domain
2. **Job postings** appear requiring skills in that domain
3. **Import records** show procurement of related materials
4. **Earnings call mentions** of that technology domain are flat or declining
5. **No press releases** or marketing in that domain

This pattern indicates the company is actively building something they haven't announced. Historical examples:

- Apple's automotive project (Project Titan): patent filings in vehicle autonomy + LiDAR engineer hiring preceded any public acknowledgment by 2+ years
- Google's quantum computing push: academic co-authorships + patent filings in quantum error correction preceded commercial announcements
- NVIDIA's inference pivot: patent citation quality in inference exceeded training before the Groq deal was public

### 3.3 Vaporware Detection

The inverse signal. A company is flagged for vaporware risk when:

1. **Press releases and keynotes** heavily promote a technology
2. **Patent filings** in that domain are declining or static
3. **R&D spend** in the corresponding segment is flat
4. **No building permits**, import records, or manufacturing signals
5. **Job postings** don't include specific technical skills for that technology

This pattern indicates marketing outpacing engineering. The company is talking about something it isn't building.

### 3.4 Acquisition Target Scoring

A company scores as a likely acquisition target when:

1. **Competitor co-investment** — 2+ competing companies have invested (weighted: +25 per competitor)
2. **Foundational patents** — small portfolio but high citation rate from large companies (weighted: +15)
3. **Approaching commercialization** — product milestones + manufacturing partnerships (weighted: +15)
4. **Key talent concentration** — small team of highly cited inventors (weighted: +10)
5. **Clean structure** — fabless model, no legacy infrastructure to inherit (weighted: +10)
6. **Recent precedent** — similar companies in the same space recently acquired (weighted: +5)
7. **Capital intensity** — high burn rate that makes independence harder to sustain (weighted: +5)

Scores above 80% indicate probable acquisition within 18 months.

---

## 4. Complete Data Source Registry

### 4.1 Behavioral Signal Sources

#### Patent & IP

| Source | Cost | Format | Priority |
|---|---|---|---|
| USPTO PatentsView API | Free | JSON | Tier 1 |
| USPTO PAIR/PEDS (prosecution) | Free | JSON | Tier 1 |
| USPTO Maintenance Fee Records | Free | Bulk download | Tier 1 |
| USPTO Assignment Database | Free | XML | Tier 1 |
| Google Patents (BigQuery) | Free | SQL | Tier 1 |
| Lens.org | Free/paid | JSON | Tier 2 |
| EPO Open Patent Services | Free (4GB/wk) | XML/JSON | Tier 2 |
| WIPO PATENTSCOPE | Free | XML | Tier 2 |
| USPTO TESS (trademarks) | Free | HTML (scrape) | Tier 2 |

#### Financial & Legal

| Source | Cost | Format | Priority |
|---|---|---|---|
| SEC EDGAR Full-Text Search | Free | JSON | Tier 1 |
| SEC XBRL Financial Data | Free | JSON/XBRL | Tier 1 |
| SEC 8-K Material Events | Free | JSON/XML | Tier 1 |
| SEC 13F Holdings | Free | XML | Tier 2 |
| SEC Forms 3/4/5 (insider trading) | Free | XML | Tier 2 |
| OpenCorporates | Free/paid | JSON | Tier 2 |
| GLEIF/LEI | Free | JSON | Tier 2 |

#### Government & Contracts

| Source | Cost | Format | Priority |
|---|---|---|---|
| USAspending.gov | Free | JSON | Tier 1 |
| SBIR/STTR Awards | Free | JSON/XML | Tier 1 |
| SAM.gov | Free | JSON | Tier 1 |
| Federal Register | Free | JSON | Tier 2 |
| EU Tenders (TED) | Free | XML/JSON | Tier 2 |

#### Supply Chain & Trade

| Source | Cost | Format | Priority |
|---|---|---|---|
| UN Comtrade | Free (limited) | JSON/CSV | Tier 2 |
| US Census Trade Data | Free | JSON | Tier 2 |
| ImportGenius | Paid ($99/mo+) | JSON/CSV | Tier 3 |
| Panjiva (S&P Global) | Paid (enterprise) | JSON | Tier 3 |

#### Talent & Hiring

| Source | Cost | Format | Priority |
|---|---|---|---|
| Job posting aggregators | Free (scrape) | HTML/JSON | Tier 1 |
| H-1B Visa Data (USCIS) | Free | CSV | Tier 2 |
| USPTO Inventor Data | Free (via PatentsView) | JSON | Tier 1 |

#### Physical Infrastructure

| Source | Cost | Format | Priority |
|---|---|---|---|
| Building permit databases | Free (varies by municipality) | HTML/CSV | Tier 2 |
| Dodge Data & Analytics | Paid | JSON | Tier 3 |
| Environmental impact filings | Free (varies) | PDF/HTML | Tier 3 |
| Utility connection applications | Free (varies) | Public record | Tier 3 |

#### Academic & Conference

| Source | Cost | Format | Priority |
|---|---|---|---|
| arXiv | Free | JSON/XML | Tier 1 |
| Semantic Scholar API | Free | JSON | Tier 1 |
| IEEE Xplore | Free (limited) | JSON | Tier 2 |
| PubMed | Free | XML/JSON | Tier 2 |
| Conference proceedings (scrape) | Free | HTML | Tier 2 |
| University tech transfer offices | Free (varies) | HTML | Tier 3 |

#### Domain & Trademark

| Source | Cost | Format | Priority |
|---|---|---|---|
| ICANN WHOIS / RDAP | Free | JSON | Tier 2 |
| Domain registration monitors | Free/paid | JSON | Tier 2 |
| USPTO TESS (trademarks) | Free | HTML | Tier 2 |
| EUIPO (EU trademarks) | Free | JSON | Tier 2 |

### 4.2 Declarative Signal Sources

| Source | Cost | Format | Priority |
|---|---|---|---|
| Press release wires (PR Newswire, BusinessWire) | Free (scrape) | HTML/JSON | Tier 1 |
| Earnings call transcripts | Free (SEC) / paid (Seeking Alpha) | Text | Tier 1 |
| Company newsrooms | Free (scrape) | HTML | Tier 1 |
| GDELT (global news) | Free | JSON/CSV | Tier 1 |
| News/RSS (existing 220+ feeds) | Free | RSS/XML | Already built |
| Conference keynote recordings | Free/paid | Text (transcription) | Tier 2 |
| Investor day presentations | Free (SEC filings) | PDF | Tier 2 |
| ESG reports | Free (company websites) | PDF | Tier 3 |
| Social media (X, LinkedIn, Reddit) | Free/paid | JSON | Tier 2 |

---

## 5. Product Outputs

### 5.1 Reality Score (company-technology pair)

```
Input:  "NVIDIA" + "AI inference"
Output: {
  realityScore: 92,
  alignment: 1.05,           // say and do are well aligned
  category: "confirmed",
  declarativeSignals: 47,     // press mentions, earnings call references
  behavioralSignals: 49,      // patents, acquisitions, R&D spend, contracts
  topBehavioral: [
    { signal: "$20B Groq acquisition", weight: 0.20, source: "SEC 8-K" },
    { signal: "R&D spend +41% YoY", weight: 0.20, source: "SEC XBRL" },
    { signal: "#1 AI chip forward citations", weight: 0.15, source: "IFI CLAIMS" },
    ...
  ],
  verdict: "Emphatically real. Every behavioral signal confirms the declarative strategy."
}
```

### 5.2 Stealth Project Alert

```
Input:  Automated monitoring
Output: {
  alert: "STEALTH_PROJECT_DETECTED",
  company: "Company X",
  technology: "solid-state batteries",
  alignment: 2.3,            // doing 2.3x more than saying
  behavioralEvidence: [
    "23 new patents in CPC H01M (battery) in last 6 months",
    "4 job postings requiring solid-state electrolyte experience",
    "Import records show lithium sulfide procurement from Japan",
    "Building permit filed in Reno, NV for 'advanced materials facility'"
  ],
  declarativeEvidence: [
    "Zero press releases mentioning solid-state",
    "CEO deflected question on earnings call: 'exploring multiple chemistries'"
  ],
  confidence: 0.87,
  prediction: "Likely product announcement within 12-18 months"
}
```

### 5.3 Vaporware Alert

```
Input:  Automated monitoring
Output: {
  alert: "VAPORWARE_RISK",
  company: "Company Y",
  technology: "autonomous vehicles",
  alignment: 0.3,            // saying 3x more than doing
  declarativeEvidence: [
    "CEO mentioned 'self-driving' 14 times on last earnings call",
    "3 press releases about autonomous partnerships in Q4",
    "Investor day dedicated entire section to AV roadmap"
  ],
  behavioralEvidence: [
    "Patent filings in autonomous systems declined 40% YoY",
    "R&D spend in mobility segment flat",
    "No building permits for testing facilities",
    "Job postings for AV engineers down 60% from 12 months ago"
  ],
  confidence: 0.82,
  prediction: "Technology likely to be deprioritized or divested within 12 months"
}
```

### 5.4 Acquisition Target Alert

```
Input:  Automated monitoring
Output: {
  alert: "ACQUISITION_TARGET",
  company: "Ayar Labs",
  probability: 0.94,
  signals: {
    competitorConvergence: ["NVIDIA", "AMD", "Intel"],
    patentCitationDemand: "High — foundational IP cited by all major GPU vendors",
    commercializationStage: "Pre-revenue, approaching production (mid-2026)",
    talentValue: "MIT founders, 170 patents from ~295 employees",
    precedent: "Groq acquired by NVIDIA for $20B in same market"
  },
  likelyAcquirers: ["NVIDIA (60%)", "AMD (25%)", "Intel (10%)"],
  estimatedRange: "$3B - $8B"
}
```

---

## 6. What Makes This Different

### vs. Bloomberg Terminal
Bloomberg tracks financial data. Gambit Signal cross-references financial data with patent prosecution behavior, job posting language, building permits, and supplier earnings calls. Bloomberg tells you what happened. Gambit Signal tells you what's about to happen.

### vs. PatSnap / Clarivate / Innography
Patent analytics tools analyze patents in isolation. Gambit Signal connects patents to corporate actions, supply chains, talent movement, and government contracts. A patent alone is noise. A patent + matching R&D spend + factory construction + hiring = signal.

### vs. Palantir
Palantir is a general-purpose data integration platform. Gambit Signal is purpose-built for one specific analysis: measuring the gap between what entities say and what they do. The behavioral/declarative framework is the moat — it's not a feature, it's the entire product architecture.

### vs. CB Insights / PitchBook
These track startups and funding. Gambit Signal detects acquisition targets before they're on anyone's radar, by finding patterns like competitor co-investment that no startup database surfaces.

---

## 7. The Gambit Engine

Gambit Signal is the first product built on the Gambit Engine — an autonomous knowledge graph that:

1. **Continuously ingests** from 50+ data sources across both signal categories
2. **Uses AI agents** to extract entities, classify signals as declarative or behavioral, and map relationships
3. **Computes alignment scores** in real-time as new data arrives
4. **Detects patterns** — stealth projects, vaporware, acquisition targets, strategic pivots — automatically
5. **Gets smarter over time** — agent memory, feedback loops, and compounding connections

The same engine powers Gambit's geopolitical intelligence platform (globe, map layers, conflict tracking, maritime/flight data). Signal is the corporate intelligence lens on the same underlying infrastructure.
