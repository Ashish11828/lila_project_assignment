# Architecture

## What I built and why

I built a static single-page web app in vanilla JavaScript, backed by a Python preprocessing script.

Why this stack:

| Decision | Why |
|---|---|
| Static frontend instead of React/Next | Fastest path to a polished browser tool in this environment, zero runtime dependencies, easy to host on GitHub Pages |
| Python + `pyarrow` for preprocessing | Reliable parquet support and straightforward binary event decoding |
| Pre-generated JSON instead of reading parquet in-browser | Keeps the browser simple, fast, and deployment-friendly |
| Canvas rendering | Better for many path segments and marker redraws during playback than DOM/SVG-heavy rendering |

## Data flow

1. `app/scripts/build_dataset.py` scans all parquet files in `player_data/player_data/`
2. Each file is decoded into rows
3. `event` bytes are converted to UTF-8 strings
4. User IDs are classified as human or bot using UUID-vs-numeric format
5. World coordinates are projected onto minimap pixel coordinates
6. The script writes:
   - `app/public/data/manifest.json` for filters and summaries
   - `app/public/data/overview.json` for aggregate heatmaps and date/map stats
   - `app/public/data/matches/*.json` for per-match playback payloads
7. The browser app fetches:
   - `manifest.json` and `overview.json` at startup
   - one match JSON lazily when the user selects a match

## Coordinate mapping

The assignment README provides one scale and origin per map. I used that directly.

For a world coordinate `(x, z)`:

```text
u = (x - origin_x) / scale
v = (z - origin_z) / scale

pixel_x = u * 1024
pixel_y = (1 - v) * 1024
```

Important details:

- I ignore the `y` column for minimap placement because it is elevation
- I clamp the final pixel coordinates to the `1024 x 1024` minimap bounds
- I verified all source rows land inside the configured map bounds, which is a strong sanity check on the transform

## Assumptions

- A `match_id` can be reconstructed only from the files present in the bundle; some matches appear partial
- Playback time is relative to the earliest timestamp observed in the selected match's available files
- `Kill` + `BotKill` are shown as kill markers, `Killed` + `BotKilled` as death markers, and `KilledByStorm` as a separate storm marker
- Aggregate heatmaps are more useful than rendering all raw paths at once, so non-match mode defaults to heatmaps and summaries

## Major tradeoffs

| Tradeoff | Considered | Chosen | Why |
|---|---|---|---|
| Raw in-browser parquet parsing | DuckDB WASM / Arrow JS | Prebuild JSON | Simpler deployment and lower browser complexity |
| Exact per-pixel heatmaps | Full-resolution raster | 48x48 bins | Much smaller payloads, still readable for design decisions |
| Framework UI | React/Vite | Vanilla JS | Fewer moving parts for a take-home project with static hosting |
| Full-match global load | Load all match payloads at startup | Lazy-load per match | Faster initial page load |
