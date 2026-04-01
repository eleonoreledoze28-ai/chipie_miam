import { readFileSync, writeFileSync } from 'fs';

// Parse liste_images.txt
const raw = readFileSync('C:/Users/dique/Desktop/App/Chipie_Miam/liste_images.txt', 'utf-8');
const nameUrl = {};
for (const line of raw.replace(/\r/g, '').split('\n')) {
  const m = line.match(/^-\s+(.+?):\s+(https:\/\/.+)$/);
  if (m) nameUrl[m[1].trim()] = m[2].trim();
}
console.log(`Parsed ${Object.keys(nameUrl).length} URLs from liste_images.txt`);

// Map liste_images name → vegetal id
const nameToId = {
  'Aneth': 'aneth', 'Basilic': 'basilic', 'Cerfeuil': 'cerfeuil',
  'Coriandre': 'coriandre', 'Estragon': 'estragon', 'Marjolaine': 'marjolaine',
  'Menthe': 'menthe', 'Origan': 'origan', 'Persil': 'persil',
  'Romarin': 'romarin', 'Sariette': 'sarriette', 'Serpolet': 'serpolet',
  'Thym': 'thym',
  'Avoine': 'avoine', 'Ble': 'ble', 'Blettes': 'blettes',
  'Brocoli': 'brocoli', 'Capucine': 'capucine', 'Celeri': 'celeri_branche',
  'Chou_kale': 'choux', 'Cosses_petits_pois': 'cosses_petit_pois',
  'cresson': 'cresson', 'Concombre': 'concombre', 'Courgette': 'courgette',
  'Epinards': 'epinards', 'Fanes_betterave': 'fanes_betterave',
  'Fanes_de_carottes': 'fanes_carottes', 'Fanes_de_fenouil': 'fanes_fenouil',
  'Fanes_de_navet': 'fanes_navet', 'Fanes_de_radis': 'fanes_radis',
  'Artichaut': 'feuilles_artichaut', 'Feuilles_fraisiers': 'feuilles_fraisier',
  'Feuilles_framboisier': 'feuilles_framboisier',
  'Feuilles_groseiller': 'feuilles_groseillier',
  'Feuilles_vigne': 'feuilles_vigne', 'Feuilles_tournesol': 'feuilles_tournesol',
  'Haricots_verts': 'haricots_verts', 'Liveche': 'liveche',
  'Moutarde': 'moutarde', 'Pois_gourmands': 'pois_gourmands',
  'Poivron': 'poivron',
  'Achillee_millefeuille': 'achillee', 'Aigremoine': 'aigremoine',
  'Benoite_commune': 'benoite', 'Bleuet': 'bleuet',
  'Bourrache': 'bourrache', 'Bourse_a_pasteur': 'bourse_pasteur',
  'Buddleia_de_David': 'buddleia', 'Buglosse_toujours_verte': 'buglosse',
  'Camomille': 'camomille', 'Chicoree_sauvage': 'chicoree_sauvage',
  'Consoude': 'consoude', 'Echinacee': 'echinacea',
  'Lavande': 'lavande', 'Laiteron': 'laiteron', 'Luzerne': 'luzerne',
  'Maceron': 'maceron', 'Mauve': 'mauve',
  'Mouron_des_oiseaux': 'mouron_oiseaux', 'Murier': 'feuilles_murier',
  'Ortie': 'ortie', 'Lamier_blanc': 'ortie_blanche',
  'Pissenlit': 'pissenlit', 'Plantain_majeur': 'plantain_majeur',
  'Plantain_lanceole': 'plantain_lanceole', 'Pourpier': 'pourpier',
  'Calendula': 'souci', 'Tussilage': 'tussilage', 'Trefle': 'trefle',
  'Batavia_blonde': 'batavia', 'Cressonette_marocaine': 'cressonnette',
  'Feuille_de_chene': 'feuille_chene', 'Lollo_rossa': 'lollo_rossa',
  'Reine_des_glaces': 'reine_glaces', 'Romaine': 'romaine',
  'Rougette': 'rougette', 'Mache': 'mache', 'Mizuna': 'mizuna',
  'Roquette': 'roquette', 'Trevise': 'trevise', 'Endive': 'endive',
  'Frisee': 'frisee', 'Scarole': 'scarole',
  'Betterave 2': 'betterave', 'Celeri_rave': 'celeri_rave',
  'Panais': 'panais', 'Persil_tubereux': 'persil_tubereux',
  'Navet': 'navet', 'Racine_de_pissenlit': 'racine_pissenlit',
  'Rutabaga': 'rutabaga', 'Topinambour': 'topinambour',
};

// Build id → url
const idUrl = {};
for (const [name, vid] of Object.entries(nameToId)) {
  if (nameUrl[name]) idUrl[vid] = nameUrl[name];
  else console.log(`  WARNING: no URL for "${name}" → ${vid}`);
}
console.log(`Mapped ${Object.keys(idUrl).length} IDs to URLs`);

// Read vegetaux.ts
const fpath = 'C:/Users/dique/Desktop/App/Chipie_Miam/chipie-miam-app/src/data/vegetaux.ts';
let content = readFileSync(fpath, 'utf-8');

// Split content into individual object blocks: find each { ... } in the VEGETAUX array
// Strategy: for each id in idUrl, find the line `image: '/images/...'` that belongs to that id block
// and replace the path with the URL

let count = 0;
for (const [vid, url] of Object.entries(idUrl)) {
  // Find the block containing this id and its image field
  // Look for: id: 'VID', then the next image: line within ~10 lines
  const idPattern = `id: '${vid}'`;
  const idx = content.indexOf(idPattern);
  if (idx === -1) {
    console.log(`  NOT FOUND in file: id: '${vid}'`);
    continue;
  }

  // Find the next 'image:' after this id
  const afterId = content.substring(idx);
  const imageMatch = afterId.match(/image:\s*'([^']+)'/);
  if (!imageMatch) {
    console.log(`  No image field found after id: '${vid}'`);
    continue;
  }

  const oldImage = imageMatch[1];
  const fullOldStr = `image: '${oldImage}'`;
  const fullNewStr = `image: '${url}'`;

  // Replace only the first occurrence after this id position
  const before = content.substring(0, idx);
  const after = content.substring(idx).replace(fullOldStr, fullNewStr);
  content = before + after;
  count++;
}

writeFileSync(fpath, content, 'utf-8');
console.log(`\nReplaced ${count} image paths`);

// Verify: count remaining local images
const remaining = [...content.matchAll(/image:\s*'(\/images\/[^']+)'/g)];
console.log(`Remaining local images: ${remaining.length}`);
if (remaining.length > 0) {
  for (const m of remaining) {
    // find the id just before this image
    const pos = m.index;
    const before = content.substring(Math.max(0, pos - 200), pos);
    const idM = before.match(/id:\s*'([^']+)'/g);
    const lastId = idM ? idM[idM.length - 1].match(/id:\s*'([^']+)'/)[1] : '?';
    console.log(`  ${lastId} → ${m[1]}`);
  }
}
