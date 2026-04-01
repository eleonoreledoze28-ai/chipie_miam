"""
Chipie Miam — Téléchargement automatique des images de végétaux
Source : Wikimedia Commons API (aucune clé API requise)
Usage   : python telecharger_images_chipie.py
Résultat: dossier images/ + rapport_manquants.txt
"""

import requests
import os
import time
import re
from pathlib import Path

# ─── Configuration ────────────────────────────────────────────────────────────
OUTPUT_DIR = Path("images")
REPORT_FILE = Path("rapport_manquants.txt")
DELAY_ENTRE_REQUETES = 2.5  # secondes (respecter l'API Wikimedia)
LARGEUR_MAX_PX = 600        # résolution cible des images téléchargées

# User-Agent conforme à la politique bot de Wikimedia
USER_AGENT = (
    "ChipieMiam/1.0 "
    "(application personnelle pour lapins domestiques; "
    "contact: usage-prive@noreply.fr) "
    "python-requests/2.33"
)

# ─── Base de données des végétaux ─────────────────────────────────────────────
# Format : (nom_affichage, nom_latin_ou_alternatif, categorie, slug_fichier)
# Le slug_fichier sera utilisé comme nom de fichier image.
# On essaie d'abord le nom latin, puis le nom français si aucun résultat.

