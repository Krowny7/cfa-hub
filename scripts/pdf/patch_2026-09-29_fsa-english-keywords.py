# -*- coding: utf-8 -*-
# Patch script (2026-09-29) — replaces a curated list of French CFA-vocabulary
# keywords with their official English terms on 5 pages of the FSA Vault
# Concept Sheet (fsa_vault_sheet.pdf, concept pages only — NOT the merged
# QCM file). Requested by Theo: some keywords must be learned in English
# for the exam even though the sheet's own note style mixes French/English
# freely for connective prose (that prose is left untouched on purpose).
#
# Method: same overlay technique as patch_2026-09-26_fixed-income-page4-
# duration.py (no source template exists for this PDF) but surgical —
# cover each old word/phrase's exact bounding box (from pdfplumber) with a
# rect in that area's own background color, then redraw the English text
# in the same font/size/color at (approximately) the same baseline.
#
# Usage:
#   python patch_2026-09-29_fsa-english-keywords.py fsa_vault_sheet.pdf out.pdf
import io
import os
import sys
import tempfile
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import Color
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
import pypdf

FONTDIR = r"C:\Windows\Fonts"
pdfmetrics.registerFont(TTFont("DejaVuSansMono", FONTDIR + r"\DejaVuSansMono.ttf"))
pdfmetrics.registerFont(TTFont("DejaVuSansMono-Bold", FONTDIR + r"\DejaVuSansMono-Bold.ttf"))
pdfmetrics.registerFont(TTFont("LiberationSans", FONTDIR + r"\LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("LiberationSans-Bold", FONTDIR + r"\LiberationSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("LiberationSerif-Bold", FONTDIR + r"\LiberationSerif-Bold.ttf"))

PAGE_W, PAGE_H = 595.92, 842.88


def rgb(*c):
    return Color(*c)


WHITE = rgb(1.0, 1.0, 1.0)
HEADER_BAR = rgb(0.9451, 0.9059, 0.8314)
HEADER_TEXT = rgb(0.1647, 0.1059, 0.2078)
BODY_MUTED = rgb(0.3333, 0.3765, 0.3098)
BODY_INK = rgb(0.1059, 0.1333, 0.1137)
PILL_PURPLE = rgb(0.4196, 0.3059, 0.502)
PILL_GOLD = rgb(0.6588, 0.5255, 0.2431)
PILL_MAROON = rgb(0.549, 0.2392, 0.3608)
PILL_TEXT = WHITE


def td2pdf(y_td):
    return PAGE_H - y_td


def patch_word(c, x0, top, bottom, font, size, color, new_text, bg_color, bg_x0=None, bg_x1=None, pad=1.2):
    """Cover [bg_x0 or x0, bg_x1 or x1] x [top,bottom] with bg_color, then
    draw new_text left-aligned at x0, baseline approximated from bottom."""
    bx0 = (bg_x0 if bg_x0 is not None else x0) - pad
    bx1 = bg_x1 if bg_x1 is not None else bx0 + 300  # caller passes real x1 via bg_x1 normally
    c.setFillColor(bg_color)
    c.rect(bx0, td2pdf(bottom) - pad, (bx1 - bx0), (bottom - top) + 2 * pad, fill=1, stroke=0)
    c.setFont(font, size)
    c.setFillColor(color)
    baseline_td = bottom - size * 0.2
    c.drawString(x0, td2pdf(baseline_td), new_text)


def patch_centered(c, x0, x1, top, bottom, font, size, color, new_text, bg_color):
    c.setFillColor(bg_color)
    c.rect(x0, td2pdf(bottom), (x1 - x0), (bottom - top), fill=1, stroke=0)
    c.setFont(font, size)
    c.setFillColor(color)
    text_w = pdfmetrics.stringWidth(new_text, font, size)
    cx = x0 + ((x1 - x0) - text_w) / 2
    baseline_td = bottom - size * 0.22
    c.drawString(cx, td2pdf(baseline_td), new_text)


def build_page(patches, out_path):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_W, PAGE_H))
    for p in patches:
        p(c)
    c.showPage()
    c.save()
    buf.seek(0)
    with open(out_path, "wb") as f:
        f.write(buf.read())


# ---------------------------------------------------------------------------
# PAGE 1 (index 0) — IOSCO's 3 objectives, currently translated to French
def page1_patches(c):
    patch_centered(c, 28.5, 137.25, 391.5, 406.5, "DejaVuSansMono-Bold", 7.35,
                    PILL_TEXT, "Protect investors", PILL_PURPLE)
    patch_centered(c, 141.0, 250.5, 391.5, 406.5, "DejaVuSansMono-Bold", 7.35,
                    PILL_TEXT, "Fair, efficient markets", PILL_GOLD)
    patch_centered(c, 28.5, 150.75, 410.25, 426.0, "DejaVuSansMono-Bold", 7.35,
                    PILL_TEXT, "Reduce systemic risk", PILL_MAROON)


