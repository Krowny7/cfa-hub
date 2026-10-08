"""Extrait le texte de la banque de practice exams (un PDF de questions et un
PDF « - Answers » par reading) dans un dossier de fichiers texte, un par
reading : R59.txt, R91.3.txt... Le rattachement des questions aux notions
(scripts/notions/rattacher.mjs) cherche ensuite chaque énoncé dans ces textes.

Les chemins sont passés en arguments (jamais de chemin local dans le dépôt) :
    python -I scripts/notions/extraire_banque.py <dossier de la banque> <dossier de sortie>

Le dossier de la banque contient un sous-dossier par matière, avec des
fichiers « Reading <n> <titre>.pdf » et « Reading <n> <titre> - Answers.pdf ».
Les fichiers sans numéro de reading (« Answers FI.pdf »...) sont ignorés.
"""
import os
import re
import sys

from pypdf import PdfReader

NOM = re.compile(r"^Reading (\d+(?:\.\d+)?) (.+?)(?: - Answers)?\.pdf$", re.IGNORECASE)


def texte(chemin):
    try:
        return "\n".join((p.extract_text() or "") for p in PdfReader(chemin).pages)
    except Exception as e:  # PDF abîmé : on le signale, le reading restera sans texte
        print(f"  illisible : {os.path.basename(chemin)} ({e})", file=sys.stderr)
        return ""


def main():
    if len(sys.argv) != 3:
        sys.exit("usage : python -I extraire_banque.py <dossier de la banque> <dossier de sortie>")
    banque, sortie = sys.argv[1], sys.argv[2]
    os.makedirs(sortie, exist_ok=True)
    par_reading = {}
    titres = {}
    for racine, _, fichiers in os.walk(banque):
        for f in sorted(fichiers):
            m = NOM.match(f)
            if not m:
                continue
            r = m.group(1)
            if not f.lower().endswith(" - answers.pdf"):
                titres[r] = m.group(2)
            par_reading.setdefault(r, []).append(texte(os.path.join(racine, f)))
    for r, morceaux in par_reading.items():
        with open(os.path.join(sortie, f"R{r}.txt"), "w", encoding="utf-8") as out:
            out.write(f"# {titres.get(r, '')}\n")
            out.write("\n".join(morceaux))
    print(f"{len(par_reading)} readings extraits dans {sortie}")


if __name__ == "__main__":
    main()
