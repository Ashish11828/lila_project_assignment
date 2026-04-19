# Contributing

## Repo layout

- `app/public/` - static app and generated browser-ready dataset
- `app/scripts/` - preprocessing scripts
- `.github/` - deployment workflow and pull request template
- Root docs - submission-facing documentation

## Local workflow

1. Install `pyarrow`
2. Run `python app/scripts/build_dataset.py`
3. Serve `app/public`
4. Validate filters, playback, and heatmaps before opening a PR

## Pull requests

- Keep product-facing changes small and reviewable
- Mention any assumptions about telemetry or coordinate mapping
- Include a short validation note with at least one tested match
