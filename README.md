# 🧭 Job Scout

An AI job-search agent built with **Mastra** and **TypeScript**. Ask for work in plain
language — *"senior React jobs in London, remote ok"* — and the agent searches live
listings, reasons about your request, and returns a clean, ranked shortlist with links.

Not a keyword form with an LLM bolted on: the agent decides *what* to search, calls a
typed tool to fetch real jobs, and formats the results. The tool layer is where the
determinism lives; the model handles interpretation.

---

## What it does

- Understands natural-language job queries and extracts role, skills, location, and remote preference.
- Fetches **real, current** listings from the [Findwork](https://findwork.dev/) API.
- Returns typed, validated results — role, company, location, remote status, a short summary, and a link.
- Remembers context within a conversation, so follow-ups like *"only the remote ones"* work.
- Refuses to invent jobs or URLs — it only reports what the tool actually returned.

## Demo

```
You:  find senior frontend roles in seattle, react + typescript
Scout: Here are the strongest matches:

  1. Senior Frontend Engineer — Acme (Seattle, onsite)
     React/TS platform team, design-system ownership.
     https://findwork.dev/jobs/...

  2. Staff Software Engineer, Web — Globex (Remote)
     TypeScript, Next.js, hiring at senior/staff.
     https://findwork.dev/jobs/...

  ...
```

## Architecture

```
User (natural language)
        │
        ▼
   Job Scout Agent  ──chooses tool + args──▶  search-jobs tool
   (LLM reasoning)                                │  (typed, deterministic)
        │                                         ▼
        │                                    Findwork API
        ◀────── typed JSON (Zod-validated) ──────┘
        │
        ▼
  Ranked, formatted shortlist
```

- **Agent** (`src/mastra/agents/job-search-agent.ts`) — instructions, model, and the tool it can call.
- **Tool** (`src/mastra/tools/job-search-tool.ts`) — the only thing that touches the outside world. Validates input and output with Zod, cleans HTML descriptions into short summaries, and handles API errors explicitly.
- **Registration** (`src/mastra/index.ts`) — wires the agent into the Mastra runtime with storage and logging.

## Design decisions

- **Agent, not a script.** The model chooses parameters and handles vague or partial requests (asking a clarifying question when there's nothing to search) — logic that's painful to hand-code.
- **Typed boundaries.** The tool's `inputSchema` and `outputSchema` (Zod) make the contract explicit, so the agent gets clean data and downstream code stays safe.
- **Clean tool output.** Findwork returns HTML descriptions; the tool strips and truncates them so the model reasons over readable text instead of markup, and the context stays small.
- **Swappable model.** The model is a Mastra router string set via one env var — switch between OpenAI, Anthropic, or Google without touching code.

## Tech stack

TypeScript · [Mastra](https://mastra.ai) 1.x (agents, tools, memory) · Zod · Findwork API · LibSQL (local memory/traces)

## Getting started

**Prerequisites:** Node.js 20+, a model provider API key, and a free Findwork API key.

```bash
# 1. Install
npm install

# 2. Configure — copy the template and fill in your keys
cp .env.example .env
#    - a model key (default MODEL uses OPENAI_API_KEY)
#    - FINDWORK_API_KEY  (free at https://findwork.dev/ -> account -> API)

# 3. Run
npm run dev
```

Open **Mastra Studio** at http://localhost:4111 and chat with the agent.

> First time with Mastra? The most reliable way to get a fully configured project is
> `npm create mastra@latest`, then copy the `src/mastra/` files from this repo in. See
> the tool/agent files for the current Mastra 1.x API.

## Choosing a model

The `model` is a Mastra model-router string; set `MODEL` in `.env` or edit the agent.
The router auto-detects the matching key:

| MODEL                         | Key it uses                    |
| ----------------------------- | ------------------------------ |
| `openai/gpt-4o-mini`          | `OPENAI_API_KEY`               |
| `anthropic/claude-sonnet-4-6` | `ANTHROPIC_API_KEY`            |
| `google/gemini-2.5-pro`       | `GOOGLE_GENERATIVE_AI_API_KEY` |

## Project structure

```
src/mastra/
├── tools/job-search-tool.ts    # search-jobs tool (Findwork + typed, cleaned output)
├── agents/job-search-agent.ts  # the agent that uses it
└── index.ts                    # Mastra runtime registration
.env.example                    # required keys
```

## Roadmap

- [ ] **Resume-match scoring** — a tool that scores a listing against your resume and names the gaps.
- [ ] **Second job source** — add another board (or a web search/scrape tool) and merge results.
- [ ] **Web UI** — a Next.js front end with streamed responses.
- [ ] **Evals** — Mastra scorers for tool-call appropriateness and answer completeness.
- [ ] **Cost tracking** — log `response.usage` per run.

## License

MIT
