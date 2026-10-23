"""Generate the SYNTHESE pages of a Vault Concept Sheet from a JSON content file.

    python -I scripts/pdf/build_synthese.py <contenu.json> <sortie.pdf> [--fonts-dir <dir>]

The pages reproduce the concept sheets printed by Chromium (Alternative
Investments, Corporate Issuers...): every measurement below was read off those
PDFs (pdfplumber / content-stream dumps). Layout is done in CSS px
(1 px = 0.75 pt, page 900 px = 675.12 pt wide) with Blink's own rules:
integer-rounded font ascent/descent, half-leading floored, line boxes grown by
sub/superscripts and inline fractions, font sizes floored to 1/64 px for the
advances, Inter's kerning (GPOS) and contextual case forms (GSUB calt) applied,
baselines and box edges snapped to whole pixels.
Checked on page 1 of the Alternative Investments sheet, transcribed to JSON:
same line breaks, every text run within 1 px of the original, same fonts,
sizes and colours (renders side by side are indistinguishable).

Fonts: body text in scripts/pdf/fonts/Inter-{Regular,SemiBold,Bold}.ttf (the
font the recent sheets use, see build_inter_fonts.py) or, with the "classic"
theme, LiberationSans(-Bold); DejaVuSansMono(-Bold) for labels / formulas /
footer and LiberationSerif-Bold for the page title, full files from the Windows
font folder (%WINDIR%/Fonts) or from --fonts-dir. Characters a font lacks
(e.g. ⇒ in Liberation Sans) fall back to DejaVuSans(-Bold) from the same folder.

------------------------------------------------------------------------------
JSON FORMAT  (UTF-8; in JSON a backslash is written twice: "\\frac{a}{b}")
------------------------------------------------------------------------------
{
  "subject":  "Alternative Investments",          # PDF title (+ footer right, see below)
  "footer":   "Théo — CFA Level I, novembre 2026",  # footer left
  "footer_right": "subject",     # "subject" | "page" (page number) | any text;
                                 # default: the theme's ("page" for classic)
  "kicker":   "CFA LEVEL I — ...",  # optional default for the pages' kicker
  "theme":    "alternatives",    # preset: alternatives (default), corporate,
                                 #   classic (grey #E9E9E4 page, white sheet, navy #232B38,
                                 #   copper #B5651D, labels #8A4A15 on #F2E4D3, Liberation Sans),
                                 #   derivatives (classic colours with Inter, white page)
                                 # or {"preset": "...", <THEMES keys to override>, e.g.
                                 #   "page_bg": "#E9E9E4", "body_font": "inter"|"liberation",
                                 #   "default_tone": "a", "tones": {"b": {"tint": "#..."}}}
  "height":   "auto",            # "auto": each page as tall as its content (default)
                                 # "uniform": every page as tall as the tallest
                                 # <number>: fixed page height in pt (e.g. 816)
  "footer_at": "content",        # "content": footer right under the content (default)
                                 # "bottom": footer pinned to the bottom of the page
  "pages": [
    { "kicker": "CFA LEVEL I — ALTERNATIVE INVESTMENTS · READINGS 76 & 77",
      "title":  "Features, Methods & Structures · Performance & Returns",
      "tag":    "Vault Concept Sheet — 1/4",      # optional (default: "Vault Concept Sheet — n/N")
      "left":   [ <section>, ... ],               # left column, top to bottom
      "right":  [ <section>, ... ] }              # right column
  ]
}
No automatic page break: the generator prints each page height and warns above
863.04 pt (the tallest existing page); move a section to the next page then.

<section> = {"title": "R76 · FEATURES VS TRADITIONNELS", "tone": "a", "blocks": [<block>, ...]}
    tone = colour of the left stripe + header band + label: "a" (theme accent 1, default),
           "b" (accent 2), "c" (accent 3, red/pink), "n" (neutral / ink).
    The title is printed as given (write it in capitals, "R76 · ..." style).

<block> (field "type"):
  {"type": "p",       "text": "..."}                         paragraph (10.2 px)
  {"type": "list",    "items": ["...", "..."]}               bullet list
  {"type": "cards",   "items": [{"title": "Private capital", "text": "...", "tone": "a"}, ...]}
                      2 to 4 rounded tinted boxes side by side (mono title + 9.4 px text);
                      "columns": n to wrap more items on several rows
  {"type": "split",   "items": [{"title": "AMERICAN (DEAL-BY-DEAL)", "text": "...", "tone": "a"},
                                {"title": "...", "text": "...", "tone": "b"}]}
                      two full-width halves (comparison), flush with the section edges
  {"type": "table",   "head": ["ÉLÉMENT", "À RETENIR"], "rows": [["Management fee", "..."], ...],
                      "widths": [0.22, 0.78]}               widths optional (else CSS auto layout);
                      first column = row labels (semi-bold, tinted); "" = empty head cell
  {"type": "formula", "lines": ["Net return = \\frac{Valeur finale − fees − valeur initiale}{Valeur initiale}",
                                "Hard hurdle : base = gain − (hurdle % × valeur **initiale**)"]}
                      monospace box with the accent-1 stripe, one entry per line (long
                      lines wrap); \\frac{num}{den} = stacked fraction
  {"type": "note",    "label": "Piège", "text": "...", "tone": "c"}
                      callout box (stripe + tint of the tone, default "c"), "label — text"

Inline markup (every text field):
  **bold**            bold (body bold, or DejaVu Sans Mono Bold inside a formula)
  `PPP`               small monospace tag (bold, coloured like the current tone)
  _{B}  ^{er}         subscript / superscript
  {a|text}            coloured text: a, b, c, n (tone text colours) or #RRGGBB; nests with **
  \\frac{a}{b}        stacked fraction (formula lines, but works anywhere)
  \\*  \\`  \\{  \\}  \\_  \\^  \\|  \\\\   literal characters
Use a non-breaking space (U+00A0) to glue two words; "->" etc. are shaped like Chromium does.
Full example: a JSON with every block type is kept with the work files (exemple.json).
"""
import json
import math
import os
import re
import sys

from fontTools.ttLib import TTFont as FTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLTTFont
from reportlab.pdfgen import canvas as rl_canvas

HERE = os.path.dirname(os.path.abspath(__file__))
PX = 0.75                    # pt per CSS px
PAGE_W = 900.0               # px  (675 pt; the sheets say 675.12: 900.16 px, kept for the MediaBox)
MEDIA_W_PT = 675.12
MAX_H_PT = 863.04            # tallest page of the existing sheets

