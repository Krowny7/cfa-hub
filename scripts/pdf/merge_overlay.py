import pypdf, sys
base_path, overlay_path, page_idx, out_path = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
base = pypdf.PdfReader(base_path)
overlay = pypdf.PdfReader(overlay_path)
writer = pypdf.PdfWriter()
for i, page in enumerate(base.pages):
    if i == page_idx:
        page.merge_page(overlay.pages[0])
    writer.add_page(page)
with open(out_path, "wb") as f:
    writer.write(f)
print("merged ->", out_path)
