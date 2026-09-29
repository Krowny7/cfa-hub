"""Generate the QCM (5 Q/page) + Corrigé pages for a Vault Concept Sheet, and
merge them with the existing concept-only PDF into the final interleaved
document: concept 1, QCM 1, concept 2, QCM 2, ..., concept N, QCM N, corrigé.

Unlike the concept pages (which use embedded custom fonts, see
scripts/pdf/README.md), the QCM/Corrigé pages use plain PDF base-14 fonts
(Helvetica/Helvetica-Bold) — verified by extracting the existing
fixed-income.pdf's QCM/Corrigé pages with pdfplumber (every measurement
below is taken from that extraction), so no font registration is needed.

Usage:
    python build_qcm_pages.py fsa
    python build_qcm_pages.py pm
"""
import io
import re
import sys

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib.colors import Color
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT

HERE = __import__("os").path.dirname(__import__("os").path.abspath(__file__))

# --------------------------------------------------------------------------
# measured design constants (fixed-income.pdf pages 2 and 17, pdfplumber)
PAGE_W, PAGE_H = 675.12, 863.04

BG = Color(0.933333, 0.92549, 0.894118)
CARD_BORDER = Color(0.886275, 0.870588, 0.823529)
NAVY_BG = Color(0.109804, 0.145098, 0.254902)
ACCENT = Color(0.756863, 0.486275, 0.294118)
MUTED_LIGHT = Color(0.788235, 0.807843, 0.858824)
FOOTER_LINE = Color(0.847059, 0.835294, 0.796078)
FOOTER_TEXT = Color(0.419608, 0.447059, 0.501961)
INK_CARD = Color(0.109804, 0.14902, 0.184314)
INK_CORRIGE = Color(0.133333, 0.14902, 0.184314)
TAN = Color(0.929412, 0.886275, 0.815686)
BLUE = Color(0.858824, 0.901961, 0.937255)

CARD_X0, CARD_X1 = 38.0, 637.12
CARD_W = CARD_X1 - CARD_X0
CARD_RADIUS = 6.0
CARD_GAP = 10.0
FIRST_CARD_TOP = 108.0
LABEL_OFFSET = 11.8
LABEL_TO_Q = 14.2
Q_LEADING = 12.5
Q_TO_OPT = 18.4
OPT_LEADING = 13.5
BOTTOM_PAD = 21.6

Q_LEFT = CARD_X0 + 10.0
OPT_LEFT = CARD_X0 + 38.0
RIGHT_PAD = 12.0

FOOTER_Y_TOPDOWN = 823.04

FONT_LABEL = ("Helvetica-Bold", 8.6)
FONT_Q = ("Helvetica-Bold", 9.6)
FONT_OPT_PREFIX = ("Helvetica-Bold", 9.2)
FONT_OPT = ("Helvetica", 9.2)


def td(y):
    return PAGE_H - y


class Question:
    def __init__(self, text, options, answer, explanation):
        self.text = text
        self.options = options
        self.answer = answer
        self.explanation = explanation


class Page:
    def __init__(self, title, questions):
        assert len(questions) == 5, f"page {title!r} needs 5 questions, got {len(questions)}"
        self.title = title
        self.questions = questions


# --------------------------------------------------------------------------
def wrap_text(c, text, font, width):
    name, size = font
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if c.stringWidth(trial, name, size) <= width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def card_height(c, q: Question):
    q_lines = wrap_text(c, q.text, FONT_Q, CARD_W - 20.0)
    opt_width = CARD_X1 - OPT_LEFT - RIGHT_PAD
    wrapped_opts, total_opt_lines = [], 0
    for letter, opt in zip("ABC", q.options):
        ls = wrap_text(c, f"{letter}) {opt}", FONT_OPT, opt_width)
        wrapped_opts.append(ls)
        total_opt_lines += len(ls)
    h = (LABEL_OFFSET + LABEL_TO_Q + Q_LEADING * (len(q_lines) - 1) + Q_TO_OPT
         + OPT_LEADING * (total_opt_lines - 1) + BOTTOM_PAD)
    return h, q_lines, wrapped_opts