# ----------------------------------------------------------------------------- themes
THEMES = {
    # measured on Alternative_Investments_Vault_Concept_Sheet.pdf
    "alternatives": {
        "ink": "#24272D", "page_bg": "#FFFFFF", "sheet_bg": "#FFFFFF", "rule": "#D8D9D2",
        "header_bg": "#24272D", "header_rule": "#6C7A1F", "kicker": "#D2603A",
        "title": "#FFFFFF", "tag": "#A5A8A0", "footer": "#8E9188",
        "table_head_bg": "#24272D", "table_head_text": "#FFFFFF", "table_label_bg": "#F2F0E8",
        "formula_bg": "#F2F5E0", "formula_rule": "#6C7A1F", "bullet": "#24272D",
        "tones": {
            "a": {"stripe": "#6C7A1F", "tint": "#E8EDCB", "text": "#4A5413"},
            "b": {"stripe": "#D2603A", "tint": "#FAE3D9", "text": "#8A3718"},
            "c": {"stripe": "#9C2F5B", "tint": "#F5DCE6", "text": "#9C2F5B"},
            "n": {"stripe": "#24272D", "tint": "#E6E7E4", "text": "#24272D"},
        },
    },
    # measured on corporate-synthese.pdf
    "corporate": {
        "ink": "#2A2236", "page_bg": "#FFFFFF", "sheet_bg": "#FFFFFF", "rule": "#DAD5DF",
        "header_bg": "#2A2236", "header_rule": "#6A3E8E", "kicker": "#C2822B",
        "title": "#FFFFFF", "tag": "#A99DB8", "footer": "#8E8897",
        "table_head_bg": "#2A2236", "table_head_text": "#FFFFFF", "table_label_bg": "#F3EFEA",
        "formula_bg": "#F2EBF8", "formula_rule": "#6A3E8E", "bullet": "#2A2236",
        "tones": {
            "a": {"stripe": "#6A3E8E", "tint": "#E8DEF1", "text": "#4A2A68"},
            "b": {"stripe": "#C2822B", "tint": "#F8E8CD", "text": "#7D4E10"},
            "c": {"stripe": "#B03A52", "tint": "#F6DFE4", "text": "#B03A52"},
            "n": {"stripe": "#2A2236", "tint": "#E7E3EC", "text": "#2A2236"},
        },
    },
    # palette of the first sheets (Fixed Income, Equity, FSA... measured on
    # Fixed_Income_Vault_Concept_Sheet.pdf): grey page #E9E9E4 around the white sheet,
    # navy #232B38, copper #B5651D, labels #8A4A15 on #F2E4D3, Liberation Sans body text
    "classic": {
        "ink": "#232B38", "page_bg": "#E9E9E4", "sheet_bg": "#FFFFFF", "rule": "#DDD9D0",
        "header_bg": "#232B38", "header_rule": "#B5651D", "kicker": "#B5651D",
        "title": "#FFFFFF", "tag": "#8B93A8", "footer": "#8A8FA0",
        "table_head_bg": "#232B38", "table_head_text": "#FFFFFF", "table_label_bg": "#F0EEE6",
        "formula_bg": "#F0EEE6", "formula_rule": "#B5651D", "bullet": "#232B38",
        "body_font": "liberation", "footer_right": "page",
        "tones": {
            "a": {"stripe": "#B5651D", "tint": "#F2E4D3", "text": "#8A4A15"},
            "b": {"stripe": "#2E6E8E", "tint": "#DCEAF1", "text": "#2E6E8E"},
            "c": {"stripe": "#A33B3B", "tint": "#F6DFDC", "text": "#A33B3B"},
            "n": {"stripe": "#232B38", "tint": "#E7E9EE", "text": "#232B38"},
        },
    },
}
THEMES["derivatives"] = dict(THEMES["classic"], body_font="inter", footer_right="subject")
THEME_DEFAULTS = {"body_font": "inter", "footer_right": "subject", "default_tone": "a"}

# ----------------------------------------------------------------------------- geometry (px)
SHEET_X0, SHEET_X1 = 25.0, 875.0
HEADER_H, HEADER_RULE_H = 72.0, 3.0
KICKER = dict(x=53.0, base=25.0, size=10.0, ls=0.12)      # ls in em
TITLE = dict(x=53.0, base=48.0, size=19.0)
TAG = dict(right=847.0, base=38.0, size=9.0)
COL_TOP = 88.0
COL_X = (49.0, 460.0)
COL_W = 391.0
SECTION_GAP = 12.0
SEC_BORDER, SEC_STRIPE, SEC_RADIUS = 1.0, 3.0, 4.0
BAND_H = 24.0                 # header band incl. its 1 px bottom rule
LABEL = dict(dx=15.0, dy=16.0, size=9.5, ls=0.03)
BODY_DX, BODY_W = 15.0, 363.0  # content box inside a section (x from the section's left edge)
INNER_W = 387.0                # full-bleed width (tables, split)
FOOTER_GAP = 18.0              # content bottom -> footer rule
FOOTER_TEXT_DY = 17.0          # footer rule -> footer baseline
FOOTER_BELOW = 36.0            # footer rule -> page bottom
FOOTER = dict(x=51.0, right=849.0, size=8.5)
SHEET_BOTTOM_GAP = 9.0         # white sheet stops 9 px above the page bottom

P_STYLE = dict(size=10.2, lh=1.43)
LIST_STYLE = dict(size=10.2, lh=1.43, indent=14.0, bullet_dx=1.0, item_gap=2.55)
CARD = dict(gap=6.0, radius=4.0, pad_x=8.0, pad_top=6.0, title_size=8.3, title_box=13.0,
            size=9.39, lh_px=12.75, pad_bottom=6.25)
SPLIT = dict(pad_x=12.0, pad_top=8.0, title_size=8.3, title_box=13.5, size=10.0, lh=1.4, pad_bottom=8.0)
TABLE = dict(head_size=7.8, head_lh=1.4, head_ls=0.03, size=9.5, lh=1.35, pad_y=4.0, pad_x=6.0)
FORMULA = dict(size=10.0, lh=1.5, pad_y=6.0, pad_x=10.0)
FRAC = dict(scale=0.939, lh=1.1, margin=2.0, pad_x=2.0, num_pb=2.0, den_pt=0.5, bar=1.0)
NOTE = dict(size=9.5, lh=1.5, pad_top=6.0, pad_bottom=4.5, pad_x=10.0)
TAG_SCALE = 8.3 / 9.39        # inline `tag` size relative to its text

# vertical rhythm inside a section body: offset of the first block under the header band,
# gap between two blocks, padding under the last one (measured, px)
FIRST = {"p": 9.0, "list": 9.0, "cards": 8.0, "formula": 4.0, "note": 4.0, "table": 0.0, "split": 0.0}
LAST = {"p": 9.0, "list": 13.9, "cards": 8.0, "formula": 6.0, "note": 9.0, "table": 0.0, "split": 0.0}
GAP = {("p", "cards"): 17.0, ("p", "formula"): 13.0, ("p", "note"): 13.0, ("p", "p"): 6.0,
       ("p", "list"): 6.0, ("p", "table"): 9.0, ("p", "split"): 9.0,
       ("cards", "p"): 8.3, ("cards", "list"): 8.3, ("cards", "formula"): 8.0, ("cards", "cards"): 6.0,
       ("formula", "note"): 6.0, ("formula", "p"): 6.0, ("formula", "list"): 6.0, ("formula", "formula"): 6.0,
       ("formula", "cards"): 8.0, ("note", "p"): 6.0, ("note", "formula"): 6.0, ("note", "cards"): 8.0,
       ("table", "formula"): 6.0, ("table", "p"): 7.0, ("table", "list"): 7.0, ("table", "note"): 6.0,
       ("table", "cards"): 8.0, ("split", "p"): 7.0, ("split", "list"): 7.0, ("split", "formula"): 6.0,
       ("split", "table"): 0.0, ("table", "split"): 0.0, ("list", "p"): 6.0, ("list", "formula"): 6.0}
GAP_DEFAULT = 8.0


def snap(v):
    return math.floor(v + 0.5)


def qsize(size):
    """Blink/Skia lay glyphs out at the font size floored to 1/64 px."""
    return math.floor(size * 64 + 1e-6) / 64


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


