# Nexply — Your AI-Powered Job Search Copilot

> *Built out of frustration. Refined into a product.*

---

## The Story

It started with a simple problem that every job seeker knows too well.

I'm a senior IT architect with 17 years of experience across AI, Data, Cloud, and Security. My CV is 17 pages long — not out of vanity, but because the breadth of what I've done genuinely doesn't fit in two pages. And yet, every time I found a job posting that looked promising, the same painful ritual would begin:

**Read the offer. Evaluate the match. Rewrite the CV. Write the cover letter. Send. Wait. Repeat.**

The evaluation part alone was exhausting. Does this mission match my stack? Do they actually need someone with my seniority? Is the TJM realistic? Am I underselling myself again? And once I decided to apply, I'd spend an hour or two carefully repositioning my experience to highlight exactly what that specific client needed — only to end up with a folder of 23 different versions of my CV, each named something like `CV_Salem_v7_BdF_FINAL_v2_really_final.docx`.

One evening, after spending three hours applying to two missions, I thought: *I'm an architect. I build systems that automate complex workflows. Why am I doing this manually?*

So I built Nexply.

---

## What Nexply Does

Nexply is a job search copilot for senior tech profiles. It doesn't spray your CV at a thousand companies and hope for the best. It works the way a good headhunter would — but one that actually reads every word of the job posting and knows your CV by heart.

Here's the workflow:

```
You find an offer (or Nexply finds it for you)
        ↓
Nexply reads the full job description
        ↓
It scores your compatibility across 5 dimensions
        ↓
It generates a tailored ATS-compatible CV (2 pages, no tables, no columns)
        ↓
It writes a cover letter that sounds like you — not a robot
        ↓
You review everything in the dashboard
        ↓
You validate. Nexply applies.
```

No more CV versions. No more blank-page cover letter anxiety. No more wondering if you're a 60% or 85% match.

---

## Why It's Different

Most "auto-apply" tools are blunt instruments. They fire your generic CV at hundreds of jobs and flood recruiters with noise. That's bad for you, bad for them, and bad for the ecosystem.

Nexply takes the opposite approach:

- **Quality over volume** — you stay in control. Nothing goes out without your validation.
- **Senior-profile aware** — the scoring understands that a 17-year career doesn't fit a junior ATS filter.
- **Honest analysis** — if a job is a weak match, it tells you clearly. It doesn't inflate scores to make you feel good.
- **Your voice, not a template** — the cover letters are generated from your actual missions, your actual clients, your actual results.
- **Local-first option** — run it entirely on your machine with your own API key. Your CV never touches a third-party server you don't control.

---

## How It Was Built

Nexply was built in parallel with an active job search — which meant every feature was validated against a real use case the same day it was written.

The initial version was a single HTML file. One textarea to paste a job posting, one button to analyze, three panels for score / CV / cover letter. It worked. It was ugly. It was enough to prove the concept.

Then came the full stack:

| Layer | Tech |
|---|---|
| Backend | FastAPI (Python 3.11, async) |
| Frontend | React 18 + TypeScript + Vite + Tailwind |
| Database | PostgreSQL + SQLAlchemy 2.0 + Alembic |
| AI Engine | Anthropic Claude API (claude-sonnet-4-6) |
| Automation | Claude Code + MCP servers (LinkedIn, Firecrawl, Playwright) |
| Export | PDF + DOCX generation |
| DevOps | Docker Compose |

The AI layer uses Claude not just for text generation, but as the scoring and extraction engine — analyzing job postings to extract structured metadata, computing compatibility scores across skill dimensions, and generating documents that are genuinely adapted to each opportunity.