VEGETAUX = [
    # ── Aromatiques ──────────────────────────────────────────────────────────
    ("Aneth",        "Anethum graveolens",       "aromatiques",  "aneth"),
    ("Basilic",      "Ocimum basilicum",          "aromatiques",  "basilic"),
    ("Cerfeuil",     "Anthriscus cerefolium",     "aromatiques",  "cerfeuil"),
    ("Coriandre",    "Coriandrum sativum",        "aromatiques",  "coriandre"),
    ("Estragon",     "Artemisia dracunculus",     "aromatiques",  "estragon"),
    ("Marjolaine",   "Origanum majorana",         "aromatiques",  "marjolaine"),
    ("Menthe",       "Mentha",                    "aromatiques",  "menthe"),
    ("Origan",       "Origanum vulgare",          "aromatiques",  "origan"),
    ("Persil",       "Petroselinum crispum",      "aromatiques",  "persil"),
    ("Romarin",      "Salvia rosmarinus",         "aromatiques",  "romarin"),
    ("Sarriette",    "Satureja",                  "aromatiques",  "sarriette"),
    ("Serpolet",     "Thymus serpyllum",          "aromatiques",  "serpolet"),
    ("Thym",         "Thymus vulgaris",           "aromatiques",  "thym"),

    # ── Plantes potagères ────────────────────────────────────────────────────
    ("Avoine",               "Avena sativa",              "potageres", "avoine"),
    ("Blé",                  "Triticum aestivum",         "potageres", "ble"),
    ("Blettes",              "Beta vulgaris cicla",       "potageres", "blettes"),
    ("Brocoli",              "Brassica oleracea italica", "potageres", "brocoli"),
    ("Capucine",             "Tropaeolum majus",          "potageres", "capucine"),
    ("Céleri branche",       "Apium graveolens",          "potageres", "celeri_branche"),
    ("Choux",                "Brassica oleracea",         "potageres", "choux"),
    ("Cosses de petit pois", "Pisum sativum",             "potageres", "cosses_petit_pois"),
    ("Cresson",              "Nasturtium officinale",     "potageres", "cresson"),
    ("Concombre",            "Cucumis sativus",           "potageres", "concombre"),
    ("Courgette",            "Cucurbita pepo",            "potageres", "courgette"),
    ("Épinards",             "Spinacia oleracea",         "potageres", "epinards"),
    ("Fanes de betterave",   "Beta vulgaris",             "potageres", "fanes_betterave"),
    ("Fanes de carottes",    "Daucus carota",             "potageres", "fanes_carottes"),
    ("Fanes de fenouil",     "Foeniculum vulgare",        "potageres", "fanes_fenouil"),
    ("Fanes de navet",       "Brassica rapa",             "potageres", "fanes_navet"),
    ("Fanes de radis",       "Raphanus sativus",          "potageres", "fanes_radis"),
    ("Feuilles d'artichaut", "Cynara scolymus",           "potageres", "feuilles_artichaut"),
    ("Feuilles de fraisier", "Fragaria",                  "potageres", "feuilles_fraisier"),
    ("Feuilles de framboisier", "Rubus idaeus",           "potageres", "feuilles_framboisier"),
    ("Feuilles de groseillier", "Ribes",                  "potageres", "feuilles_groseillier"),
    ("Feuilles de vigne",    "Vitis vinifera",            "potageres", "feuilles_vigne"),
    ("Feuilles de tournesol","Helianthus annuus",         "potageres", "feuilles_tournesol"),
    ("Haricots verts crus",  "Phaseolus vulgaris",        "potageres", "haricots_verts"),
    ("Livèche",              "Levisticum officinale",     "potageres", "liveche"),
    ("Moutarde",             "Sinapis alba",              "potageres", "moutarde"),
    ("Pois gourmands",       "Pisum sativum saccharatum", "potageres", "pois_gourmands"),
    ("Poivron",              "Capsicum annuum",           "potageres", "poivron"),

    # ── Herbes sauvages ──────────────────────────────────────────────────────
    ("Achillée millefeuille","Achillea millefolium",      "sauvages",  "achillee"),
    ("Aigremoine",           "Agrimonia eupatoria",       "sauvages",  "aigremoine"),
    ("Benoîte commune",      "Geum urbanum",              "sauvages",  "benoite"),
    ("Bleuet",               "Centaurea cyanus",          "sauvages",  "bleuet"),
    ("Bourrache",            "Borago officinalis",        "sauvages",  "bourrache"),
    ("Bourse à pasteur",     "Capsella bursa-pastoris",   "sauvages",  "bourse_pasteur"),
    ("Buddleia de David",    "Buddleja davidii",          "sauvages",  "buddleia"),
    ("Buglosse",             "Pentaglottis sempervirens", "sauvages",  "buglosse"),
    ("Camomille",            "Chamaemelum nobile",        "sauvages",  "camomille"),
    ("Chicorée sauvage",     "Cichorium intybus",         "sauvages",  "chicoree_sauvage"),
    ("Consoude",             "Symphytum officinale",      "sauvages",  "consoude"),
    ("Échinacée",            "Echinacea purpurea",        "sauvages",  "echinacea"),
    ("Lavande",              "Lavandula angustifolia",    "sauvages",  "lavande"),
    ("Laiteron",             "Sonchus oleraceus",         "sauvages",  "laiteron"),
    ("Luzerne",              "Medicago sativa",           "sauvages",  "luzerne"),
    ("Maceron",              "Smyrnium olusatrum",        "sauvages",  "maceron"),
    ("Mauve",                "Malva sylvestris",          "sauvages",  "mauve"),
    ("Mouron des oiseaux",   "Stellaria media",           "sauvages",  "mouron_oiseaux"),
    ("Feuilles de mûrier",   "Rubus fruticosus",          "sauvages",  "feuilles_murier"),
    ("Ortie",                "Urtica dioica",             "sauvages",  "ortie"),
    ("Ortie blanche",        "Lamium album",              "sauvages",  "ortie_blanche"),
    ("Pissenlit",            "Taraxacum officinale",      "sauvages",  "pissenlit"),
    ("Plantain majeur",      "Plantago major",            "sauvages",  "plantain_majeur"),
    ("Plantain lancéolé",    "Plantago lanceolata",       "sauvages",  "plantain_lanceole"),
    ("Pourpier",             "Portulaca oleracea",        "sauvages",  "pourpier"),
    ("Souci",                "Calendula officinalis",     "sauvages",  "souci"),
    ("Tussilage",            "Tussilago farfara",         "sauvages",  "tussilage"),
    ("Trèfle",               "Trifolium",                 "sauvages",  "trefle"),

    # ── Feuillages et branchages ─────────────────────────────────────────────
    ("Aulne",    "Alnus glutinosa",    "branchages", "aulne"),
    ("Bouleau",  "Betula pendula",     "branchages", "bouleau"),
    ("Charme",   "Carpinus betulus",   "branchages", "charme"),
    ("Érable",   "Acer campestre",     "branchages", "erable"),
    ("Frêne",    "Fraxinus excelsior", "branchages", "frene"),
    ("Hêtre",    "Fagus sylvatica",    "branchages", "hetre"),
    ("Noisetier","Corylus avellana",   "branchages", "noisetier"),
    ("Orme",     "Ulmus minor",        "branchages", "orme"),
    ("Pommier",  "Malus domestica",    "branchages", "pommier"),
    ("Poirier",  "Pyrus communis",     "branchages", "poirier"),
    ("Saule",    "Salix alba",         "branchages", "saule"),
    ("Tilleul",  "Tilia cordata",      "branchages", "tilleul"),

    # ── Salades ──────────────────────────────────────────────────────────────
    ("Batavia",              "Lactuca sativa batavia",   "salades", "batavia"),
    ("Cressonnette marocaine","Lepidium sativum",         "salades", "cressonnette"),
    ("Feuille de chêne",     "Lactuca sativa",           "salades", "feuille_chene"),
    ("Lollo rossa",          "Lactuca sativa crispa",    "salades", "lollo_rossa"),
    ("Reine des glaces",     "Lactuca sativa",           "salades", "reine_glaces"),
    ("Romaine",              "Lactuca sativa longifolia","salades", "romaine"),
    ("Rougette",             "Lactuca sativa",           "salades", "rougette"),
    ("Mâche",                "Valerianella locusta",     "salades", "mache"),
    ("Mizuna",               "Brassica rapa nipposinica","salades", "mizuna"),
    ("Roquette",             "Eruca vesicaria",          "salades", "roquette"),
    ("Trévise",              "Cichorium intybus foliosum","salades", "trevise"),
    ("Endive",               "Cichorium intybus",        "salades", "endive"),
    ("Frisée",               "Cichorium endivia",        "salades", "frisee"),
    ("Scarole",              "Cichorium endivia latifolium","salades","scarole"),

    # ── Légumes racines ──────────────────────────────────────────────────────
    ("Betterave crue",    "Beta vulgaris",           "racines", "betterave"),
    ("Céleri rave",       "Apium graveolens rapaceum","racines", "celeri_rave"),
    ("Panais",            "Pastinaca sativa",        "racines", "panais"),
    ("Persil tubéreux",   "Petroselinum crispum",    "racines", "persil_tubereux"),
    ("Navet",             "Brassica rapa",           "racines", "navet"),
    ("Racine de pissenlit","Taraxacum officinale",   "racines", "racine_pissenlit"),
    ("Rutabaga",          "Brassica napus napobrassica","racines","rutabaga"),
    ("Topinambour",       "Helianthus tuberosus",    "racines", "topinambour"),

    # ── Fruits ───────────────────────────────────────────────────────────────
    ("Abricot",    "Prunus armeniaca",    "fruits", "abricot"),
    ("Ananas",     "Ananas comosus",      "fruits", "ananas"),
    ("Banane",     "Musa",               "fruits", "banane"),
    ("Cerise",     "Prunus avium",        "fruits", "cerise"),
    ("Fraise",     "Fragaria ananassa",   "fruits", "fraise"),
    ("Framboise",  "Rubus idaeus",        "fruits", "framboise"),
    ("Kiwi",       "Actinidia deliciosa", "fruits", "kiwi"),
    ("Mangue",     "Mangifera indica",    "fruits", "mangue"),
    ("Melon",      "Cucumis melo",        "fruits", "melon"),
    ("Mûre",       "Rubus fruticosus",    "fruits", "mure"),
    ("Myrtille",   "Vaccinium myrtillus", "fruits", "myrtille"),
    ("Nectarine",  "Prunus persica",      "fruits", "nectarine"),
    ("Pastèque",   "Citrullus lanatus",   "fruits", "pasteque"),
    ("Prune",      "Prunus domestica",    "fruits", "prune"),
    ("Papaye",     "Carica papaya",       "fruits", "papaye"),
    ("Pêche",      "Prunus persica",      "fruits", "peche"),
    ("Poire",      "Pyrus communis",      "fruits", "poire"),
    ("Raisin",     "Vitis vinifera",      "fruits", "raisin"),
    ("Pomme",      "Malus domestica",     "fruits", "pomme"),
    ("Tomate",     "Solanum lycopersicum","fruits", "tomate"),
]


