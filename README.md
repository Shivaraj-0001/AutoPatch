# AutoPatch — Autonomous Multi-Agent Open-Source Contribution System

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tests-49%20Passing-brightgreen?logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Hacktoberfest](https://img.shields.io/badge/Hacktoberfest-2026-orange)](https://hacktoberfest.com/)

> **Transform public GitHub issues into verified, reviewable code contributions and unified git diff patches through an autonomous swarm of specialized open-weight AI agents.**

---

## Table of Contents

- [Overview](#-overview)
- [Multi-Agent Swarm Architecture](#-multi-agent-swarm-architecture)
- [The Five Specialist Agents](#-the-five-specialist-agents)
- [Self-Healing & Core Capabilities](#-self-healing--core-capabilities)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
  - [Prerequisites](#1-prerequisites)
  - [Installation](#2-installation)
  - [Environment Configuration](#3-environment-configuration)
  - [Running the App](#4-run-development-server)
- [Applying Generated Patches](#-applying-generated-patches)
- [REST & Streaming API Reference](#-rest--streaming-api-reference)
- [Testing](#-testing)
- [Security & Safety Controls](#-security--safety-controls)
- [Contributing](#-contributing)
- [License](#-license)

---

## Overview

Open-source maintainers and contributors face significant friction in turning issue reports into tested, clean pull requests. Understanding ambiguous requirements, exploring unfamiliar directory structures, isolating root causes, writing minimal diffs, and auditing for regressions consume countless hours.

**AutoPatch** solves this by orchestrating an autonomous multi-agent pipeline designed specifically for open-source codebases. Given any public GitHub repository and issue number:

1. **Deconstructs** issues into explicit, verifiable acceptance criteria.
2. **Scouts** the repository tree to pinpoint target source files and test fixtures.
3. **Plans** a surgical, minimal diff strategy that directly satisfies requirements.
4. **Generates** standard unified `.patch` files alongside regression tests.
5. **Audits** contributions adversarially with an automated revision loop and human-in-the-loop refinement.

AutoPatch operates with **zero vendor lock-in**, running across open-weight models ( **GPT OSS 120B**, **Qwen 2.5 Coder**, **Llama 3.3 70B**, **DeepSeek V3**) via Groq, Together AI, Hugging Face Inference Providers, or self-hosted vLLM/Ollama endpoints.

---

## Multi-Agent Swarm Architecture

AutoPatch coordinates five specialist agents through a deterministic, state-machine workflow with live Server-Sent Events (SSE) streaming and automated feedback loops:

```
                          ┌───────────────────────────┐
                          │    GitHub Issue Input     │
                          │  (e.g., owner/repo #123)  │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │ 1. 🔍 Issue Analyst Agent                                             │
    │    • Extracts problem statement & expected behavior                   │
    │    • Formulates explicit, testable Acceptance Criteria                │
    │    • Uncovers hidden constraints, edge cases, & test specifications   │
    └───────────────────────────────────┬───────────────────────────────────┘
                                        │ (IssueSpecification)
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │ 2. 🧭 Repository Scout Agent                                          │
    │    • Explores repo directory tree via GitHub REST API                 │
    │    • Pinpoints target source files, tests, & configuration fixtures   │
    │    • Catalogs symbols, imports, & cross-module dependencies           │
    └───────────────────────────────────┬───────────────────────────────────┘
                                        │ (RepositoryContext)
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │ 3. 📐 Implementation Planner Agent                                    │
    │    • Designs minimal diff strategy across affected files              │
    │    • Maps planned modifications directly to acceptance criteria       │
    │    • Assesses blast radius, potential regressions, & rollback plan    │
    └───────────────────────────────────┬───────────────────────────────────┘
                                        │ (ImplementationPlan)
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │ 4. 💻 Coding Agent                                                    │
    │    • Inspects target source code with bounded character limits        │
    │    • Generates valid git unified diff (`diff --git a/... b/...`)      │
    │    • Produces unit/integration test code & verification instructions  │
    └───────────────────────────────────┬───────────────────────────────────┘
                                        │ (CodingProposal)
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │ 5. 🛡️ Review Agent                                                    │
    │    • Adversarial audit: correctness, security, style, and edge cases  │
    │    • Verifies each acceptance criterion with status & evidence        │
    │    • Emits Quality Score (0-100) & actionable findings                │
    └───────────────────┬───────────────────────────────┬───────────────────┘
                        │                               │
            [Requires Revision]                     [Approved]
                        │                               │
                        ▼                               ▼
    ┌───────────────────────────────────────┐   ┌───────────────────────────┐
    │ 🔄 Automated Revision Loop            │   │ 📦 Contribution Package   │
    │ Feedback injected back to Coding      │   │ • Downloadable .patch     │
    │ Agent with specific findings to fix   │   │ • Verification tests      │
    └───────────────────────────────────────┘   │ • Complete JSON export    │
                                                └───────────────────────────┘
```

---

## The Five Specialist Agents

| Agent | Responsibility | Core Outputs |
| :--- | :--- | :--- |
| **🔍 Issue Analyst** | Deconstructs GitHub issues, pull request context, and maintainer discussions. | Problem summary, root-cause hypothesis, testable acceptance criteria, constraints, and test requirements. |
| **🧭 Repository Scout** | Traverses GitHub file trees, analyzes language conventions, and fetches target files (up to 60 files, 100KB limit). | Target files, existing test fixtures, key symbols, imports, and cross-module dependencies. |
| **📐 Implementation Planner** | Maps acceptance criteria to concrete file changes with minimal blast radius. | Per-file modification plan, criteria mapping, edge cases, rollback strategy, and verification plan. |
| **💻 Coding Agent** | Synthesizes source files, implementation plans, and previous review feedback into working code. | Standard Git unified diff (`.patch`), unit/integration tests, verification steps, and change summary. |
| **🛡️ Review Agent** | Acts as an adversarial maintainer reviewing the patch against criteria and security rules. | Approval verdict (`approved: true/false`), quality score, criteria verification results, critical findings, and suggestions. |

---

## Self-Healing & Core Capabilities

### 1. Automated Bounded Revision Loop
When the Review Agent flags critical defects, security risks, or unsatisfied acceptance criteria, the orchestrator packages the findings and automatically re-invokes the Coding Agent. To prevent token exhaustion and infinite loops, iterations are hard-capped via `MAX_REVISION_ATTEMPTS` (default: `2`).

### 2. Human-in-the-Loop Refinement
Maintainers can interactively steer the workflow via the UI or `POST /api/runs/[id]/refine`. Users can supply custom natural language guidance or toggle specific suggestions produced by the Review Agent to request targeted revisions.

### 3. Multi-Key Pool & Dynamic TPM Budgeting
AutoPatch features a specialized `ApiKeyPool` built for free-tier and enterprise AI providers alike:
- **Groq 8K TPM Enforcement**: Calculates prompt + completion tokens dynamically, ensuring requests stay within safe bounds (preventing pre-flight 413 errors).
- **Multi-Key Round-Robin & Failover**: Accepts colon-separated API keys (`AI_API_KEYS=key1:key2:key3`). If any key hits a 429/413 rate limit, AutoPatch records cooldown timers and rotates to the next available key immediately without sleeping.
- **Sliding-Window Token Tracking**: Tracks per-key token expenditures over a 60-second sliding window to select the optimal key with the highest remaining headroom.

### 4. Self-Healing JSON Parser
LLMs frequently output unescaped characters or truncated JSON. AutoPatch implements a multi-stage parser:
- Sanitizes unescaped newlines and tabs within string literals (common in code diffs).
- Extracts outermost balanced brackets while strictly ignoring braces within quotes.
- Strips trailing commas before brackets/braces.
- Repairs truncated JSON by closing open quotes and balancing the bracket stack.

### 5. Patch Safety & Security Validator
Before patches can be saved or downloaded, they pass through a security validator:
- **Path Traversal Guards**: Detects and rejects `/../` and `/..\\` patterns.
- **Absolute Path Denial**: Blocks diff headers pointing to root directories (`/etc/`, `/var/`).
- **Sensitive File Protection**: Warns if patches touch `.env`, `.git/`, `.ssh/`, `.aws/`, or `node_modules/`.
- **Size Bounds**: Enforces strict patch size caps (500KB max, 50 files max).

### 6. Real-Time SSE Streaming
Workflow execution is streamed in real time to the browser via Server-Sent Events (`/api/runs/[id]/events`). The frontend updates agent status badges, live token usage counters, execution timers, and step logs without polling.

---

## Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) with Turbopack, React 19, TypeScript
- **Styling & UI**: Custom Modern Dark Glassmorphic Design System, [Lucide Icons](https://lucide.dev/)
- **Data & Caching**: Server-side persistent JSON store (`.data/runs.json`) + Client-side [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) cache
- **Validation**: [Zod](https://zod.dev/) schemas for agent inputs, outputs, API requests, and event payloads
- **AI Inference**: [OpenAI Node SDK](https://github.com/openai/openai-node) targeting open-weight inference providers (Groq, Together AI, Hugging Face, vLLM)
- **Testing**: [Vitest](https://vitest.dev/) unit, integration, and API route test suite (49 tests)

---

## Quick Start

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher
- **npm**: `v9.0.0` or higher
- An API key for your chosen AI inference provider (Groq, Together AI, or Hugging Face)

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/Shivaraj-0001/AutoPatch.git
cd AutoPatch

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 3. Environment Configuration

Edit `.env` to configure your AI provider and GitHub settings:

#### Option A: Groq (Recommended for lightning-fast inference)
```bash
AI_PROVIDER=groq
AI_BASE_URL=https://api.groq.com/openai/v1
# Provide one or more colon-separated keys for automatic rate-limit load balancing:
AI_API_KEYS=gsk_key1:gsk_key2:gsk_key3
AI_MODEL=openai/gpt-oss-120b
# Or: Qwen/Qwen2.5-Coder-32B-Instruct / llama-3.3-70b-versatile
```

#### Option B: Hugging Face Inference Providers
```bash
AI_PROVIDER=huggingface
AI_BASE_URL=https://router.huggingface.co/together/v1
AI_API_KEYS=hf_your_token
AI_MODEL=Qwen/Qwen2.5-Coder-32B-Instruct
```

#### Optional Settings:
```bash
# GitHub Token (increases rate limit from 60 to 5000 requests/hour)
GITHUB_TOKEN=ghp_your_github_personal_access_token

# Max automated revision loops (default: 2)
MAX_REVISION_ATTEMPTS=2

# Port configuration
PORT=3000
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Applying Generated Patches

AutoPatch generates standard unified diff `.patch` files ready to be applied with standard Git tooling:

```bash
# 1. Download patch from AutoPatch UI or via API:
curl -o fix-issue-123.patch http://localhost:3000/api/runs/<RUN_ID>/patch

# 2. Navigate to your local clone of the target repository:
cd /path/to/target-repo

# 3. Create a new branch for the fix:
git checkout -b fix/issue-123

# 4. Dry-run verify the patch applies cleanly:
git apply --check fix-issue-123.patch

# 5. Apply the patch:
git apply fix-issue-123.patch

# 6. Verify modified files and run test suite:
git status
npm test

# 7. Commit and submit your pull request:
git commit -am "fix: resolve issue #123 via AutoPatch"
```

---

## REST & Streaming API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/runs` | Start a new autonomous contribution run. |
| `GET` | `/api/runs` | List all workflow runs sorted by recency. |
| `DELETE`| `/api/runs` | Delete all stored workflow runs. |
| `GET` | `/api/runs/[id]` | Get detailed status, agent executions, and artifacts of a run. |
| `DELETE`| `/api/runs/[id]` | Delete a specific workflow run. |
| `GET` | `/api/runs/[id]/events` | Connect to live Server-Sent Events (SSE) stream for execution logs. |
| `POST` | `/api/runs/[id]/cancel` | Cancel an active running workflow. |
| `POST` | `/api/runs/[id]/refine` | Request a revision with custom instructions or selected review findings. |
| `GET` | `/api/runs/[id]/patch` | Download the generated Git-compatible `.patch` file. |
| `GET` | `/api/runs/[id]/export` | Export the complete run metadata, artifacts, and logs as JSON. |
| `POST` | `/api/github/validate` | Validate repository access and verify an issue exists prior to starting. |
| `GET` | `/api/config` | View active non-sensitive configuration settings. |
| `GET` | `/api/health` | Health check endpoint returning status and service version. |

### Example: Starting a Run via cURL

```bash
curl -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/facebook/react/issues/12345",
    "additionalInstructions": "Ensure backward compatibility with React 18"
  }'
```

---

## Testing

AutoPatch includes a robust test suite powered by [Vitest](https://vitest.dev/):

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch
```

### Test Coverage Highlights:
- **`patch-validator.test.ts`**: Verifies path traversal rejection, absolute path blocks, sensitive path alerts, and size bounds.
- **`url-parser.test.ts`**: Tests standard URLs, `/issues/N` links, `/pull/N` links, branch specifiers, and shorthand formats (`owner/repo#123`).
- **`schemas.test.ts`**: Validates Zod schemas for all 5 agent output contracts and workflow state transitions.
- **`ai-provider.test.ts`**: Tests API key pooling, Groq TPM token limits, sliding window calculation, cooldown triggers, and JSON healing.
- **`orchestrator.test.ts`**: Tests run lifecycle, agent execution states, event emitter listeners, and disk persistence.
- **`api-routes.test.ts`**: Tests Next.js route handlers (`/api/health`, `/api/config`, `/api/runs`, `/api/runs/[id]/refine`, `/api/runs/[id]/patch`).
- **`workflow.integration.test.ts`**: End-to-end integration workflow validation.

---

## Security & Safety Controls

1. **Path Traversal Protection**: Rejects patches containing `/../` or Windows-style traversal sequences.
2. **Absolute Path Denial**: Disallows root-relative paths (`/etc/`, `/bin/`, `/var/`).
3. **Sensitive File Guardrails**: Flags modifications touching environment variables (`.env`), SSH keys (`.ssh/`), git metadata (`.git/`), AWS credentials (`.aws/`), or dependencies (`node_modules/`).
4. **Context Rate Limiting**: The Repository Scout limits file discovery to a maximum of 60 files and 100KB per file to prevent memory exhaustion and token flooding.
5. **Bounded Execution**: Automated agent revision loops are capped to prevent unbounded inference spending.

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information. Built with ❤️ for open-source maintainers and contributors.