# ============================================================================= fonts / shaping
class Face:
    """One font file: metrics + a small OpenType shaper (GSUB ccmp/locl/calt/liga, GPOS kern)."""

    def __init__(self, key, path):
        self.key = key
        f = FTFont(path)
        self.upm = f["head"].unitsPerEm
        self.cmap = f.getBestCmap()
        self.rev = {}
        for cp, g in sorted(self.cmap.items()):
            if g not in self.rev or (self.rev[g] >= 0xE000 and cp < 0xE000):
                self.rev[g] = cp
        self.adv = {g: m[0] for g, m in f["hmtx"].metrics.items()}
        hh = f["hhea"]
        self.asc, self.desc = hh.ascent / self.upm, -hh.descent / self.upm
        os2 = f["OS/2"] if "OS/2" in f else None
        self.xh = ((getattr(os2, "sxHeight", 0) or 0) / self.upm) if os2 else 0.0
        if not self.xh:     # old OS/2 table (DejaVu): x-height = top of the "x" glyph, as Skia does
            gx = self.cmap.get(ord("x"))
            g = f["glyf"][gx] if gx and "glyf" in f else None
            self.xh = (g.yMax / self.upm) if g is not None and hasattr(g, "yMax") else 0.5
        self._cov = {}
        self.gsub = self._lookups(f, "GSUB", ("ccmp", "locl", "rlig", "calt", "liga", "clig"))
        self.gpos = self._lookups(f, "GPOS", ("kern",))
        self.kern_pairs = None
        if not self.gpos and "kern" in f:
            self.kern_pairs = {}
            for st in f["kern"].kernTables:
                self.kern_pairs.update(st.kernTable)
        pdfmetrics.registerFont(RLTTFont(key, path))
        self.rl = pdfmetrics.getFont(key)
        self.cache = {}

    def _lookups(self, f, tag, feats):
        if tag not in f:
            return None
        t = f[tag].table
        if not t.ScriptList or not t.FeatureList:
            return None
        ls = None
        for sr in t.ScriptList.ScriptRecord:
            if sr.ScriptTag == "latn" and sr.Script.DefaultLangSys:
                ls = sr.Script.DefaultLangSys
        if ls is None:
            for sr in t.ScriptList.ScriptRecord:
                if sr.ScriptTag == "DFLT" and sr.Script.DefaultLangSys:
                    ls = sr.Script.DefaultLangSys
        if ls is None:
            return None
        idx = set()
        for fi in ls.FeatureIndex:
            fr = t.FeatureList.FeatureRecord[fi]
            if fr.FeatureTag in feats:
                idx.update(fr.Feature.LookupListIndex)
        return (sorted(idx), t.LookupList.Lookup) if idx else None

    def cov(self, c):
        s = self._cov.get(id(c))
        if s is None:
            s = self._cov[id(c)] = (set(c.glyphs), c)
        return s[0]

    def shape(self, text):
        """-> list of (glyph name, cluster index, advance in font units incl. kerning)."""
        hit = self.cache.get(text)
        if hit is not None:
            return hit
        buf = [[self.cmap.get(ord(ch), self.cmap.get(0x20) if ch == "\u00a0" else ".notdef"), i]
               for i, ch in enumerate(text)]
        if self.gsub:
            plain = [list(x) for x in buf]
            order, ll = self.gsub
            for li in order:
                self._lookup(ll, li, buf, 0, True)
            if any(g not in self.rev for g, _ in buf):   # a substitute reportlab cannot draw
                buf = plain                              # (no code point): keep the plain glyphs
        adv = [self.adv.get(g, 0) for g, _ in buf]
        if self.gpos:
            order, ll = self.gpos
            for li in order:
                self._kern(ll[li], buf, adv)
        elif self.kern_pairs:
            for i in range(len(buf) - 1):
                adv[i] += self.kern_pairs.get((buf[i][0], buf[i + 1][0]), 0)
        out = [(g, cl, a) for (g, cl), a in zip(buf, adv)]
        self.cache[text] = out
        return out

    def _lookup(self, ll, li, buf, i, top):
        L = ll[li]
        while i < len(buf):
            res = None
            for st in L.SubTable:
                typ = L.LookupType
                if typ == 7:
                    typ, st = st.ExtensionLookupType, st.ExtSubTable
                res = self._subst(ll, typ, st, buf, i)
                if res is not None:
                    break
            if not top:
                return res
            i = res if res is not None else i + 1
        return None

    def _subst(self, ll, typ, st, buf, i):
        g = buf[i][0]
        if typ == 1:
            if g in st.mapping:
                buf[i][0] = st.mapping[g]
                return i + 1
        elif typ == 2:
            if g in st.mapping:
                seq = st.mapping[g]
                buf[i:i + 1] = [[x, buf[i][1]] for x in seq]
                return i + len(seq)
        elif typ == 4:
            for lig in st.ligatures.get(g, ()):
                comps = lig.Component
                n = len(comps)
                if i + n < len(buf) and all(buf[i + 1 + k][0] == comps[k] for k in range(n)):
                    buf[i:i + 1 + n] = [[lig.LigGlyph, buf[i][1]]]
                    return i + 1
        elif typ == 6 and st.Format == 3:
            ins = st.InputCoverage
            n = len(ins)
            if i + n > len(buf):
                return None
            for k, c in enumerate(ins):
                if buf[i + k][0] not in self.cov(c):
                    return None
            for k, c in enumerate(st.BacktrackCoverage):
                j = i - 1 - k
                if j < 0 or buf[j][0] not in self.cov(c):
                    return None
            for k, c in enumerate(st.LookAheadCoverage):
                j = i + n + k
                if j >= len(buf) or buf[j][0] not in self.cov(c):
                    return None
            before = len(buf)
            for rec in st.SubstLookupRecord:
                self._lookup(ll, rec.LookupListIndex, buf, i + rec.SequenceIndex, False)
            return i + n + (len(buf) - before)
        return None

    def _kern(self, L, buf, adv):
        for i in range(len(buf) - 1):
            g1, g2 = buf[i][0], buf[i + 1][0]
            for st in L.SubTable:
                typ = L.LookupType
                if typ == 9:
                    typ, st = st.ExtensionLookupType, st.ExtSubTable
                if typ != 2 or g1 not in self.cov(st.Coverage):
                    continue
                if st.Format == 1:
                    ps = st.PairSet[st.Coverage.glyphs.index(g1)]
                    rec = next((pv for pv in ps.PairValueRecord if pv.SecondGlyph == g2), None)
                    if rec is None:
                        continue
                    v = rec.Value1
                else:
                    c1 = st.ClassDef1.classDefs.get(g1, 0)
                    c2 = st.ClassDef2.classDefs.get(g2, 0)
                    v = st.Class1Record[c1].Class2Record[c2].Value1
                adv[i] += (getattr(v, "XAdvance", 0) or 0) if v else 0
                break

    def cp_of(self, glyph):
        return self.rev.get(glyph, 0x20)

    def vmetrics(self, size, lh):
        """Blink line metrics for an inline box: (ascent above baseline, descent below)."""
        a, d = round(self.asc * size), round(self.desc * size)
        half = math.floor((lh - (a + d)) / 2)
        return a + half, lh - (a + half)


FACES = {}
FALLBACK = {"sans": "fallback", "sans-semi": "fallback-bold", "sans-bold": "fallback-bold",
            "mono": "fallback", "mono-bold": "fallback-bold", "serif-bold": "fallback-bold"}


