# Editing a Vault Concept Sheet PDF

The 8 revision fiches under `/fiches` (Fixed Income, Equity, ...) each serve
a single PDF — the "Vault Concept Sheet" — from the private Supabase bucket
`fiches`, generated once and uploaded (see `scripts/upload-fiche-equity.mjs`
for the upload half). **No source template lives in this repo**: the
original generator is gone, so a content edit is done as an overlay merged
onto the existing PDF, matching its own style exactly.

## Toolkit

- `extract_geometry.py <pdf> <page 1-indexed>` — dumps a page's rects
  (position, size, fill color) and a summary of its text runs (font, size,
  color) as JSON, via `pdfplumber`. Use this first to read off the exact
  colors/margins/column widths you need to match.
- `extract_embedded_fonts.py <pdf> <outdir>` — pulls every embedded font
  *program* out of the PDF (via `pikepdf`) into `.ttf` files. Each page only
  embeds the glyph subset it actually uses (sometimes just a handful of
  characters), so these are for **identifying which font families** are in
  play, not for reusing directly — register the FULL versions instead (see
  below) so new text isn't missing glyphs.
- `patch_2026-09-26_fixed-income-page4-duration.py` — a worked example:
  adds 4 new sections to one page. Copy it as the starting point for the
  next edit; it has the full palette/column/footer-relocation logic
  documented inline.
- `merge_overlay.py <base.pdf> <overlay.pdf> <page index, 0-based> <out.pdf>`
  — merges a single-page overlay onto one page of the base PDF (`pypdf`),
  leaving every other page byte-for-byte in its text/structure.

## The sheet's design system (as built so far)

- Page size: 675.12 × 863.04 pt (every page, checked).
- Fonts — same families as the four Windows system fonts, so pull the FULL
  files from `C:\Windows\Fonts\` rather than the PDF's own subsets:
  `DejaVuSansMono(-Bold)` for the small mono labels/footer, `LiberationSans`
  / `LiberationSans-Bold` for body text, `LiberationSerif-Bold` for the page
  title only.
- Colors (RGB): background `#E9E9E4`, card `#FFFFFF`, hairlines/border
  `#DDD9D0`, header bar `#232B38`, header accent / note-callout stripe
  `#B5651D`, section-header label text `#8A4A15`, section-header bar fill
  `#F2E4D3` (same fill reused for note callouts), body text `#232B38`
  (not pure black), the one two-tone comparison box's blue half `#DCEAF1`.
- Layout: two columns, 291pt wide, 38.2pt left margin / 345.7pt right
  column start (16.5pt gutter), both centered on the page. Section header
  bars are 18pt tall (24pt when a note gets a left accent stripe instead),
  each followed by a 0.7pt hairline.
- **The footer is per-page, not fixed**: a full-width hairline + "Théo —
  CFA Level I, <mois année>" + page number, positioned right after THAT
  page's own last line of content (checked across pages: it sits anywhere
  from ~336pt to ~467pt down, depending on how much content the page has).
  Below it, the page is genuinely blank card all the way to the bottom
  margin (~802pt) — that's headroom for exactly this kind of addition.
  Adding content means: cover the old footer with white, lay out the new
  sections, then draw a fresh footer right after the new, real end of
  content (see the patch script's `end_y` logic).

## After merging

1. Sanity-check: `pdftotext -layout` every OTHER page and diff against the
   original — they must be byte-identical text (the merge should touch
   only the target page).
2. Render the changed page with `pdftoppm -png -r 200 -f N -l N` and look
   at it before uploading anywhere.
3. Upload: back up the current file in the bucket first (dated filename,
   `upsert: true`), then upload the new file under the real name (see the
   Node snippet in `upload-fiche-equity.mjs` for the Supabase client setup —
   `.storage.from("fiches").upload(path, buffer, { contentType:
   "application/pdf", upsert: true })`).