The Claude Code integration is particularly interesting: a local agent scrapes job boards in real time via MCP servers (LinkedIn, Free-Work, Malt, Indeed) and pushes discovered opportunities directly into the Nexply database via a local API bridge. The full pipeline — from discovery to drafted application — runs without manual intervention.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    NEXPLY                           │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │  Claude Code  │    │     React Dashboard      │  │
│  │  (local agent)│    │  Kanban / Score / Docs   │  │
│  │               │    └────────────┬─────────────┘  │
│  │  MCP Servers: │                 │                 │
│  │  - LinkedIn   │    ┌────────────▼─────────────┐  │
│  │  - Firecrawl  │───▶│     FastAPI Backend      │  │
│  │  - Playwright │    │  /offers /ai /documents  │  │
│  └───────────────┘    └────────────┬─────────────┘  │
│                                    │                 │
│                       ┌────────────▼─────────────┐  │
│                       │      PostgreSQL           │  │
│                       │  Offers / Applications   │  │
│                       │  Documents / Alerts      │  │
│                       └──────────────────────────┘  │
│                                    │                 │
│                       ┌────────────▼─────────────┐  │
│                       │    Anthropic Claude API  │  │
│                       │  Analysis / Generation   │  │
│                       └──────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose
- An Anthropic API key → [console.anthropic.com](https://console.anthropic.com)

### Quick Start

```bash
# Clone the repo
git clone https://github.com/yourusername/nexply.git
cd nexply

# Configure environment
cp backend/.env.example backend/.env
# Edit .env and add your ANTHROPIC_API_KEY

# Start everything
make dev

# In another terminal, run migrations and seed data
make migrate
make seed
```

Open [http://localhost:5173](http://localhost:5173) — the dashboard is ready.

Swagger API docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

### Environment Variables

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql+asyncpg://nexply:password@localhost:5432/nexply

# Optional
FRONTEND_URL=http://localhost:5173
INTEGRATION_KEY=your-claude-code-bridge-key
```

---

## Features

### ✅ Available Now
- Paste any job posting → instant AI analysis (metadata extraction + compatibility score)
- Compatibility scoring across 5 dimensions: AI/LLM, Big Data, Cloud, Security, Soft Skills
- ATS-compliant CV generation (2 pages, text-only, keyword-optimized)
- Cover letter generation (your tone, your examples, not a template)
- Document versioning (regenerate as many times as needed)
- Kanban pipeline to track application status
- PDF and DOCX export
- Claude Code integration (local agent pushes scraped offers directly to the DB)
- Job alerts configuration

### 🔜 Coming Next
- CV upload → automatic profile extraction (making the tool generic for any user)
- OAuth connectors for LinkedIn, Indeed, Malt (legal scraping)
- Chrome extension (one-click capture from any job board)
- Interview preparation mode
- Multi-language support (EN, DE, ES)

---

## Roadmap

```
v0.1  ▓▓▓▓▓▓▓▓▓▓  Single HTML prototype (done)
v0.2  ▓▓▓▓▓▓▓▓░░  FastAPI + React + PostgreSQL (in progress)
v0.3  ░░░░░░░░░░  Generic onboarding (upload your CV, not just mine)
v0.4  ░░░░░░░░░░  OAuth connectors + Chrome extension
v1.0  ░░░░░░░░░░  SaaS launch
```

---

## Open Source + SaaS Model

Nexply is open source under the MIT license. Self-host it, fork it, contribute to it.

For those who don't want to deal with Docker, API keys, and terminal commands — a hosted SaaS version is planned. The self-hosted version will always remain free and fully functional.

What stays SaaS-only: managed cloud scraping (no server required on your end), OAuth integrations with job boards, pooled API access (no Anthropic account needed), real-time alerts, and enterprise ATS integrations.

---

## Contributing

This project was built by a frustrated job seeker who happens to be a senior architect. If you're in the same boat — whether you're a developer, a designer, or someone who just wants a better way to find work — contributions are welcome.

Open an issue, start a discussion, or send a PR. The CONTRIBUTING.md has the details.

---

## License

MIT — do whatever you want with it. If you build something cool on top of it, tell me about it.

---

## Author

**Salem BEN AFIA**  
Architecte IA / Data / Applicatif  
[linkedin.com/in/sbenafia](https://linkedin.com/in/sbenafia) · [github.com/salemba](https://github.com/salemba) · [seuforia.wordpress.com](https://seuforia.wordpress.com)

*Built while looking for a mission. Found a product instead.*