def load_fonts(fonts_dir, body_font="inter"):
    sysdir = fonts_dir or os.path.join(os.environ.get("WINDIR", ""), "Fonts")
    if body_font == "liberation":          # no semi-bold in Liberation Sans: bold instead
        body = {"sans": os.path.join(sysdir, "LiberationSans-Regular.ttf"),
                "sans-semi": os.path.join(sysdir, "LiberationSans-Bold.ttf"),
                "sans-bold": os.path.join(sysdir, "LiberationSans-Bold.ttf")}
    else:
        body = {"sans": os.path.join(HERE, "fonts", "Inter-Regular.ttf"),
                "sans-semi": os.path.join(HERE, "fonts", "Inter-SemiBold.ttf"),
                "sans-bold": os.path.join(HERE, "fonts", "Inter-Bold.ttf")}
    spec = {
        **body,
        "mono": os.path.join(sysdir, "DejaVuSansMono.ttf"),
        "mono-bold": os.path.join(sysdir, "DejaVuSansMono-Bold.ttf"),
        "serif-bold": os.path.join(sysdir, "LiberationSerif-Bold.ttf"),
    }
    for k, p in spec.items():
        if not os.path.exists(p):
            sys.exit(f"font not found: {p} (use --fonts-dir <folder with DejaVuSansMono.ttf ...>)")
        FACES[k] = Face("VS-" + k, p)
    for k, name in (("fallback", "DejaVuSans.ttf"), ("fallback-bold", "DejaVuSans-Bold.ttf")):
        p = os.path.join(sysdir, name)
        if os.path.exists(p):
            FACES[k] = Face("VS-" + k, p)


# ============================================================================= inline content
class Style:
    __slots__ = ("face", "size", "color", "ls", "shift", "lh_ratio", "lh_px", "fallback", "_fb")

    def __init__(self, face, size, color, ls=0.0, shift=0.0, lh_ratio=None, lh_px=None):
        self.face, self.size, self.color, self.ls, self.shift = face, size, color, ls, shift
        self.lh_ratio, self.lh_px = lh_ratio, lh_px
        self.fallback, self._fb = False, None

    def fb(self):
        """Same style in the fallback font (characters the main font lacks, e.g. ⇒ in Liberation)."""
        if self._fb is None:
            self._fb = self.copy(face=FALLBACK[self.face], fallback=True)
        return self._fb

    def copy(self, **kw):
        s = Style(self.face, self.size, self.color, self.ls, self.shift, self.lh_ratio, self.lh_px)
        for k, v in kw.items():
            setattr(s, k, v)
        return s

    @property
    def lh(self):
        return self.lh_px if self.lh_px is not None else self.lh_ratio * self.size


class Ctx:
    """What inline markup needs to know: the theme, the current tone, mono or sans text."""

    def __init__(self, theme, tone, mono=False):
        self.theme, self.tone, self.mono = theme, tone, mono

    def tone_color(self, name):
        if name.startswith("#"):
            return name
        return self.theme["tones"].get(name, self.theme["tones"]["n"])["text"]


def _bold(style, ctx):
    k = style.face
    if k.startswith("mono"):
        return style.copy(face="mono-bold")
    return style.copy(face="sans-bold")


TOKEN = re.compile(r"\\frac\{|\\[*`{}_^|\\]|\*\*|`|_\{|\^\{|\{(?:[abcn]|#[0-9A-Fa-f]{6})\||\}")


def parse_inline(text, base, ctx):
    """Markup -> list of items: ("t", text, Style) or ("frac", num_items, den_items, Style)."""
    items = []
    stack = [("root", base)]
    pos = 0

    def cur():
        return stack[-1][1]

    def push_text(t):
        if t:
            items_target().append(("t", t, cur()))

    targets = [items]

    def items_target():
        return targets[-1]

    while pos < len(text):
        m = TOKEN.search(text, pos)
        if not m:
            push_text(text[pos:])
            break
        push_text(text[pos:m.start()])
        tok = m.group(0)
        pos = m.end()
        if len(tok) == 2 and tok[0] == "\\":
            push_text(tok[1])
        elif tok == "**":
            if stack[-1][0] == "bold":
                stack.pop()
            else:
                stack.append(("bold", _bold(cur(), ctx)))
        elif tok == "`":
            if stack[-1][0] == "tag":
                stack.pop()
            else:
                s = cur()
                stack.append(("tag", s.copy(face="mono-bold", size=s.size * TAG_SCALE,
                                            color=ctx.tone_color(ctx.tone))))
        elif tok == "_{":
            s = cur()
            stack.append(("}", s.copy(size=s.size / 1.2, shift=s.shift + s.size / 5 + 1)))
        elif tok == "^{":
            s = cur()
            stack.append(("}", s.copy(size=s.size / 1.2, shift=s.shift - (s.size / 3 + 1))))
        elif tok.startswith("{"):
            stack.append(("}", cur().copy(color=ctx.tone_color(tok[1:-1]))))
        elif tok == "\\frac{":
            s = cur()
            fs = s.copy(size=s.size * FRAC["scale"], lh_ratio=FRAC["lh"], lh_px=None)
            frac = ["frac", [], [], s, fs]
            items_target().append(frac)
            targets.append(frac[1])
            stack.append(("frac-num", fs))
        elif tok == "}":
            kind = stack[-1][0]
            if kind == "frac-num":
                targets.pop()
                frac = items_target()[-1]
                stack.pop()
                if pos < len(text) and text[pos] == "{":
                    pos += 1
                    targets.append(frac[2])
                    stack.append(("frac-den", frac[4]))
            elif kind == "frac-den":
                targets.pop()
                stack.pop()
            elif kind == "}":
                stack.pop()
            else:
                push_text("}")
    return items


# ----------------------------------------------------------------------------- measuring
class Glyph:
    __slots__ = ("cp", "adv", "ch")

    def __init__(self, cp, adv, ch):
        self.cp, self.adv, self.ch = cp, adv, ch


def shape_run(text, style):
    """-> list of (char, Glyph list for that char, advance px, Style used for that char).
    Characters missing from the font are shaped with the fallback font (DejaVu Sans)."""
    face = FACES[style.face]
    if FALLBACK.get(style.face) in FACES:
        ok = [ch in "\n\u00a0" or ord(ch) in face.cmap for ch in text]
        if not all(ok):
            out, i = [], 0
            while i < len(text):
                j = i
                while j < len(text) and ok[j] == ok[i]:
                    j += 1
                out.extend(shape_run(text[i:j], style if ok[i] else style.fb()))
                i = j
            return out
    return _shape_one(text, style)


def _shape_one(text, style):
    face = FACES[style.face]
    q = qsize(style.size)
    ls = style.ls * style.size
    shaped = face.shape(text)
    per_char = [[] for _ in text]
    for g, cl, a in shaped:
        per_char[cl].append(Glyph(face.cp_of(g), a * q / face.upm + ls, text[cl]))
    out = []
    for i, ch in enumerate(text):
        gl = per_char[i]
        out.append((ch, gl, sum(x.adv for x in gl), style))
    return out


class Atom:
    """Unbreakable inline box (a fraction)."""

    def __init__(self, w, above, below, draw):
        self.w, self.above, self.below, self.draw = w, above, below, draw


