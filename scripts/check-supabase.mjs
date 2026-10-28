// Read-only connection check: asks Supabase Auth if it is healthy.
// Touches no tables. Run: node --env-file=.env.local scripts/check-supabase.mjs
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing values in .env.local (see .env.example).");
  process.exit(1);
}
const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
console.log(res.ok ? "✅ Connected to Supabase." : `❌ Supabase answered ${res.status}: ${await res.text()}`);
process.exit(res.ok ? 0 : 1);
