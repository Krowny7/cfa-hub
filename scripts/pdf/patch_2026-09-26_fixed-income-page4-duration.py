# -*- coding: utf-8 -*-
# Patch script (2026-09-26) — adds 4 new sections to page 4/8 (Interest
# Rate Risk & Duration) of the Fixed Income Vault Concept Sheet: bump-method
# approximate modified duration/convexity (with a worked example), portfolio
# duration (both methods), effective duration, key rate duration, and the
# duration-drivers rule incl. the perpetuity limiting case. Requested by
# Théo: the fiche under-covered duration/convexity/PVBP formulas.
#
# HOW THIS PDF IS BUILT (no source template exists — see
# workflow-vault-concept-sheet-pdf memory): reportlab generates each page
# from scratch as its own canvas; this repo has no copy of that original
# generator, so edits are done as an OVERLAY merged onto the existing page
# with pypdf, in the sheet's own style:
#   - Colors/fonts/box geometry were reverse-engineered from the PDF itself
#     with pdfplumber (rects incl. fill color, char runs incl. font/size/
#     color) — see the palette/columns constants below.
#   - The exact embedded font PROGRAMS were extracted from the PDF with
#     pikepdf (each page only embeds a glyph subset, some tiny) and cross-
#     checked against the FULL versions already installed as Windows system
#     fonts (C:\Windows\Fonts\{DejaVuSansMono,DejaVuSansMono-Bold,
#     LiberationSans-Regular,LiberationSans-Bold,LiberationSerif-Bold}.ttf)
#     — same families, so pixel-identical glyphs, with full character
#     coverage for new text (reportlab re-subsets to only what's used).
#   - Every page's footer (a hairline + "Théo — CFA Level I, <mois>" + page
#     number) sits right after that PAGE's own content, at a height that
#     varies per page (checked: 336-467pt from the top across the sheet) —
#     it is NOT a fixed footer. Adding content below it means covering the
#     old one (a plain white rect) and drawing a fresh one after the real,
#     new end of content — done at the bottom of build().
#
# Usage: download the current fixed-income.pdf from Supabase storage first
# (bucket "fiches", same pattern as scripts/upload-fiche-equity.mjs but a
# .storage.from("fiches").download(...)), then:
#   pip install reportlab pypdf pdfplumber pikepdf fonttools
#   python build_overlay.py overlay.pdf         # this file
#   python merge.py current.pdf overlay.pdf 6 modified.pdf   # page index 6 = page 7 = sheet page 4/8
# then re-upload modified.pdf as fixed-income.pdf (keep a dated backup of
# the previous version in the same bucket first).
import io
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import Color
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

