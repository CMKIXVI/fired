# Fired — Global Tech Layoffs Tracker

Fired is a source-first public tracker of workforce reductions across technology companies worldwide.

## Website

Once GitHub Pages is enabled for this repository, the site will be available at:

https://cmkixvi.github.io/fired/

## Features

- Global layoff event archive
- Company, date, region and sector filters
- Monthly and annual workforce-impact charts
- Evidence labels: confirmed, reported, estimated and undisclosed
- Source links retained for every event
- Duplicate-event validation during deployment

## Data

The canonical dataset is `data/layoffs.json`. Each event should have a stable unique `id`, company, event date, sector, geography, figure status and one or more source records. Never infer a headcount when sources do not disclose one. Keep corroborating source URLs together on the same canonical event.

## Publishing

The workflow in `.github/workflows/deploy-pages.yml` validates the dataset and deploys the static site on every push to `main`.

In GitHub, open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source if Pages has not already been enabled.

## Methodology

A numeric headcount is included in aggregate totals only when the event record contains a sourced numeric figure. Proposed cuts, completed layoffs and company closures should remain distinguishable. Multiple articles describing the same workforce action are stored as corroborating sources, not counted as separate events.

## Corrections

Corrections should update the existing event record, preserve prior source links where relevant, and be documented in the commit history.
