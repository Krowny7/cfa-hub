import pdfplumber, json, sys
path = sys.argv[1]
page_no = int(sys.argv[2])  # 1-indexed
with pdfplumber.open(path) as pdf:
    page = pdf.pages[page_no - 1]
    out = {"width": page.width, "height": page.height, "rects": [], "lines": [], "chars_summary": {}}
    for r in page.rects:
        out["rects"].append({
            "x0": round(r["x0"],1), "y0": round(page.height - r["y1"],1), "x1": round(r["x1"],1), "y1": round(page.height - r["y0"],1),
            "fill": r.get("non_stroking_color"), "stroke": r.get("stroking_color"),
            "w": round(r["x1"]-r["x0"],1), "h": round(r["y1"]-r["y0"],1),
        })
    for l in page.lines:
        out["lines"].append({
            "x0": round(l["x0"],1), "y0": round(page.height - l["y1"],1), "x1": round(l["x1"],1), "y1": round(page.height - l["y0"],1),
            "color": l.get("non_stroking_color") or l.get("stroking_color"), "width": l.get("linewidth"),
        })
    # group chars by (font, size, color) to list distinct text styles
    styles = {}
    for c in page.chars:
        key = (c["fontname"], round(c["size"],2), c.get("non_stroking_color"))
        styles.setdefault(key, []).append(c["text"])
    for k,v in styles.items():
        out["chars_summary"][str(k)] = "".join(v)[:80]
    print(json.dumps(out, indent=1, default=str))
