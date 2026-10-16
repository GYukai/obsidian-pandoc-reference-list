# Maintained fork

This fork preserves Pandoc inline rendering and clickable citation wikilinks in Obsidian Live Preview. The parser returns the inner bracket range of `[[@key]]`; replacing only that range overlaps native link decorations and can drop the citation widget. We expand to the full wikilink and give the citation extension highest precedence. Cursor entry exposes source for editing. The widget retains the `@key` destination, source path and modifier-click handling.

The Zotero fixes preserve cached synchronization checkpoints, checkpoint before requests (with a one-second overlap), use the current Better BibTeX full-export endpoint, and retain the previous cache if export fails or is invalid.

## Installation

Install the release assets (`main.js`, `manifest.json`, `styles.css`) into `.obsidian/plugins/pandoc-reference-list-maintained/`. Disable the original Pandoc Reference List before enabling this fork; do not run both. Copy the original `data.json` locally to retain settings; never upload personal configuration or bibliography caches. The independent plugin ID prevents community updates of the original from overwriting this fork. BRAT can track `GYukai/obsidian-pandoc-reference-list` for future releases.

## Development

`npm ci --ignore-scripts`, `npm run build`, `npm test -- --runInBand src/citationRange.test.ts src/parser/tests/parser.test.ts`, `npm run test:sync`.

The upstream TypeScript 4.4 check currently fails on modern CodeMirror declarations and pre-existing unquoted Persian locator identifiers. The production build and focused executable regression suites are the release checks; no claim is made that the full upstream type check passes.

Scope: this release fixes complete citation wikilinks. Aliases, embeds and Markdown external-link citations do not receive this range expansion. No vault content is rewritten.