# ─── Fonctions Wikimedia Commons ──────────────────────────────────────────────

def chercher_image_wikimedia(terme_recherche):
    """
    Cherche une image sur Wikimedia Commons et retourne l'URL directe.
    Retourne None si aucun résultat.
    """
    api_url = "https://commons.wikimedia.org/w/api.php"

    # Étape 1 : trouver le premier fichier image correspondant
    params_search = {
        "action": "query",
        "generator": "search",
        "gsrsearch": terme_recherche,
        "gsrnamespace": 6,      # namespace 6 = File:
        "gsrlimit": 5,
        "prop": "imageinfo",
        "iiprop": "url|mime|size",
        "iiurlwidth": LARGEUR_MAX_PX,
        "format": "json",
    }

    try:
        r = requests.get(api_url, params=params_search, timeout=10,
                         headers={"User-Agent": USER_AGENT})
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"    ⚠️  Erreur réseau : {e}")
        return None

    pages = data.get("query", {}).get("pages", {})
    if not pages:
        return None

    # Filtrer uniquement les images (jpg, png, webp)
    extensions_ok = {".jpg", ".jpeg", ".png", ".webp"}
    for page in pages.values():
        imageinfo = page.get("imageinfo", [])
        if not imageinfo:
            continue
        url = imageinfo[0].get("thumburl") or imageinfo[0].get("url")
        if not url:
            continue
        ext = os.path.splitext(url.split("?")[0])[-1].lower()
        if ext in extensions_ok:
            return url

    return None