# ---------------------------------------------------------------------------
# PAGE 3 (index 2) — indirect-method CFO adjustment table, row labels +
# adjustment values were left in French
def page3_patches(c):
    F = "LiberationSerif-Bold"
    V = "LiberationSans"
    size_label, size_val = 8.4, 8.4
    rows = [
        # (label_x0, label_top, label_bottom, label_bg_x1, new_label,
        #  val_x0, val_top, val_bottom, val_bg_x1, new_val)
        (28.2, 114.2, 122.6, 176.0, None, 176.3, 114.1, 122.5, 250.0, "Always added"),
        (28.2, 133.7, 142.1, 176.0, "Non-operating gain", 176.3, 133.6, 142.0, 250.0, "Subtracted (\u2192 CFI)"),
        (28.2, 152.4, 160.8, 176.0, "Non-operating loss", 176.3, 152.4, 160.8, 250.0, "Added"),
        (34.1, 171.9, 180.3, 176.0, "Operating asset", 176.3, 171.9, 180.3, 250.0, "Subtracted"),
        (34.1, 190.7, 199.1, 176.0, "Operating asset", 176.3, 190.6, 199.0, 250.0, "Added"),
        (34.5, 210.2, 218.6, 176.0, "Operating liability", 176.3, 210.1, 218.5, 250.0, "Added"),
        (34.5, 228.9, 237.3, 176.0, "Operating liability", 176.3, 228.9, 237.3, 250.0, "Subtracted"),
    ]
    for label_x0, ltop, lbot, lbgx1, new_label, val_x0, vtop, vbot, vbgx1, new_val in rows:
        if new_label is not None:
            c.setFillColor(WHITE)
            c.rect(label_x0 - 1.2, td2pdf(lbot) - 1.2, (lbgx1 - label_x0 + 1.2), (lbot - ltop) + 2.4, fill=1, stroke=0)
            c.setFont(F, size_label)
            c.setFillColor(BODY_INK)
            c.drawString(label_x0, td2pdf(lbot - size_label * 0.2), new_label)
        c.setFillColor(WHITE)
        c.rect(val_x0 - 1.2, td2pdf(vbot) - 1.2, (vbgx1 - val_x0 + 1.2), (vbot - vtop) + 2.4, fill=1, stroke=0)
        c.setFont(V, size_val)
        c.setFillColor(BODY_MUTED)
        c.drawString(val_x0, td2pdf(vbot - size_val * 0.2), new_val)


# ---------------------------------------------------------------------------
# PAGE 6 (index 5) — depreciation-methods header (ambiguous with
# "impairment" elsewhere on the same page) + intangible-asset-origin labels
def page6_patches(c):
    # header: "3 METHODES DE DEPRECIATION (PREREQUIS)" -> "3 DEPRECIATION METHODS (PREREQUISITE)"
    # exact original bar bounds only (21.0-293.2) -- do NOT bleed into the
    # right column's own header bar which starts around x=303.7.
    c.setFillColor(HEADER_BAR)
    c.rect(21.0, td2pdf(78.7), (293.2 - 21.0), (78.7 - 63.0), fill=1, stroke=0)
    c.setFont("DejaVuSansMono-Bold", 7.12)
    c.setFillColor(HEADER_TEXT)
    c.drawString(28.2, td2pdf(68.1 + 5.6), "3 DEPRECIATION METHODS (PREREQUISITE)")

    # The "Interne ... Acheté séparément ... Business combination ..."
    # paragraph wraps "Acheté" (end of line 1) and "séparément" (start of
    # line 2) across a line break -- word-patching in place would collide,
    # so cover the whole paragraph block and reflow it as English text.
    body_style = ParagraphStyle(
        name="body6", fontName="LiberationSans", fontSize=8.32, leading=11.0,
        textColor=BODY_INK,
    )
    c.setFillColor(WHITE)
    c.rect(28.2 - 1.2, td2pdf(243.5) - 1.2, (286.2 - 28.2 + 2.4), (243.5 - 210.9) + 2.4, fill=1, stroke=0)
    p = Paragraph(
        "<b>Internally developed</b>: expensed (except IFRS development "
        "costs, software). <b>Purchased separately</b>: capitalized at "
        "cost. <b>Business combination</b>: capitalized at FV, residual = "
        "goodwill.",
        body_style,
    )
    w_used, h_text = p.wrap(286.2 - 28.2, 10000)
    p.drawOn(c, 28.2, td2pdf(210.9) - h_text)