def build_frac(item):
    _, num, den, parent, fs = item
    num_l = layout_lines(num, fs, 1e9)
    den_l = layout_lines(den, fs, 1e9)
    nw = max((ln.width for ln in num_l), default=0)
    dw = max((ln.width for ln in den_l), default=0)
    inner = max(nw, dw) + 2 * FRAC["pad_x"]
    nh = sum(ln.height for ln in num_l)
    dh = sum(ln.height for ln in den_l)
    h = nh + FRAC["num_pb"] + FRAC["bar"] + FRAC["den_pt"] + dh
    pface = FACES[parent.face]
    mid = round(pface.xh * parent.size * 64) / 64 / 2
    above = mid + h / 2
    below = h / 2 - mid
    w = inner + 2 * FRAC["margin"]

    def draw(pen, x, baseline):
        top = baseline - above
        x0 = x + FRAC["margin"]
        y = top
        for ln in num_l:
            ln.draw(pen, x0 + (inner - ln.width) / 2, y)
            y += ln.height
        bar_top = top + nh + FRAC["num_pb"]
        pen.rect(x0, bar_top, inner, FRAC["bar"], pen.theme["formula_rule"], snap_edges=True)
        y = bar_top + FRAC["bar"] + FRAC["den_pt"]
        for ln in den_l:
            ln.draw(pen, x0 + (inner - ln.width) / 2, y)
            y += ln.height

    return Atom(w, above, below, draw)


class Line:
    def __init__(self, frags, strut):
        self.frags = frags            # list of (kind, payload, style, x, width)
        self.strut = strut
        face = FACES[strut.face]
        a, d = face.vmetrics(strut.size, strut.lh)
        top, bot = -a, d
        for kind, payload, st, x, w in frags:
            if kind == "atom":
                top = min(top, -payload.above)
                bot = max(bot, payload.below)
            elif st is not strut and not st.fallback:
                fa, fd = FACES[st.face].vmetrics(st.size, st.lh)
                top = min(top, st.shift - fa)
                bot = max(bot, st.shift + fd)
        self.ascent = -top
        self.height = bot - top
        self.width = max((x + w for _, _, _, x, w in frags), default=0.0)

    def draw(self, pen, x0, top):
        base = top + self.ascent
        for kind, payload, st, x, w in self.frags:
            if kind == "atom":
                payload.draw(pen, x0 + x, base)
            else:
                pen.glyphs(st, x0 + x, base + st.shift, payload)


def _break_after(prev, nxt):
    if prev == " ":
        return True
    if prev in "-/" and nxt.isalpha():
        return True
    return False


def layout_lines(items, strut, avail):
    """Greedy line breaking (Chromium-like) of parsed inline items."""
    units = []        # (kind, char, glyphs, adv, style) ; kind "c" char or "atom"
    for it in items:
        if it[0] == "t":
            text, st = it[1], it[2]
            for ch, gl, adv, cst in shape_run(text, st):
                units.append(("c", ch, gl, adv, cst))
        else:
            units.append(("atom", None, build_frac(it), None, it[3]))
    lines, start, n = [], 0, len(units)
    while start < n:
        width, last_break, i = 0.0, None, start
        while i < n:
            u = units[i]
            w = u[2].w if u[0] == "atom" else u[3]
            ch = u[1]
            if ch == "\n":
                last_break = i + 1
                break
            trailing = ch == " "
            if not trailing and width + w > avail + 1e-6 and last_break is not None:
                break
            width += w
            nxt = units[i + 1][1] if i + 1 < n and units[i + 1][0] == "c" else "x"
            if u[0] == "c" and _break_after(ch, nxt or "x"):
                last_break = i + 1
            i += 1
        else:
            last_break = n
        end = last_break if i < n else n
        if end <= start:
            end = i + 1 if i < n else n
        lines.append(_make_line(units[start:end], strut))
        start = end
    if not lines:
        lines.append(_make_line([], strut))
    return lines


def _make_line(units, strut):
    while units and units[-1][0] == "c" and units[-1][1] in " \n":
        units = units[:-1]
    frags, x, cur = [], 0.0, None
    for u in units:
        if u[0] == "atom":
            frags.append(("atom", u[2], u[4], x, u[2].w))
            x += u[2].w
            cur = None
            continue
        st = u[4]
        if cur is None or cur[2] is not st:
            cur = ["g", [], st, x, 0.0]
            frags.append(cur)
        cur[1].extend(u[2])
        cur[4] += u[3]
        x += u[3]
    return Line([tuple(f) for f in frags], strut)


def text_block(text, strut, ctx, avail):
    return layout_lines(parse_inline(text, strut, ctx), strut, avail)


def text_width(text, strut, ctx):
    return sum(ln.width for ln in text_block(text, strut, ctx, 1e9))


def min_word_width(text, strut, ctx):
    lines = text_block(text, strut, ctx, 0.01)
    return max((ln.width for ln in lines), default=0.0)


# ============================================================================= drawing
class Pen:
    """Draws in CSS px (y down) on a reportlab canvas page."""

    def __init__(self, c, theme, page_h_px):
        self.c, self.theme, self.h = c, theme, page_h_px

    def _fill(self, color):
        self.c.setFillColorRGB(*hex2rgb(color))

    def rect(self, x, y, w, h, color, snap_edges=True):
        if snap_edges:
            x0, y0, x1, y1 = snap(x), snap(y), snap(x + w), snap(y + h)
        else:
            x0, y0, x1, y1 = x, y, x + w, y + h
        if x1 <= x0 or y1 <= y0:
            return
        self._fill(color)
        self.c.rect(x0, y0, x1 - x0, y1 - y0, stroke=0, fill=1)

    def path_rrect(self, x0, y0, x1, y1, radii):
        """radii: (rx, ry) for tl, tr, br, bl."""
        k = 0.5522847498
        p = self.c.beginPath()
        (tlx, tly), (trx, try_), (brx, bry), (blx, bly) = radii
        p.moveTo(x0 + tlx, y0)
        p.lineTo(x1 - trx, y0)
        if trx or try_:
            p.curveTo(x1 - trx + k * trx, y0, x1, y0 + try_ - k * try_, x1, y0 + try_)
        p.lineTo(x1, y1 - bry)
        if brx or bry:
            p.curveTo(x1, y1 - bry + k * bry, x1 - brx + k * brx, y1, x1 - brx, y1)
        p.lineTo(x0 + blx, y1)
        if blx or bly:
            p.curveTo(x0 + blx - k * blx, y1, x0, y1 - bly + k * bly, x0, y1 - bly)
        p.lineTo(x0, y0 + tly)
        if tlx or tly:
            p.curveTo(x0, y0 + tly - k * tly, x0 + tlx - k * tlx, y0, x0 + tlx, y0)
        p.close()
        return p

    def rrect(self, x0, y0, x1, y1, r, color):
        self._fill(color)
        self.c.drawPath(self.path_rrect(x0, y0, x1, y1, [(r, r)] * 4), stroke=0, fill=1)

    def glyphs(self, st, x, base, glyphs):
        """One text run with exact glyph positions (TJ adjustments)."""
        if not glyphs:
            return
        face = FACES[st.face]
        font = face.rl
        size = st.size          # drawn at the real size; advances (g.adv) use qsize()
        doc = self.c._doc
        self._fill(st.color)
        code = [f"BT 1 0 0 -1 {x:.4f} {snap(base) if not st.shift else base:.4f} Tm"]
        cur_sub, arr = None, []
        pending = 0.0
        for g in glyphs:
            parts = font.splitString(chr(g.cp), doc)
            sub, b = parts[0]
            if sub != cur_sub:
                if arr:
                    code.append("[" + " ".join(arr) + "] TJ")
                    arr = []
                code.append(f"{font.getSubsetInternalName(sub, doc)} {size:.6g} Tf")
                cur_sub = sub
            if abs(pending) > 1e-4:
                arr.append(f"{pending:.3f}")
            arr.append("(" + _pdf_escape(b) + ")")
            natural = font.face.getCharWidth(g.cp) * size / 1000.0
            pending = (natural - g.adv) * 1000.0 / size
        if arr:
            code.append("[" + " ".join(arr) + "] TJ")
        code.append("ET")
        self.c._code.append(" ".join(code))

    def plain(self, face_key, size, color, x, base, text, ls=0.0, align="left"):
        units = shape_run(text, Style(face_key, size, color, ls=ls))
        w = sum(u[2] for u in units)
        if align == "right":
            x = x - w
        i = 0
        while i < len(units):                 # one text run per font
            j = i
            while j < len(units) and units[j][3] is units[i][3]:
                j += 1
            self.glyphs(units[i][3], x, base, [g for u in units[i:j] for g in u[1]])
            x += sum(u[2] for u in units[i:j])
            i = j
        return w