FONTDIR = r"C:\Windows\Fonts"
pdfmetrics.registerFont(TTFont("DejaVuSansMono", FONTDIR + r"\DejaVuSansMono.ttf"))
pdfmetrics.registerFont(TTFont("DejaVuSansMono-Bold", FONTDIR + r"\DejaVuSansMono-Bold.ttf"))
pdfmetrics.registerFont(TTFont("LiberationSans", FONTDIR + r"\LiberationSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("LiberationSans-Bold", FONTDIR + r"\LiberationSans-Bold.ttf"))

PAGE_W, PAGE_H = 675.12, 863.04

def rgb(r, g, b):
    return Color(r / 255.0, g / 255.0, b / 255.0)

NAVY = rgb(35, 43, 56)
RUST_BRIGHT = rgb(181, 101, 29)
RUST_DARK = rgb(138, 74, 21)
CREAM = rgb(242, 228, 211)
HAIRLINE = rgb(221, 217, 208)
MUTED = rgb(138, 143, 160)
WHITE = rgb(255, 255, 255)

LEFT_X, RIGHT_X, COL_W = 38.2, 345.7, 291.0
PAD = 5.0

body_style = ParagraphStyle(
    name="body", fontName="LiberationSans", fontSize=7.3, leading=9.6,
    textColor=NAVY, spaceBefore=0, spaceAfter=0,
)

def td2pdf(y_td):
    """top-down y (distance from top of page, matching the extracted
    geometry) -> reportlab's native bottom-up y."""
    return PAGE_H - y_td

class Column:
    """Lays out header bars + body paragraphs downward from a starting
    top-down y, mirroring the sheet's own section style exactly."""
    def __init__(self, c, x, y_td):
        self.c = c
        self.x = x
        self.y = y_td  # cursor, top-down

    def header(self, label, h=18):
        c, x, y = self.c, self.x, self.y
        y_bot_pdf = td2pdf(y + h)
        c.setFillColor(CREAM)
        c.rect(x, y_bot_pdf, COL_W, h, fill=1, stroke=0)
        c.setFillColor(HAIRLINE)
        c.rect(x, y_bot_pdf - 0.7, COL_W, 0.7, fill=1, stroke=0)
        c.setFont("DejaVuSansMono-Bold", 7.12)
        c.setFillColor(RUST_DARK)
        c.drawString(x + 4, y_bot_pdf + (h - 7.12) / 2 + 1.6, label)
        self.y = y + h + 0.7
        return self

    def note(self, html, h=None, gap_before=8, gap_after=10):
        """Cream box with a left rust accent stripe, no header bar —
        matches the sheet's own callout style (e.g. 'Zero-coupon...')."""
        c = self.c
        self.y += gap_before
        p = Paragraph(html, body_style)
        w_used, h_text = p.wrap(COL_W - 2 * PAD - 3, 10000)
        box_h = max(h or 0, h_text + 2 * PAD)
        y_bot_pdf = td2pdf(self.y + box_h)
        c.setFillColor(CREAM)
        c.rect(self.x, y_bot_pdf, COL_W, box_h, fill=1, stroke=0)
        c.setFillColor(RUST_BRIGHT)
        c.rect(self.x, y_bot_pdf, 2.2, box_h, fill=1, stroke=0)
        p.drawOn(c, self.x + 2.2 + PAD, y_bot_pdf + (box_h - h_text) / 2)
        self.y += box_h + gap_after
        return self

    def para(self, html, gap_before=6, gap_after=10):
        c = self.c
        self.y += gap_before
        p = Paragraph(html, body_style)
        w_used, h_text = p.wrap(COL_W - 2 * PAD, 10000)
        y_top_pdf = td2pdf(self.y)
        p.drawOn(c, self.x + PAD, y_top_pdf - h_text)
        self.y += h_text + gap_after
        return self


def build(out_path):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(PAGE_W, PAGE_H))

    # The sheet's own footer (a full-width hairline + "Théo — ..." + page
    # number) sits right where the new sections need to go — it moves with
    # content height on every page of this sheet (checked: 336–467 depending
    # on the page), it isn't fixed. Blank it out here; a new one is drawn
    # below, after the real end of content.
    c.setFillColor(WHITE)
    c.rect(19.5, td2pdf(417), 636.0, 417 - 396, fill=1, stroke=0)

    START_Y = 399.0 + 14  # right where the sheet's own content already ended

    left = Column(c, LEFT_X, START_Y)
    left.header("DURATION & CONVEXITÉ APPROXIMÉES (BUMP)")
    left.para(
        "Estimation numérique valable pour <b>tout</b> bond (y compris à option "
        "intégrée) — on recalcule le prix pour un choc de yield à la hausse et "
        "à la baisse, sans dériver de formule fermée.",
        gap_before=6,
    )
    left.para(
        "ApproxModDur = [V(YTM−ΔY) − V(YTM+ΔY)] / (2 × ΔY × V0)<br/>"
        "ApproxConvexity = [V(YTM−ΔY) + V(YTM+ΔY) − 2×V0] / (ΔY² × V0)",
        gap_before=6,
    )
    left.para(
        "<b>Exemple</b> — bond à V0 = 100,00 ; YTM+50bp → V(YTM+ΔY) = 98,52 ; "
        "YTM−50bp → V(YTM−ΔY) = 101,55 ; ΔY = 0,0050.<br/>"
        "ApproxModDur = (101,55−98,52) / (2×0,0050×100,00) = 3,03 / 1,00 = <b>3,03</b><br/>"
        "ApproxConvexity = (101,55+98,52−200,00) / (0,0050²×100,00) = 0,07 / 0,0025 = <b>28,0</b>",
        gap_before=6, gap_after=12,
    )

    left.header("DURATION DE PORTEFEUILLE")
    left.para(
        "<b>Méthode 1 — weighted average</b> (la plus utilisée) : moyenne des "
        "durations individuelles, pondérée par la valeur de marché de chaque "
        "position. Rapide, mais suppose un <b>parallel shift</b> — tous les "
        "yields du portefeuille bougent du même montant.",
        gap_before=6,
    )
    left.para(
        "<b>Méthode 2 — cash-flow yield</b> : reconstruit les cash flows "
        "agrégés du portefeuille, en dérive un yield et une duration propres. "
        "Plus rigoureuse en théorie, rarement utilisée en pratique (données "
        "et calculs lourds ; peu adaptée si les bonds diffèrent trop en "
        "devise/crédit/courbe).",
        gap_before=6, gap_after=10,
    )

    right = Column(c, RIGHT_X, START_Y)
    right.header("EFFECTIVE DURATION & KEY RATE DURATION")
    right.para(
        "<b>Effective duration</b> : même calcul par bump que ci-contre, mais "
        "en choquant la courbe des taux <b>de référence</b> dans un modèle de "
        "valorisation (OAS constant), pas le YTM propre du bond. Seule mesure "
        "valable pour un bond à cash flows incertains (callable, putable, MBS) "
        "— la modified duration suppose des cash flows fixes, inadaptée ici.",
        gap_before=6,
    )
    right.para(
        "<b>Key rate duration</b> : sensibilité du prix à un seul point de la "
        "courbe (ex : 10 ans), les autres maturités étant maintenues "
        "constantes. Seule mesure qui capture un mouvement <b>non parallèle</b> "
        "(steepening, flattening, twist) — la duration globale, elle, suppose "
        "toujours un parallel shift.",
        gap_before=6, gap_after=12,
    )

    right.note(
        "<b>Ce qui fait varier la duration</b>, toutes choses égales par "
        "ailleurs : coupon ↑ → duration ↓ · maturité ↑ → duration ↑ (en "
        "général) · YTM ↑ → duration ↓. Cas limite utile : pour une "
        "perpétuité, MacDur = (1+y)/y — à y=5%, MacDur = 1,05/0,05 = 21 ans.",
        gap_before=6,
    )

    # a fresh footer, in the sheet's own style, right after the real end of
    # content (matches the pattern on every page of this sheet)
    end_y = max(left.y, right.y) + 13
    c.setFillColor(HAIRLINE)
    c.rect(19.5, td2pdf(end_y + 0.7), 636.0, 0.7, fill=1, stroke=0)
    c.setFont("DejaVuSansMono", 6.37)
    c.setFillColor(MUTED)
    text_y = td2pdf(end_y + 7.2 + 6.4)
    c.drawString(38.2, text_y, "Théo — CFA Level I, novembre 2026")
    c.drawRightString(636.7, text_y, "4")

    c.showPage()
    c.save()
    buf.seek(0)
    with open(out_path, "wb") as f:
        f.write(buf.read())

if __name__ == "__main__":
    import sys
    build(sys.argv[1])
    print("overlay written to", sys.argv[1])
