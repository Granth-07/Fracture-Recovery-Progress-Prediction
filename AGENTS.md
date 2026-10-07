# AGENTS.md — Recovery Dashboard

## Project (1-liner)
Web dashboard for physios/doctors + browser-based patient check-in that tracks
rehab exercise form and functional recovery trend (ROM, adherence) — NOT a
bone-healing diagnostic. Pose comparison against a physio-recorded reference,
not medical prediction.

## Stack
- Frontend: React + TypeScript + Tailwind, MediaPipe Pose (client-side, browser)
- Backend: FastAPI + Postgres (Prisma or SQLAlchemy) + scikit-learn (SVM, LogReg)
- DevOps: Docker Compose (local), Render (API) + Vercel (frontend)
- Shared contract: `docs/api-contract.md` — SINGLE SOURCE OF TRUTH for all
  endpoint paths, request/response JSON shapes, and feature field names.

## Directory Ownership (hard boundaries — do not cross)
| Path | Owner | Notes |
|---|---|---|
| `/frontend` | Frontend agent | React app only |
| `/backend` | Backend agent | FastAPI app only |
| `/infra`, `/.github`, root Dockerfiles, `.env.example` | DevOps agent | No app logic |
| `/docs/api-contract.md` | Shared, READ-ONLY to all agents | Only human or explicit "contract update" session edits this |

Each agent session touches ONLY its owned directory. If a change requires
touching another agent's directory (e.g. frontend needs a new field), STOP —
flag it as a contract-change request instead of editing it directly.

## Global Rules (non-negotiable)
1. **Never commit real secrets.** `.env` is gitignored. `.env.example` ships
   with placeholder values only (`API_KEY=your_key_here`), never real keys —
   this was a real incident before, do not repeat it.
2. **One ROLE-bounded prompt per session per file-domain.** Do not ask one
   session to touch frontend + backend + infra together.
3. Client-side pose extraction only (MediaPipe in-browser). Only extracted
   **features** (joint angles, deviation scores) are sent to the backend —
   never raw video/images, for privacy and payload size.
4. No medical-diagnosis language anywhere (UI copy, API field names, code
   comments): use "functional trend" / "form deviation", never "healing
   stage" or "fracture prediction."
5. Before starting any session, agent reads `docs/api-contract.md` first.
   If the task requires a field not in the contract, stop and ask rather
   than inventing one.

## Session checklist (paste at top of every agent session)
- [ ] Confirm working directory matches my ownership table above
- [ ] Read `docs/api-contract.md`
- [ ] No edits outside my owned path
- [ ] No real secrets in any file I write
