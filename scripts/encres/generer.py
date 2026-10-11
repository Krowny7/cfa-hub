# Textures d'encre vivante par palette : public/encres/<palette>.webp (256 x 256).
# Usage : python -I scripts/encres/generer.py
#
# Source : public/ranks/v2/liquide-1.webp (l'argent des insignes, en niveaux de
# gris), rendue sans couture (raccord en mosaïque : la texture dérive en boucle
# derrière l'onglet actif), puis recolorée par une carte de dégradé : la
# luminance parcourt les couleurs de la palette, de la plus sombre à la plus
# claire. Les couleurs viennent de lib/palettes.json (source unique).
# Pas d'antislash dans ce fichier (voir le piège Tailwind du dépôt).
import json
import os
import sys

import numpy as np
from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SOURCE = os.path.join(RACINE, "public", "ranks", "v2", "liquide-1.webp")
SORTIE = os.path.join(RACINE, "public", "encres")
COTE = 256
POIDS_MAX = 40 * 1024


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=float)


def luminance(rgb):
    lin = np.where(rgb / 255 <= 0.04045, rgb / 255 / 12.92, ((rgb / 255 + 0.055) / 1.055) ** 2.4)
    return 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]


def contraste_blanc(rgb):
    return 1.05 / (luminance(rgb) + 0.05)


def poids(n):
    # 0 aux bords, 1 sur le milieu (de 28 % à 72 %), montées douces
    u = (np.arange(n) + 0.5) / n
    lisse = lambda x: x * x * (3 - 2 * x)
    return lisse(np.clip(u / 0.28, 0, 1)) * lisse(np.clip((1 - u) / 0.28, 0, 1))


def sans_couture(a):
    # Un axe après l'autre : fondu avec la même image décalée. La jointure de
    # l'image décalée tombe dans la zone où l'original pèse 1 (donc elle ne se
    # voit pas), et celle de l'original dans la zone où il pèse 0. Le décalage
    # n'est pas une demi-tuile : le fondu à mi-tuile répéterait le motif deux
    # fois. Le second passage corrige l'autre axe sans rouvrir le premier.
    h, w = a.shape
    wx, wy = poids(w)[None, :], poids(h)[:, None]
    mix = a * wx + np.roll(a, round(0.38 * w), axis=1) * (1 - wx)
    mix = mix * wy + np.roll(mix, round(0.43 * h), axis=0) * (1 - wy)
    # le fondu aplatit le contraste : on remet l'histogramme de l'original
    ordre = np.argsort(mix.ravel(), kind="stable")
    rendu = np.empty(mix.size)
    rendu[ordre] = np.sort(a.ravel())
    return rendu.reshape(a.shape)


def niveaux(a):
    bas, haut = np.percentile(a, 1), np.percentile(a, 99)
    return np.clip((a - bas) / (haut - bas), 0, 1)


def carte_de_degrade(t, couleurs):
    # couleurs : du plus sombre au plus clair, réparties à égale distance
    cs = sorted((hex_rgb(c["hex"]) for c in couleurs), key=lambda c: luminance(c))
    pos = np.linspace(0, 1, len(cs))
    return np.stack([np.interp(t, pos, [c[k] for c in cs]) for k in range(3)], axis=-1)


def ecart_raccord(img):
    a = np.asarray(img.convert("L")).astype(float)
    bord = (np.abs(a[:, 0] - a[:, -1]).mean() + np.abs(a[0, :] - a[-1, :]).mean()) / 2
    interieur = (np.abs(a[:, 1:] - a[:, :-1]).mean() + np.abs(a[1:, :] - a[:-1, :]).mean()) / 2
    return bord, interieur


def main():
    with open(os.path.join(RACINE, "lib", "palettes.json"), encoding="utf-8") as f:
        palettes = json.load(f)["palettes"]
    src = np.asarray(Image.open(SOURCE).convert("L").resize((COTE, COTE), Image.LANCZOS)).astype(float)
    t = niveaux(sans_couture(src))
    os.makedirs(SORTIE, exist_ok=True)
    for p in palettes:
        rgb = carte_de_degrade(t, p["couleurs"])
        img = Image.fromarray(np.clip(rgb + 0.5, 0, 255).astype("uint8"))
        chemin = os.path.join(SORTIE, p["key"] + ".webp")
        for q in (86, 82, 78, 74, 70, 64, 58):
            img.save(chemin, "WEBP", quality=q, method=6)
            if os.path.getsize(chemin) < POIDS_MAX:
                break
        # lisibilité du texte blanc sous le voile (haut, bas) : pire cas = 95e centile
        h, b = p["voile"]
        clair = np.percentile(luminance(rgb), 95)
        sous = lambda alpha: clair * (1 - alpha) ** 2.2
        ratio = lambda lum: 1.05 / (lum + 0.05)
        print(
            p["key"], os.path.getsize(chemin), "o · q", q,
            "· contraste du blanc au 95e centile : haut %.1f, milieu %.1f, bas %.1f" % (ratio(sous(h)), ratio(sous((h + b) / 2)), ratio(sous(b))),
        )
    bord, inte = ecart_raccord(Image.fromarray((t * 255).astype("uint8")))
    print("raccord (écart moyen au bord / à l'intérieur) : %.1f / %.1f" % (bord, inte))
    return 0


if __name__ == "__main__":
    sys.exit(main())