def telecharger_image(url, chemin_destination):
    """Télécharge une image depuis une URL vers un chemin local. Retry sur 429."""
    for tentative in range(3):
        try:
            r = requests.get(url, timeout=15,
                             headers={"User-Agent": USER_AGENT})
            if r.status_code == 429:
                attente = 10 * (tentative + 1)
                print(f"\n    ⏳ Rate limit, attente {attente}s…", end=" ", flush=True)
                time.sleep(attente)
                continue
            r.raise_for_status()
            with open(chemin_destination, "wb") as f:
                f.write(r.content)
            return True
        except Exception as e:
            print(f"    ⚠️  Erreur téléchargement : {e}")
            return False
    return False


# ─── Programme principal ───────────────────────────────────────────────────────

def main():
    OUTPUT_DIR.mkdir(exist_ok=True)
    manquants = []
    succes = 0

    print(f"\n🐰 Chipie Miam — Téléchargement des images ({len(VEGETAUX)} végétaux)\n")
    print("─" * 60)

    for nom, latin, categorie, slug in VEGETAUX:
        # Dossier par catégorie
        dossier = OUTPUT_DIR / categorie
        dossier.mkdir(exist_ok=True)

        # Vérifier si l'image existe déjà (reprise en cas d'interruption)
        fichier_existant = None
        for ext in [".jpg", ".jpeg", ".png", ".webp"]:
            candidat = dossier / f"{slug}{ext}"
            if candidat.exists():
                fichier_existant = candidat
                break

        if fichier_existant:
            print(f"  ✅  {nom} — déjà téléchargé ({fichier_existant.name})")
            succes += 1
            continue

        print(f"  🔍  {nom} ({latin})…", end=" ", flush=True)

        # Tentative 1 : nom latin
        url = chercher_image_wikimedia(latin)
        time.sleep(DELAY_ENTRE_REQUETES)

        # Tentative 2 : nom français si échec
        if not url:
            url = chercher_image_wikimedia(nom)
            time.sleep(DELAY_ENTRE_REQUETES)

        if not url:
            print("❌ introuvable")
            manquants.append((nom, latin, categorie))
            continue

        # Déduire l'extension depuis l'URL
        ext_brute = os.path.splitext(url.split("?")[0])[-1].lower()
        ext = ext_brute if ext_brute in {".jpg", ".jpeg", ".png", ".webp"} else ".jpg"
        chemin = dossier / f"{slug}{ext}"

        ok = telecharger_image(url, chemin)
        if ok:
            print(f"✅ sauvegardé → {chemin}")
            succes += 1
        else:
            print("❌ échec téléchargement")
            manquants.append((nom, latin, categorie))

    # ── Rapport final ──────────────────────────────────────────────────────────
    print("\n" + "─" * 60)
    print(f"\n✅  Succès    : {succes}/{len(VEGETAUX)}")
    print(f"❌  Manquants : {len(manquants)}/{len(VEGETAUX)}")

    if manquants:
        with open(REPORT_FILE, "w", encoding="utf-8") as f:
            f.write("# Chipie Miam — Images manquantes\n")
            f.write(f"# {len(manquants)} végétaux sans image automatique\n\n")
            categorie_courante = None
            for nom, latin, cat in sorted(manquants, key=lambda x: x[2]):
                if cat != categorie_courante:
                    f.write(f"\n## {cat.upper()}\n")
                    categorie_courante = cat
                f.write(f"- {nom} ({latin})\n")
        print(f"\n📄  Rapport sauvegardé : {REPORT_FILE}")

    print(f"\n📁  Images dans : {OUTPUT_DIR.resolve()}\n")


if __name__ == "__main__":
    main()