def round_rect_path(c, x, y, w, h, r, corners=("tl", "tr", "br", "bl")):
    """Rounded rect (bottom-left origin, reportlab bottom-up coords) with
    only the listed corners rounded."""
    p = c.beginPath()
    k = 0.5523 * r
    if "bl" in corners:
        p.moveTo(x, y + r)
        p.curveTo(x, y + r - k, x + r - k, y, x + r, y)
    else:
        p.moveTo(x, y)
    if "br" in corners:
        p.lineTo(x + w - r, y)
        p.curveTo(x + w - r + k, y, x + w, y + r - k, x + w, y + r)
    else:
        p.lineTo(x + w, y)
    if "tr" in corners:
        p.lineTo(x + w, y + h - r)
        p.curveTo(x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h)
    else:
        p.lineTo(x + w, y + h)
    if "tl" in corners:
        p.lineTo(x + r, y + h)
        p.curveTo(x + r - k, y + h, x, y + h - r + k, x, y + h - r)
    else:
        p.lineTo(x, y + h)
    p.close()
    return p


def draw_frame(c, header_prefix, topic_right, title):
    c.setFillColor(BG)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(Color(1, 1, 1))
    c.setStrokeColor(CARD_BORDER)
    c.setLineWidth(1)
    p = round_rect_path(c, 18, td(845.04), CARD_X1 - 18, 845.04 - 18, CARD_RADIUS)
    c.drawPath(p, fill=1, stroke=1)
    c.setFillColor(NAVY_BG)
    p = round_rect_path(c, 18, td(92), CARD_X1 - 18, 92 - 18, CARD_RADIUS, corners=("tl", "tr"))
    c.drawPath(p, fill=1, stroke=0)
    c.setStrokeColor(ACCENT)
    c.setLineWidth(2.2)
    c.line(18, td(92), CARD_X1, td(92))
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(ACCENT)
    c.drawString(38, td(42.1), header_prefix)
    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED_LIGHT)
    c.drawRightString(CARD_X1 - 18, td(42.1), topic_right)
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(Color(1, 1, 1))
    c.drawString(38, td(66.1), title)
    c.setStrokeColor(FOOTER_LINE)
    c.setLineWidth(0.6)
    c.line(18, td(FOOTER_Y_TOPDOWN), CARD_X1, td(FOOTER_Y_TOPDOWN))


def draw_footer_text(c, page_num):
    c.setFont("Helvetica", 8.0)
    c.setFillColor(FOOTER_TEXT)
    c.drawString(38, td(FOOTER_Y_TOPDOWN + 12.7), "Théo — CFA Level I, novembre 2026")
    c.drawRightString(CARD_X1 - 18, td(FOOTER_Y_TOPDOWN + 12.7), str(page_num))


def draw_qcm_page(c, header_prefix, page_idx_1based, total_pages, page: Page, footer_num):
    draw_frame(c, header_prefix, f"Entraînement {page_idx_1based}/{total_pages}",
               f"QCM — {page.title}")
    y_top = FIRST_CARD_TOP
    for i, q in enumerate(page.questions):
        h, q_lines, wrapped_opts = card_height(c, q)
        c.setFillColor(TAN if i % 2 == 0 else BLUE)
        p = round_rect_path(c, CARD_X0, td(y_top + h), CARD_W, h, CARD_RADIUS)
        c.drawPath(p, fill=1, stroke=0)

        c.setFont(*FONT_LABEL)
        c.setFillColor(INK_CARD)
        c.drawString(Q_LEFT, td(y_top + LABEL_OFFSET + 6.2), f"QUESTION {i + 1}")

        c.setFont(*FONT_Q)
        qy = y_top + LABEL_OFFSET + LABEL_TO_Q
        for j, line in enumerate(q_lines):
            c.drawString(Q_LEFT, td(qy + j * Q_LEADING + 6.9), line)

        oy = qy + Q_LEADING * (len(q_lines) - 1) + Q_TO_OPT
        line_i = 0
        for opt_lines in wrapped_opts:
            for k, line in enumerate(opt_lines):
                yy = oy + line_i * OPT_LEADING
                if k == 0:
                    prefix, rest = line[:3], line[3:]
                    c.setFont(*FONT_OPT_PREFIX)
                    c.setFillColor(INK_CARD)
                    c.drawString(OPT_LEFT, td(yy + 6.6), prefix)
                    c.setFont(*FONT_OPT)
                    c.drawString(OPT_LEFT + c.stringWidth(prefix, *FONT_OPT_PREFIX), td(yy + 6.6), rest)
                else:
                    c.setFont(*FONT_OPT)
                    c.setFillColor(INK_CARD)
                    c.drawString(OPT_LEFT, td(yy + 6.6), line)
                line_i += 1
        y_top += h + CARD_GAP
    draw_footer_text(c, footer_num)


