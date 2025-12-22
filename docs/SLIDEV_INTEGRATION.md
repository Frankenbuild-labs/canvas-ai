# Slidev Integration

This document outlines the initial integration of Slidev for presentation generation/export inside the Executive Agent system.

## Goals
- Programmatic slide deck generation from structured `SlideDeckSpec` objects
- Export to PDF/PNG via API route for downstream artifact packaging
- Reuse roadmap & specification content for fast executive summaries

## Components
- `types/presentation.ts` – Type definitions for deck specification
- `lib/presentation/slidev/generateSlides.ts` – Builds markdown from a `SlideDeckSpec`
- `presentation-examples/roadmap/slides.md` – Example static deck
- `app/api/presentation/export/route.ts` – API endpoint to export provided markdown or spec

## API Usage
POST `/api/presentation/export`
```jsonc
{
  "deckSpec": {
    "title": "Quarterly Strategy",
    "sections": [
      { "title": "Highlights", "points": ["Growth +28%", "Churn ↓ 5%"] },
      { "title": "Risks", "points": ["Latency spikes", "Audit backlog"] }
    ]
  },
  "format": "pdf"
}
```
OR provide raw markdown:
```json
{ "markdown": "# Custom Deck\n- Point A\n- Point B", "format": "png" }
```

Returns: PDF or PNG binary (attachment).

## Local Development
Preview example deck:
```bash
pnpm slides:dev
```
Export example PDF:
```bash
pnpm slides:export
```

## Security & Limits
- Markdown size capped at 180k chars to avoid excessive resource usage.
- Only `pdf` and `png` formats supported initially.
- Runtime requires Node (not Edge) due to `child_process` spawn.

## Roadmap
1. Theme selection & dynamic frontmatter
2. Asset injection (charts, generated images)
3. Multi-deck batch export service
4. Slide diffing & patch application for revision workflow
5. Accessibility scan (contrast, heading semantics) pre-export
6. Integration with quality scoring & impact ledger
7. Streaming build progress events

## Future Enhancements
- Slide templates derived from template strategy metadata
- Adaptive style hints feeding generation of section layouts
- Automatic KPI visualization slides (charts synthesized from metrics)

## Maintenance
- Keep `@slidev/cli` version aligned with upstream changes
- Consider caching exports for identical specs (hash-based key)