def _pdf_escape(b):
    out = []
    for ch in b:
        if ch in (0x28, 0x29, 0x5C):
            out.append("\\" + chr(ch))
        elif 32 <= ch < 127:
            out.append(chr(ch))
        else:
            out.append("\\%03o" % ch)
    return "".join(out)


# ============================================================================= blocks
class Block:
    kind = "?"

    def height(self):
        raise NotImplementedError

    def draw(self, pen, x, y):
        raise NotImplementedError


def lines_height(lines):
    return sum(ln.height for ln in lines)


def draw_lines(pen, lines, x, y):
    for ln in lines:
        ln.draw(pen, x, y)
        y += ln.height
    return y


class Para(Block):
    kind = "p"

    def __init__(self, text, ctx, theme, width):
        self.strut = Style("sans", P_STYLE["size"], theme["ink"], lh_ratio=P_STYLE["lh"])
        self.lines = text_block(text, self.strut, ctx, width)

    def height(self):
        return lines_height(self.lines)

    def draw(self, pen, x, y):
        draw_lines(pen, self.lines, x, y)


class BulletList(Block):
    kind = "list"

    def __init__(self, items, ctx, theme, width):
        self.strut = Style("sans", LIST_STYLE["size"], theme["ink"], lh_ratio=LIST_STYLE["lh"])
        self.items = [text_block(t, self.strut, ctx, width - LIST_STYLE["indent"]) for t in items]
        self.theme = theme

    def height(self):
        return sum(lines_height(it) for it in self.items) + LIST_STYLE["item_gap"] * len(self.items)

    def draw(self, pen, x, y):
        for lines in self.items:
            base = y + lines[0].ascent
            bx = x + LIST_STYLE["bullet_dx"]
            by = snap(base) - 4
            pen._fill(self.theme["bullet"])
            pen.c.circle(bx + 1.5, by + 1.5, 1.5, stroke=0, fill=1)
            y = draw_lines(pen, lines, x + LIST_STYLE["indent"], y) + LIST_STYLE["item_gap"]


class Cards(Block):
    kind = "cards"

    def __init__(self, items, ctx, theme, width, columns=None):
        self.theme = theme
        self.cols = columns or min(len(items), 4)
        self.cw = (width - CARD["gap"] * (self.cols - 1)) / self.cols
        self.cells = []
        for it in items:
            tone = it.get("tone", "n")
            cctx = Ctx(theme, tone)
            tstyle = Style("mono-bold", CARD["title_size"], theme["tones"][tone]["text"], lh_ratio=1.3)
            bstyle = Style("sans", CARD["size"], theme["ink"], lh_px=CARD["lh_px"])
            tl = text_block(it.get("title", ""), tstyle, cctx, self.cw - 2 * CARD["pad_x"])
            bl = text_block(it.get("text", ""), bstyle, cctx, self.cw - 2 * CARD["pad_x"]) if it.get("text") else []
            self.cells.append((tone, tl, bl))
        self.rows = [self.cells[i:i + self.cols] for i in range(0, len(self.cells), self.cols)]

    def _cell_h(self, cell):
        _, tl, bl = cell
        th = CARD["title_box"] + (len(tl) - 1) * tl[0].height if tl else 0
        return CARD["pad_top"] + th + lines_height(bl) + CARD["pad_bottom"]

    def height(self):
        return sum(max(self._cell_h(c) for c in row) for row in self.rows) + CARD["gap"] * (len(self.rows) - 1)

    def draw(self, pen, x, y):
        for row in self.rows:
            h = max(self._cell_h(c) for c in row)
            for i, (tone, tl, bl) in enumerate(row):
                cx = x + i * (self.cw + CARD["gap"])
                pen.rrect(snap(cx), snap(y), snap(cx + self.cw), snap(y + h), CARD["radius"],
                          self.theme["tones"][tone]["tint"])
                ty = y + CARD["pad_top"]
                for ln in tl:
                    ln.draw(pen, cx + CARD["pad_x"], ty)
                    ty += ln.height
                ty = y + CARD["pad_top"] + CARD["title_box"] + (len(tl) - 1) * (tl[0].height if tl else 0)
                draw_lines(pen, bl, cx + CARD["pad_x"], ty)
            y += h + CARD["gap"]


class Split(Block):
    kind = "split"

    def __init__(self, items, ctx, theme, width):
        self.theme = theme
        self.hw = (INNER_W - 1) / 2
        self.halves = []
        for it in items[:2]:
            tone = it.get("tone", "n")
            cctx = Ctx(theme, tone)
            tstyle = Style("mono-bold", SPLIT["title_size"], theme["tones"][tone]["text"], lh_ratio=1.3)
            bstyle = Style("sans", SPLIT["size"], theme["ink"], lh_ratio=SPLIT["lh"])
            avail = self.hw - 2 * SPLIT["pad_x"]
            tl = text_block(it.get("title", ""), tstyle, cctx, avail)
            bl = text_block(it.get("text", ""), bstyle, cctx, avail)
            self.halves.append((tone, tl, bl))

    def _h(self, half):
        _, tl, bl = half
        th = SPLIT["title_box"] + (len(tl) - 1) * tl[0].height if tl else 0
        return SPLIT["pad_top"] + th + lines_height(bl) + SPLIT["pad_bottom"]

    def height(self):
        return max(self._h(h) for h in self.halves)

    def draw(self, pen, x, y):
        h = self.height()
        for i, (tone, tl, bl) in enumerate(self.halves):
            hx = x + i * (self.hw + 1)
            pen.rect(hx, y, self.hw + (1 if i == 0 else 0), h, self.theme["tones"][tone]["tint"])
            if i == 0:
                pen.rect(hx + self.hw, y, 1, h, self.theme["sheet_bg"])
            ty = y + SPLIT["pad_top"]
            for ln in tl:
                ln.draw(pen, hx + SPLIT["pad_x"], ty)
                ty += ln.height
            ty = y + SPLIT["pad_top"] + SPLIT["title_box"] + (len(tl) - 1) * (tl[0].height if tl else 0)
            draw_lines(pen, bl, hx + SPLIT["pad_x"], ty)


