import pikepdf, sys, os
path = sys.argv[1]
outdir = sys.argv[2]
os.makedirs(outdir, exist_ok=True)
pdf = pikepdf.open(path)
seen = set()
for page in pdf.pages:
    if "/Resources" not in page: continue
    res = page.Resources
    if "/Font" not in res: continue
    for name, fontref in res.Font.items():
        font = fontref
        bf = str(font.get("/BaseFont", "?"))
        desc = None
        if "/DescendantFonts" in font:
            df = font.DescendantFonts[0]
            desc = df.get("/FontDescriptor")
        else:
            desc = font.get("/FontDescriptor")
        if desc is None: continue
        ff = desc.get("/FontFile2") or desc.get("/FontFile3") or desc.get("/FontFile")
        key = bf
        if ff is not None and key not in seen:
            seen.add(key)
            data = ff.read_bytes()
            safe = bf.replace("/", "_").lstrip("+")
            # strip subset tag like AAAAAA+
            if "+" in bf: safe = bf.split("+",1)[1]
            fname = os.path.join(outdir, safe + ".ttf")
            with open(fname, "wb") as f:
                f.write(data)
            print("wrote", fname, len(data), "bytes")
print("done, fonts found:", sorted(seen))
