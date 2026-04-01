"""
Chipie Miam — Scraper images (avec rendu JavaScript via Playwright)
URL  : https://margueritecie.org/2016/09/12/liste-de-verdure-pour-les-lapins/
Usage: py scraper_margueritecie.py
Sortie : liste_images.txt
"""

import re
from playwright.sync_api import sync_playwright

URL = "https://margueritecie.org/2016/09/12/liste-de-verdure-pour-les-lapins/"
OUTPUT_FILE = "liste_images.txt"

def extraire_nom_depuis_url(src):
    """
    Extrait le nom du végétal depuis le nom de fichier.
    Ex: .../Cerfeuil-b5572.jpg  →  Cerfeuil
        .../Fanes-de-carottes-a1234.jpg  →  Fanes de carottes
    """
    # Récupérer le nom de fichier sans extension
    nom_fichier = src.split("/")[-1]
    nom_sans_ext = re.sub(r"\.[a-zA-Z]+$", "", nom_fichier)
    # Supprimer le suffixe hash (-b5572, -a1234, etc.)
    nom_sans_hash = re.sub(r"-[a-f0-9]{4,6}$", "", nom_sans_ext)
    # Remplacer les tirets par des espaces
    nom = nom_sans_hash.replace("-", " ").strip()
    return nom if nom else None

def url_absolue(src):
    if src.startswith("//"):
        return "https:" + src
    if src.startswith("/"):
        return "https://margueritecie.org" + src
    return src

def main():
    print("🔍 Ouverture du navigateur headless…")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("🌐 Chargement de la page…")
        page.goto(URL, wait_until="networkidle", timeout=30000)

        # Cibler uniquement les images du cache SPIP (cache-vignettes)
        images = page.query_selector_all("img[src*='cache-vignettes']")

        print(f"   {len(images)} images cache-vignettes détectées")

        resultats = []
        vus = set()

        for img in images:
            src = img.get_attribute("src") or ""
            if not src:
                continue

            src = url_absolue(src)
            nom = extraire_nom_depuis_url(src)

            if not nom:
                continue

            if src in vus:
                continue
            vus.add(src)

            resultats.append((nom, src))

        browser.close()

    if not resultats:
        print("❌ Aucune image trouvée.")
        return

    lignes = []
    for nom, src in resultats:
        ligne = f"- {nom}: {src}"
        print(ligne)
        lignes.append(ligne)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(f"# Images végétaux — {URL}\n")
        f.write(f"# {len(resultats)} images trouvées\n\n")
        f.write("\n".join(lignes))

    print(f"\n✅ {len(resultats)} images → {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