# --------------------------------------------------------------------------
def build_corrige_pdf(header_prefix, topic_label, pages, start_page_num):
    buf = io.BytesIO()
    counter = {"n": start_page_num}
    col_w = 289.56
    top_y, bottom_y = 113.9, 801.0
    left_frame = Frame(38, td(bottom_y), col_w, bottom_y - top_y, id="L",
                        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
                        showBoundary=0)
    right_frame = Frame(347.56, td(bottom_y), col_w, bottom_y - top_y, id="R",
                         leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
                         showBoundary=0)

    def on_page(canv, doc):
        draw_frame(canv, header_prefix, topic_label, "Corrigé — QCM")
        draw_footer_text(canv, counter["n"])
        counter["n"] += 1

    doc = BaseDocTemplate(buf, pagesize=(PAGE_W, PAGE_H),
                           leftMargin=0, rightMargin=0, topMargin=0, bottomMargin=0)
    doc.addPageTemplates([PageTemplate(id="corrige", frames=[left_frame, right_frame], onPage=on_page)])

    style_header = ParagraphStyle("hdr", fontName="Helvetica-Bold", fontSize=9, leading=16.8,
                                   textColor=NAVY_BG, spaceBefore=0, spaceAfter=0, alignment=TA_LEFT)
    style_q = ParagraphStyle("q", fontName="Helvetica", fontSize=8.4, leading=10.8,
                              textColor=INK_CORRIGE, spaceBefore=0, spaceAfter=0, alignment=TA_LEFT)

    story = []
    for pi, page in enumerate(pages):
        if pi > 0:
            story.append(Spacer(1, 25.0 - 16.8))
        story.append(Paragraph(f"Page {pi + 1} — {_xml_escape(page.title)}", style_header))
        for qi, q in enumerate(page.questions):
            text = f'<b>Q{qi + 1} — Réponse {q.answer}.</b> {_xml_escape(q.explanation)}'
            story.append(Paragraph(text, style_q))
    doc.build(story)
    return buf.getvalue(), counter["n"] - start_page_num