class Table(Block):
    kind = "table"

    def __init__(self, head, rows, ctx, theme, widths=None):
        self.theme = theme
        hst = Style("mono-bold", TABLE["head_size"], theme["table_head_text"], ls=TABLE["head_ls"],
                    lh_ratio=TABLE["head_lh"])
        lab = Style("sans-semi", TABLE["size"], theme["ink"], lh_ratio=TABLE["lh"])
        cell = Style("sans", TABLE["size"], theme["ink"], lh_ratio=TABLE["lh"])
        ncol = max([len(head)] + [len(r) for r in rows])
        head = list(head) + [""] * (ncol - len(head))
        rows = [list(r) + [""] * (ncol - len(r)) for r in rows]
        px = TABLE["pad_x"]

        def st(j):
            return lab if j == 0 else cell

        if widths:
            tot = sum(widths)
            cw = [INNER_W * w / tot for w in widths]
        else:
            mins, maxs = [], []
            for j in range(ncol):
                cells = [(head[j], hst)] + [(r[j], st(j)) for r in rows]
                mins.append(max(min_word_width(t, s, ctx) for t, s in cells if t) + 2 * px if any(t for t, _ in cells) else 2 * px)
                maxs.append(max((text_width(t, s, ctx) for t, s in cells if t), default=0) + 2 * px)
            cw = auto_table_widths(mins, maxs, INNER_W)
        self.cw = cw
        self.head = [text_block(t, hst, ctx, cw[j] - 2 * px) for j, t in enumerate(head)]
        self.rows = [[text_block(t, st(j), ctx, cw[j] - 2 * px) for j, t in enumerate(r)] for r in rows]
        self.head_h = max(lines_height(c) for c in self.head) + 2 * TABLE["pad_y"]
        self.row_h = [max(lines_height(c) for c in r) + 2 * TABLE["pad_y"] for r in self.rows]

    def height(self):
        return self.head_h + sum(self.row_h) + max(0, len(self.row_h) - 1)

    def draw(self, pen, x, y):
        th = self.theme
        xs = [x]
        for w in self.cw:
            xs.append(xs[-1] + w)
        for j in range(len(self.cw)):
            pen.rect(xs[j], y, xs[j + 1] - xs[j], self.head_h, th["table_head_bg"])
        for j, c in enumerate(self.head):
            draw_lines(pen, c, xs[j] + TABLE["pad_x"], y + TABLE["pad_y"])
        ry = y + self.head_h
        for i, (r, h) in enumerate(zip(self.rows, self.row_h)):
            if i > 0:
                for j in range(len(self.cw)):
                    pen.rect(xs[j], ry, xs[j + 1] - xs[j], 1, th["rule"])
                ry += 1
            pen.rect(xs[0], ry - (1 if i > 0 else 0), xs[1] - xs[0], h + (1 if i > 0 else 0), th["table_label_bg"])
            if i > 0:
                pen.rect(xs[0], ry - 1, xs[1] - xs[0], 1, th["rule"])
            for j, c in enumerate(r):
                draw_lines(pen, c, xs[j] + TABLE["pad_x"], ry + TABLE["pad_y"])
            ry += h


def auto_table_widths(mins, maxs, avail):
    smax, smin = sum(maxs), sum(mins)
    if smax <= avail:
        return [m + (avail - smax) * m / smax for m in maxs]
    if smin >= avail:
        return [m * avail / smin for m in mins]
    span = sum(M - m for m, M in zip(mins, maxs)) or 1
    return [m + (avail - smin) * (M - m) / span for m, M in zip(mins, maxs)]


class Boxed(Block):
    """Formula and note boxes: tinted, 3 px stripe on the left."""

    def __init__(self, kind, lines, bg, stripe, pad_top, pad_bottom, pad_x):
        self.kind, self.lines, self.bg, self.stripe = kind, lines, bg, stripe
        self.pt, self.pb, self.px = pad_top, pad_bottom, pad_x

    def height(self):
        return self.pt + lines_height(self.lines) + self.pb

    def draw(self, pen, x, y):
        h = self.height()
        pen.rect(x, y, BODY_W, h, self.bg)
        pen.rect(x, y, SEC_STRIPE, h, self.stripe)
        draw_lines(pen, self.lines, x + SEC_STRIPE + self.px, y + self.pt)


def make_formula(lines, theme, width):
    ctx = Ctx(theme, "a", mono=True)
    strut = Style("mono", FORMULA["size"], theme["ink"], lh_ratio=FORMULA["lh"])
    avail = width - SEC_STRIPE - 2 * FORMULA["pad_x"]
    out = []
    for t in lines:
        out.extend(text_block(t, strut, ctx, avail))
    return Boxed("formula", out, theme["formula_bg"], theme["formula_rule"],
                 FORMULA["pad_y"], FORMULA["pad_y"], FORMULA["pad_x"])


def make_note(label, text, tone, theme, width):
    ctx = Ctx(theme, tone)
    strut = Style("sans", NOTE["size"], theme["ink"], lh_ratio=NOTE["lh"])
    tc = theme["tones"][tone]
    src = (("{%s|**%s**} — " % (tc["text"], label)) if label else "") + text
    lines = text_block(src, strut, ctx, width - SEC_STRIPE - 2 * NOTE["pad_x"])
    return Boxed("note", lines, tc["tint"], tc["stripe"], NOTE["pad_top"], NOTE["pad_bottom"], NOTE["pad_x"])


def make_block(b, ctx, theme):
    t = b.get("type", "p")
    if t == "p":
        return Para(b["text"], ctx, theme, BODY_W)
    if t == "list":
        return BulletList(b["items"], ctx, theme, BODY_W)
    if t == "cards":
        return Cards(b["items"], ctx, theme, BODY_W, b.get("columns"))
    if t == "split":
        return Split(b["items"], ctx, theme, INNER_W)
    if t == "table":
        return Table(b.get("head", []), b.get("rows", []), ctx, theme, b.get("widths"))
    if t == "formula":
        return make_formula(b["lines"], theme, BODY_W)
    if t == "note":
        return make_note(b.get("label", ""), b.get("text", ""), b.get("tone", "c"), theme, BODY_W)
    raise ValueError(f"unknown block type {t!r}")


FLUSH = {"table", "split"}     # full-bleed blocks: drawn from the inner edge of the section


class Section:
    def __init__(self, spec, theme):
        self.theme = theme
        self.tone = spec.get("tone", theme["default_tone"])
        self.title = spec["title"]
        ctx = Ctx(theme, self.tone)
        self.blocks = [make_block(b, ctx, theme) for b in spec.get("blocks", [])]
        y = SEC_BORDER + BAND_H
        self.layout = []
        prev = None
        for b in self.blocks:
            y += FIRST.get(b.kind, 8.0) if prev is None else GAP.get((prev.kind, b.kind), GAP_DEFAULT)
            self.layout.append((b, y))
            y += b.height()
            prev = b
        y += LAST.get(prev.kind, 9.0) if prev else 0.0
        self.h = y + SEC_BORDER

    def draw(self, pen, x0, y0):
        th = self.theme
        tone = th["tones"][self.tone]
        X0, Y0, X1, Y1 = snap(x0), snap(y0), snap(x0 + COL_W), snap(y0 + self.h)
        c = pen.c
        # white padding box, then the borders (1 px, left stripe 3 px), as Chromium paints them
        pen._fill(th["sheet_bg"])
        c.drawPath(pen.path_rrect(X0 + 1.5, Y0 + 0.5, X1 - 0.5, Y1 - 0.5, [(3.5, 3.5)] * 4), stroke=0, fill=1)
        outer = pen.path_rrect(X0, Y0, X1, Y1, [(SEC_RADIUS, SEC_RADIUS)] * 4)
        inner = pen.path_rrect(X0 + SEC_STRIPE, Y0 + SEC_BORDER, X1 - SEC_BORDER, Y1 - SEC_BORDER,
                               [(SEC_RADIUS - SEC_STRIPE, SEC_RADIUS - SEC_BORDER),
                                (SEC_RADIUS - SEC_BORDER, SEC_RADIUS - SEC_BORDER),
                                (SEC_RADIUS - SEC_BORDER, SEC_RADIUS - SEC_BORDER),
                                (SEC_RADIUS - SEC_STRIPE, SEC_RADIUS - SEC_BORDER)])
        _ring(pen, outer, inner, th["rule"])
        c.saveState()
        cp = pen.path_rrect(X0, Y0, X0 + 4.7109, Y1, [(SEC_RADIUS, SEC_RADIUS), (0, 0), (0, 0), (SEC_RADIUS, SEC_RADIUS)])
        c.clipPath(cp, stroke=0, fill=0)
        _ring(pen, outer, inner, tone["stripe"])
        c.restoreState()
        # header band + its rule, clipped to the rounded padding box
        c.saveState()
        c.clipPath(inner, stroke=0, fill=0)
        pen.rect(X0 + SEC_STRIPE, Y0 + SEC_BORDER, X1 - X0 - SEC_STRIPE - SEC_BORDER, BAND_H, tone["tint"])
        pen.rect(X0 + SEC_STRIPE, Y0 + SEC_BORDER + BAND_H - 1, X1 - X0 - SEC_STRIPE - SEC_BORDER, 1, th["rule"])
        c.restoreState()
        pen.plain("mono-bold", LABEL["size"], tone["text"], x0 + LABEL["dx"], y0 + LABEL["dy"],
                  self.title, ls=LABEL["ls"])
        c.saveState()
        c.clipPath(inner, stroke=0, fill=0)
        for b, by in self.layout:
            if b.kind in FLUSH:
                b.draw(pen, x0 + SEC_STRIPE, y0 + by)
            else:
                b.draw(pen, x0 + BODY_DX, y0 + by)
        c.restoreState()


