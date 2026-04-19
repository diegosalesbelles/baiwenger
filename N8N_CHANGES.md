# n8n workflow changes — minimal additions to bAIwenger
# Only 2 nodes need to be added after the existing "AI Agent" node.

## What to add

### Node 1 — "Code: Parse AI for DB"
Type: Code
Position: after "AI Agent", before "Code1"

Paste this JS code:

```js
// Parses AI Agent output into per-player rows ready for PostgreSQL INSERT
// The AI Agent returns one item per player (batched by n8n)
const items = $input.all();

// Original player data (to get IDs)
const originalData = JSON.parse($('Code').first().json.message);

const rows = [];

items.forEach((item, idx) => {
  const text = item.json?.output || item.json?.message || "";
  const player = originalData[idx];
  if (!player || !text) return;

  rows.push({
    player_id: player.id,
    player_name: player.name,
    analysis: text.trim(),
  });
});

return rows.map(r => ({ json: r }));
```

### Node 2 — "Postgres: Save AI Analysis"
Type: Postgres (Execute a SQL query)
Position: after "Code: Parse AI for DB"
Connection: same Postgres credential you already use

SQL query (use expression mode):
```sql
INSERT INTO market_analysis (player_id, player_name, analysis)
VALUES (
  {{ $json.player_id }},
  '{{ $json.player_name.replace(/'/g, "''") }}',
  '{{ $json.analysis.replace(/'/g, "''") }}'
)
ON CONFLICT (player_id, (created_at::date))
DO UPDATE SET
  analysis = EXCLUDED.analysis,
  player_name = EXCLUDED.player_name;
```

### Node 3 — "HTTP Request: Revalidate dashboard" (optional but recommended)
Type: HTTP Request
Position: at the very end of the workflow (after "Send a document")
Method: POST
URL: https://your-zeabur-app.zeabur.app/api/revalidate
Headers:
  x-revalidate-secret: <same value as REVALIDATE_SECRET in your .env.local>
Body: none

This tells the Next.js app to refresh its cache immediately after each n8n run,
so the dashboard shows fresh data as soon as Telegram gets the message.

## What does NOT change
- All existing Telegram nodes: untouched
- The AI Agent prompt: untouched
- The schedule trigger: untouched
- All HTTP Request nodes fetching Biwenger data: untouched
- All Code nodes for the PDF/HTML report: untouched

The new branch runs in parallel — it does not block or modify the existing flow.
