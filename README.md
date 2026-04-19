# LILA BLACK Player Journey Explorer

Static browser tool for inspecting player movement, loot, kills, deaths, and storm pressure on the three LILA BLACK minimaps.

## What is in this repo

- `app/public/` - deployable static site
- `app/scripts/build_dataset.py` - parquet to JSON preprocessing pipeline
- `ARCHITECTURE.md` - one-page architecture note
- `INSIGHTS.md` - three data-backed product/level-design insights
- `.github/workflows/deploy-pages.yml` - GitHub Pages deployment workflow

## Features

- World-to-minimap plotting using the coordinate mapping from the assignment README
- Human vs bot paths rendered differently
- Distinct markers for loot, kills, deaths, and storm deaths
- Filters for map, date, and match
- Match playback with a scrubber and play/pause controls
- Heatmap overlays for traffic, kill zones, and death zones
- Aggregate mode for map/date exploration without selecting a specific match

## Tech stack

- Frontend: plain HTML, CSS, and vanilla JavaScript on `<canvas>`
- Data pipeline: Python + `pyarrow`
- Hosting target: GitHub Pages or any static host such as Vercel / Netlify

## Local setup

1. Install Python 3.12+
2. Install dependency:

```bash
pip install pyarrow
```

3. Build the browser dataset:

```bash
python app/scripts/build_dataset.py
```

4. Serve the static app:

```bash
python -m http.server 8000 --directory app/public
```

5. Open:

```text
http://localhost:8000
```

## Deployment

### GitHub Pages

1. Push this repo to GitHub
2. Enable Pages with GitHub Actions
3. The included workflow will build the dataset and publish `app/public`

The Pages URL will be the repo's live submission URL.

### Vercel / Netlify

- Build command: `python app/scripts/build_dataset.py`
- Output directory: `app/public`
- Python dependency: `pyarrow`

## Environment variables

None.

## Notes / assumptions

- The source bundle contains many partial match reconstructions. I treat the available files for a given `match_id` as the observable slice of that match.
- Timeline playback is normalized to the earliest timestamp found in the loaded match files.
- Heatmaps use a pre-binned `48 x 48` grid to keep the browser fast while staying readable.

## Hosted URL

Set this after pushing:

```text
https://<your-github-username>.github.io/<your-repo-name>/
```