def _append_path(dst, src):
    # a reportlab path starts with "n" (end path): drop it, or it would discard what dst holds
    dst._code.extend(op for op in src._code if op.strip() != "n")


def _ring(pen, outer, inner, color):
    c = pen.c
    p = c.beginPath()
    _append_path(p, outer)
    _append_path(p, inner)
    pen._fill(color)
    c.drawPath(p, stroke=0, fill=1, fillMode=0)       # reportlab: 0 = even-odd (a ring)


# ============================================================================= pages
class Page:
    def __init__(self, spec, theme, index, count):
        self.spec, self.theme = spec, theme
        self.cols = []
        for side in ("left", "right"):
            secs = [Section(s, theme) for s in spec.get(side, [])]
            self.cols.append(secs)
        bottoms = []
        for secs in self.cols:
            y = COL_TOP
            for s in secs:
                y += s.h + SECTION_GAP
            bottoms.append(y - SECTION_GAP if secs else COL_TOP)
        self.content_bottom = max(bottoms)
        self.tag = spec.get("tag", f"Vault Concept Sheet — {index}/{count}")
        self.index = index

    def natural_height(self):
        return snap(self.content_bottom) + FOOTER_GAP + FOOTER_BELOW


def build(doc, out_path, theme):
    specs = doc["pages"]
    pages = [Page(p, theme, i + 1, len(specs)) for i, p in enumerate(specs)]
    hmode = doc.get("height", "auto")
    if hmode == "uniform":
        fixed = max(p.natural_height() for p in pages)
    elif isinstance(hmode, (int, float)):
        fixed = hmode / PX
    else:
        fixed = None
    footer_at = doc.get("footer_at", "content")
    c = rl_canvas.Canvas(out_path, pageCompression=1)
    c.setTitle(f"{doc.get('subject', '')} — Vault Concept Sheet")
    c.setAuthor(doc.get("author", "Théo"))
    for p in pages:
        h = fixed if fixed is not None else p.natural_height()
        if fixed is not None and p.natural_height() > fixed + 0.5:
            print(f"warning: page {p.index} content ({p.natural_height():.0f} px) taller than the page ({fixed:.0f} px)")
        if h * PX > MAX_H_PT + 0.5:
            print(f"warning: page {p.index} is {h * PX:.0f} pt tall (existing sheets: {MAX_H_PT} pt at most)"
                  " -> move a section to another page")
        draw_page(c, p, h, theme, doc, footer_at)
        c.showPage()
    c.save()
    print(f"wrote {out_path}: {len(pages)} pages, heights (pt): "
          + ", ".join(f"{(fixed if fixed is not None else p.natural_height()) * PX:.2f}" for p in pages))


def draw_page(c, p, h, theme, doc, footer_at):
    c.setPageSize((MEDIA_W_PT, h * PX))
    c.translate(0, h * PX)
    c.scale(PX, -PX)
    pen = Pen(c, theme, h)
    pen.rect(0, 0, PAGE_W, h, theme["page_bg"], snap_edges=False)
    pen.rect(SHEET_X0, 0, SHEET_X1 - SHEET_X0, h - SHEET_BOTTOM_GAP, theme["sheet_bg"])
    # header
    pen.rect(SHEET_X0, 0, SHEET_X1 - SHEET_X0, HEADER_H, theme["header_bg"])
    pen.rect(SHEET_X0, HEADER_H - HEADER_RULE_H, SHEET_X1 - SHEET_X0, HEADER_RULE_H, theme["header_rule"])
    pen.plain("mono", KICKER["size"], theme["kicker"], KICKER["x"], KICKER["base"],
              p.spec.get("kicker", doc.get("kicker", "")), ls=KICKER["ls"])
    pen.plain("serif-bold", TITLE["size"], theme["title"], TITLE["x"], TITLE["base"], p.spec.get("title", ""))
    pen.plain("mono", TAG["size"], theme["tag"], TAG["right"], TAG["base"], p.tag, align="right")
    # columns
    for x, secs in zip(COL_X, p.cols):
        y = COL_TOP
        for s in secs:
            s.draw(pen, x, y)
            y += s.h + SECTION_GAP
    # footer
    fy = (h - FOOTER_BELOW) if footer_at == "bottom" else snap(p.content_bottom) + FOOTER_GAP
    pen.rect(SHEET_X0, fy, SHEET_X1 - SHEET_X0, 1, theme["rule"])
    pen.plain("mono", FOOTER["size"], theme["footer"], FOOTER["x"], fy + FOOTER_TEXT_DY, doc.get("footer", ""))
    right = doc.get("footer_right", theme["footer_right"])
    rtext = str(p.index) if right == "page" else (doc.get("subject", "") if right == "subject" else right)
    pen.plain("mono", FOOTER["size"], theme["footer"], FOOTER["right"], fy + FOOTER_TEXT_DY, rtext, align="right")


def resolve_theme(spec):
    if isinstance(spec, str):
        spec = {"preset": spec}
    name = spec.get("preset", "alternatives")
    if name not in THEMES:
        sys.exit(f"unknown theme {name!r} (presets: {', '.join(sorted(THEMES))})")
    base = dict(THEME_DEFAULTS, **json.loads(json.dumps(THEMES[name])))
    for k, v in spec.items():
        if k == "preset":
            continue
        if k == "tones":
            for t, vals in v.items():
                base["tones"].setdefault(t, {}).update(vals)
        else:
            base[k] = v
    return base


def main(argv):
    args = list(argv[1:])
    fonts_dir = None
    if "--fonts-dir" in args:
        i = args.index("--fonts-dir")
        fonts_dir = args[i + 1]
        del args[i:i + 2]
    if len(args) != 2:
        sys.exit(__doc__)
    with open(args[0], encoding="utf-8") as f:
        doc = json.load(f)
    theme = resolve_theme(doc.get("theme", "alternatives"))
    load_fonts(fonts_dir, theme["body_font"])
    build(doc, args[1], theme)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv)