# ---------------------------------------------------------------------------
# PAGE 9 (index 8) — the fraud-triangle header + inline labels
def page9_patches(c):
    c.setFillColor(HEADER_BAR)
    c.rect(303.7 - 1.2, td2pdf(78.7) - 1.2, (575.2 - 303.7 + 1.2), (78.7 - 63.0) + 2.4, fill=1, stroke=0)
    c.setFont("DejaVuSansMono-Bold", 7.12)
    c.setFillColor(HEADER_TEXT)
    c.drawString(310.9, td2pdf(68.1 + 5.6), "MOTIVATION / OPPORTUNITY / RATIONALIZATION")

    c.setFillColor(WHITE)
    c.rect(464.4 - 1.2, td2pdf(94.1) - 1.2, (512.0 - 464.4 + 2.4), (94.1 - 85.7) + 2.4, fill=1, stroke=0)
    c.setFont("LiberationSans-Bold", 8.32)
    c.setFillColor(BODY_INK)
    c.drawString(464.4, td2pdf(94.1 - 8.32 * 0.2), "Opportunity")

    c.setFillColor(WHITE)
    c.rect(407.9 - 1.2, td2pdf(105.3) - 1.2, (467.5 - 407.9 + 2.4), (105.3 - 96.9) + 2.4, fill=1, stroke=0)
    c.setFont("LiberationSans-Bold", 8.32)
    c.setFillColor(BODY_INK)
    c.drawString(407.9, td2pdf(105.3 - 8.32 * 0.2), "Rationalization")


# ---------------------------------------------------------------------------
# PAGE 10 (index 9) — the 4 ratio-category headers (the CFA curriculum's
# own category names) + every formula's French numerator/denominator
def page10_patches(c):
    headers = [
        (21.0, 293.2, 63.0, 78.7, 28.2, "ACTIVITY RATIOS"),
        (303.7, 575.2, 63.0, 78.7, 310.9, "SOLVENCY"),
        (21.0, 293.2, 275.2, 291.0, 28.2, "LIQUIDITY (REMINDER)"),
        (303.7, 575.2, 199.5, 215.2, 310.9, "PROFITABILITY \u2014 ROA"),
        (303.7, 575.2, 272.2, 288.0, 310.9, "DUPONT \u2014 ROE DECOMPOSITION"),
    ]
    for bx0, bx1, top, bot, tx0, text in headers:
        c.setFillColor(HEADER_BAR)
        c.rect(bx0, td2pdf(bot), (bx1 - bx0), (bot - top), fill=1, stroke=0)
        c.setFont("DejaVuSansMono-Bold", 7.12)
        c.setFillColor(HEADER_TEXT)
        c.drawString(tx0, td2pdf(top + 5.6 + 4.5), text)

    values = [
        (121.6, 89.4, 97.8, 285.7, "Sales / Average AR (DSO=365/TO)"),
        (121.6, 108.1, 116.5, 285.7, "COGS / Average inventory (DOH)"),
        (121.6, 126.9, 135.3, 285.7, "COGS / Average AP"),
        (121.6, 146.4, 154.8, 285.7, "Revenue / Average total assets"),
        (121.6, 165.1, 173.5, 285.7, "Revenue / Average working capital"),
        (406.5, 89.4, 97.8, 567.7, "Total debt / Total equity"),
        (406.5, 108.1, 116.5, 567.7, "Total debt / Total assets"),
        (406.5, 126.9, 135.3, 567.7, "Average assets / Average equity"),
        (406.5, 146.4, 154.8, 567.7, "EBIT / Interest expense"),
    ]
    for x0, top, bot, bgx1, text in values:
        c.setFillColor(WHITE)
        c.rect(x0 - 1.2, td2pdf(bot) - 1.2, (bgx1 - x0 + 1.2), (bot - top) + 2.4, fill=1, stroke=0)
        c.setFont("LiberationSans", 8.4)
        c.setFillColor(BODY_MUTED)
        c.drawString(x0, td2pdf(bot - 8.4 * 0.2), text)


PAGES = {
    0: page1_patches,
    2: page3_patches,
    5: page6_patches,
    8: page9_patches,
    9: page10_patches,
}


TMPDIR = os.path.join(tempfile.gettempdir(), "fsa-pdf-patch")


def main(base_path, out_path):
    os.makedirs(TMPDIR, exist_ok=True)
    current = base_path
    for i, (page_idx, fn) in enumerate(sorted(PAGES.items())):
        overlay_path = f"{TMPDIR}\\fsa_overlay_p{page_idx}.pdf"
        build_page([fn], overlay_path)
        next_out = out_path if i == len(PAGES) - 1 else f"{TMPDIR}\\fsa_step_{page_idx}.pdf"
        base = pypdf.PdfReader(current)
        overlay = pypdf.PdfReader(overlay_path)
        writer = pypdf.PdfWriter()
        for j, page in enumerate(base.pages):
            if j == page_idx:
                page.merge_page(overlay.pages[0])
            writer.add_page(page)
        with open(next_out, "wb") as f:
            writer.write(f)
        current = next_out
        print(f"patched page {page_idx + 1} -> {next_out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
