# AI Dictionary Ops — prototype

Steps 1–2 of the MVP: brand shell, role login, CRM pipeline, contract →
AI deliverable extraction → confirm → **Mark as Won** → project + tasks + post slots.

```bash
npm install
npm run dev   # http://localhost:3000
```

Data is fake and lives in the browser (localStorage). "Reset demo data" in the
sidebar restores the seed. AI is simulated in `lib/ai.ts` (same shape the
Claude API version will return). Trigger engine: `lib/engine.ts`. Event
template and seed data: `lib/seed.ts`.
