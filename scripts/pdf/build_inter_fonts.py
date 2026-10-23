"""Build the three static Inter fonts used by build_synthese.py
(scripts/pdf/fonts/Inter-{Regular,SemiBold,Bold}.ttf).

The concept sheets were printed by Chromium with the Google Fonts Inter 4
variable font (axes opsz 14-32, wght 100-900). Every body text there is
<= 14 px, so Chromium's automatic optical sizing pins opsz at 14: the glyphs
are the instances (opsz 14, wght 400 / 600 / 700).

Source: any Inter 4.000 variable font file, e.g. the copy Blender ships
(<Blender>/datafiles/fonts/Inter.woff2). Blender's build re-points a few
code points to alternates (tabular figures, serifed I, tailed l); they are put
back on Inter's default glyphs here, which then match, outline for outline
and advance for advance, the glyphs embedded in the Alternative Investments /
Corporate Issuers / Economics sheets (checked against their Type3 fonts).

The output is subset to Latin / Greek / punctuation / arrows / math, keeps
GPOS kerning and the glyph names, and gives every ".case" glyph (Inter's
raised punctuation used next to capitals and figures) a private code point
U+F000+n so reportlab can draw it; build_synthese.py finds them by name.

WOFF2 needs Brotli: if the Python `brotli` module is missing, Node's zlib is
used instead (node must be on PATH).

Usage:
    python -I scripts/pdf/build_inter_fonts.py <Inter variable .woff2/.ttf> <out_dir>
Inter is under the SIL Open Font License 1.1 (fonts/OFL-Inter.txt).
"""
import os
import subprocess
import sys
import types

WEIGHTS = {"Regular": 400, "SemiBold": 600, "Bold": 700}
PUA_CASE = 0xF000
BLENDER_SUFFIXES = {"tf", "1", "ss01", "ss02"}

UNICODES = (
    list(range(0x20, 0x7F)) + list(range(0xA0, 0x180))          # Basic Latin, Latin-1, Latin Ext-A
    + list(range(0x370, 0x400))                                   # Greek
    + list(range(0x2000, 0x2070)) + list(range(0x2070, 0x20A0))   # punctuation, super/subscripts
    + list(range(0x20A0, 0x20C0)) + list(range(0x2100, 0x2150))   # currency, letterlike
    + list(range(0x2190, 0x2200)) + list(range(0x2200, 0x2300))   # arrows, math operators
    + list(range(0x25A0, 0x2600)) + [0x2713, 0x2714, 0x2717, 0x2718]  # shapes, check marks
)


def _brotli_via_node():
    js = ("const z=require('zlib');const c=[];process.stdin.on('data',d=>c.push(d));"
          "process.stdin.on('end',()=>process.stdout.write(z.brotliDecompressSync(Buffer.concat(c))));")
    mod = types.ModuleType("brotli")
    mod.decompress = lambda data: subprocess.run(["node", "-e", js], input=bytes(data),
                                                 capture_output=True, check=True).stdout
    sys.modules["brotli"] = mod


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, out_dir = sys.argv[1], sys.argv[2]
    try:
        import brotli  # noqa: F401
    except ImportError:
        _brotli_via_node()
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    from fontTools import subset

    os.makedirs(out_dir, exist_ok=True)
    for wname, wval in WEIGHTS.items():
        vf = TTFont(src)
        vf.flavor = None
        font = instancer.instantiateVariableFont(vf, {"wght": wval, "opsz": 14})
        order = set(font.getGlyphOrder())
        # put the default glyph back where Blender's build points to an alternate
        # (".tf" tabular figures, ".1" serifed I / flat 3, ".ss01" open 4 6 9, ".ss02" tailed l)
        for table in font["cmap"].tables:
            if not table.isUnicode():
                continue
            for cp, gn in list(table.cmap.items()):
                parts = gn.split(".")
                base = ".".join([parts[0]] + [p for p in parts[1:] if p not in BLENDER_SUFFIXES])
                if base != gn and base in order:
                    table.cmap[cp] = base
        opts = subset.Options()
        opts.layout_features = ["kern", "calt", "case", "ccmp", "locl", "mark", "mkmk"]
        opts.glyph_names = True
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        opts.hinting = False
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=UNICODES)
        sub.subset(font)
        # every glyph only reachable through GSUB (".case" forms, ligatures...) gets a
        # private code point, so that reportlab (which draws by code point) can draw it
        mapped = set(font.getBestCmap().values())
        extra = [g for g in font.getGlyphOrder() if g not in mapped and g != ".notdef"]
        case = [g for g in extra if g.endswith(".case")]
        for table in font["cmap"].tables:
            if table.isUnicode() and table.format in (4, 12):
                for i, g in enumerate(extra):
                    table.cmap[PUA_CASE + i] = g
        name = font["name"]
        for rec in list(name.names):
            if rec.nameID in (1, 16):
                rec.string = "Inter Vault"
            elif rec.nameID in (2, 17):
                rec.string = wname
            elif rec.nameID == 4:
                rec.string = f"Inter Vault {wname}"
            elif rec.nameID == 6:
                rec.string = f"InterVault-{wname}"
        font["OS/2"].usWeightClass = wval
        out = os.path.join(out_dir, f"Inter-{wname}.ttf")
        font.save(out)
        print(f"{out}: {len(font.getGlyphOrder())} glyphs, {len(case)} .case forms, "
              f"{os.path.getsize(out) // 1024} KB")


if __name__ == "__main__":
    main()