def _xml_escape(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


_SANITIZE = {
    "−": "-",       # − minus sign: not in Helvetica/WinAnsi, unlike the hyphen
    "√": "sqrt ",   # √: not in WinAnsi
    "σ": "sigma",   # σ: not in WinAnsi
    "ρ": "rho",     # ρ: not in WinAnsi
    "β": "beta",    # β: not in WinAnsi
    "₁": "1", "₂": "2", "₀": "0", "₃": "3",  # subscripts
}


def sanitize(s):
    """Base-14 Helvetica only covers WinAnsi; swap the handful of math/Greek
    glyphs the sourced explanations use (×, ², –, — and € are in WinAnsi and
    are left alone) for ASCII so nothing silently renders as a blank."""
    for k, v in _SANITIZE.items():
        s = s.replace(k, v)
    return s


# --------------------------------------------------------------------------
def parse_raw(text, order):
    """order: list of (reading_number:int, fiche_title:str) in the desired
    final page order. Returns list[Page] in that order."""
    blocks = {}
    parts = re.split(r'\nREADING\s+(\d+)\s+—\s+[^\n]*\n', "\n" + text.strip() + "\n")
    # parts[0] is empty/preamble; then alternates: number, body, number, body...
    for i in range(1, len(parts), 2):
        num = int(parts[i])
        body = parts[i + 1]
        qs = []
        for m in re.finditer(
            r'Q\d+:\s*(.*?)\n'
            r'A\)\s*(.*?)\n'
            r'B\)\s*(.*?)\n'
            r'C\)\s*(.*?)\n'
            r'ANSWER:\s*([ABC])\s*\n'
            r'EXPLANATION:\s*(.*?)(?=\n\s*\n|\nQ\d+:|\Z)',
            body, re.DOTALL,
        ):
            qtext, a, b, c, ans, expl = m.groups()
            qs.append(Question(
                text=sanitize(' '.join(qtext.split())),
                options=[sanitize(' '.join(a.split())), sanitize(' '.join(b.split())), sanitize(' '.join(c.split()))],
                answer=ans,
                explanation=sanitize(' '.join(expl.split())),
            ))
        blocks[num] = qs
    pages = []
    for num, title in order:
        qs = blocks.get(num)
        if not qs or len(qs) != 5:
            raise ValueError(f"reading {num} ({title}): found {len(qs) if qs else 0} questions, need 5")
        pages.append(Page(title, qs))
    return pages


# --------------------------------------------------------------------------
def build(concept_pdf, out_pdf, header_prefix, topic_label, pages):
    concept_reader = PdfReader(concept_pdf)
    n_concept = len(concept_reader.pages)
    assert n_concept == len(pages), f"{concept_pdf} has {n_concept} pages but {len(pages)} Page entries given"

    qcm_buf = io.BytesIO()
    c = pdfcanvas.Canvas(qcm_buf, pagesize=(PAGE_W, PAGE_H))
    for i, page in enumerate(pages):
        draw_qcm_page(c, header_prefix, i + 1, n_concept, page, footer_num=(i + 1) * 2)
        c.showPage()
    c.save()
    qcm_reader = PdfReader(io.BytesIO(qcm_buf.getvalue()))
    assert len(qcm_reader.pages) == n_concept

    corrige_start = n_concept * 2 + 1
    corrige_bytes, n_corrige = build_corrige_pdf(header_prefix, topic_label, pages, corrige_start)
    corrige_reader = PdfReader(io.BytesIO(corrige_bytes))

    writer = PdfWriter()
    for i in range(n_concept):
        writer.add_page(concept_reader.pages[i])
        writer.add_page(qcm_reader.pages[i])
    for p in corrige_reader.pages:
        writer.add_page(p)

    with open(out_pdf, "wb") as f:
        writer.write(f)
    print(f"wrote {out_pdf}: {n_concept} concept + {n_concept} QCM + {n_corrige} corrigé "
          f"= {n_concept * 2 + n_corrige} pages")


# --------------------------------------------------------------------------
TOPICS = {
    "fsa": dict(
        concept_pdf=r"C:\Users\chaum\Downloads\fsa_vault_sheet.pdf",
        out_pdf=r"C:\Users\chaum\Downloads\fsa_vault_sheet_full.pdf",
        header_prefix="CFA LEVEL I — FINANCIAL STATEMENT ANALYSIS",
        topic_label="Financial Statement Analysis",
        raw_file="qcm_data/fsa_raw.txt",
        order=[
            (29, "Introduction to Financial Statement Analysis"),
            (31, "Analyzing Balance Sheets"),
            (32, "Analyzing Cash Flow Statements — Module 1"),
            (33, "Analyzing Statements of Cash Flows II"),
            (34, "Analysis of Inventories"),
            (35, "Analysis of Long-Term Assets"),
            (36, "Topics in Long-Term Liabilities and Equity"),
            (37, "Analysis of Income Taxes"),
            (38, "Financial Reporting Quality"),
            (39, "Financial Analysis Techniques"),
            (40, "Introduction to Financial Statement Modeling"),
        ],
    ),
    "pm": dict(
        concept_pdf=r"C:\Users\chaum\Downloads\pm_vault_sheet.pdf",
        out_pdf=r"C:\Users\chaum\Downloads\pm_vault_sheet_full.pdf",
        header_prefix="CFA LEVEL I — PORTFOLIO MANAGEMENT",
        topic_label="Portfolio Management",
        raw_file="qcm_data/pm_raw.txt",
        order=[
            (20, "Portfolio Risk and Return: Part I"),
            (21, "Portfolio Risk and Return: Part II"),
            (85, "Portfolio Management: An Overview"),
            (86, "Basics of Portfolio Planning and Construction"),
            (87, "The Behavioral Biases of Individuals"),
            (88, "Introduction to Risk Management"),
        ],
    ),
}


def main():
    key = sys.argv[1]
    cfg = TOPICS[key]
    with open(f"{HERE}/{cfg['raw_file']}", encoding="utf-8") as f:
        raw = f.read()
    pages = parse_raw(raw, cfg["order"])
    build(cfg["concept_pdf"], cfg["out_pdf"], cfg["header_prefix"], cfg["topic_label"], pages)


if __name__ == "__main__":
    main()
