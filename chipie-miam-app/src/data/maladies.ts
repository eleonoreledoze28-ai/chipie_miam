export type Urgence = 'urgence' | 'important' | 'surveillance'

export interface Maladie {
  id: string
  nom: string
  emoji: string
  urgence: Urgence
  description: string
  symptomes: string[]
  quoiFaire: string[]
  prevention?: string[]
  savoirPlus?: string
}

export const MALADIES: Maladie[] = [
  {
    id: 'stase-gi',
    nom: 'Stase gastro-intestinale',
    emoji: '🫁',
    urgence: 'urgence',
    description: 'L\'un des problèmes les plus graves et fréquents chez le lapin. Le transit digestif ralentit ou s\'arrête complètement. Sans traitement rapide, cela peut être fatal en quelques heures.',
    symptomes: [
      'Refus total de manger',
      'Absence de crottes ou crottes très petites et dures',
      'Abdomen gonflé et dur',
      'Léthargie, posture courbée',
      'Grincements de dents (douleur)',
      'Respiration rapide',
    ],
    quoiFaire: [
      'Consulter un vétérinaire EN URGENCE dans les 2–4 heures',
      'Ne pas laisser sans soins même si le lapin semble juste "moins actif"',
      'Proposer du foin en grande quantité (stimule le transit)',
      'Ne jamais donner de médicaments humains',
    ],
    prevention: [
      'Foin disponible en permanence (80% de la ration)',
      'Exercice quotidien hors cage',
      'Éviter les changements brusques d\'alimentation',
      'Brossage régulier pour limiter l\'ingestion de poils',
    ],
  },
  {
    id: 'malocclusion',
    nom: 'Malocclusion dentaire',
    emoji: '🦷',
    urgence: 'important',
    description: 'Les dents du lapin poussent toute sa vie. Si elles ne s\'usent pas correctement (souvent faute de foin), elles poussent de façon anormale et peuvent blesser la bouche ou bloquer la mâchoire.',
    symptomes: [
      'Perte de poids progressive',
      'Salive excessive, menton mouillé',
      'Refus ou difficulté à manger les granulés',
      'Mauvaise haleine',
      'Yeux qui coulent (compression du canal lacrymal)',
      'Masse visible sur la mâchoire',
    ],
    quoiFaire: [
      'Consulter un vétérinaire pour un bilan dentaire',
      'Le vétérinaire peut limer les dents sous anesthésie',
      'Contrôles réguliers tous les 3–6 mois si tendance connue',
    ],
    prevention: [
      'Foin en accès illimité (use les dents naturellement)',
      'Éviter un excès de granulés et légumes mous',
      'Branchages à ronger (bouleau, pommier, noisetier)',
    ],
  },
  {
    id: 'abces',
    nom: 'Abcès dentaire',
    emoji: '🦠',
    urgence: 'important',
    description: 'Les infections dentaires chez le lapin forment souvent des abcès épais difficiles à traiter. Contrairement aux chiens et chats, le pus du lapin est caséeux (solide), ce qui complique le drainage.',
    symptomes: [
      'Bosse ferme sur la mâchoire ou sous le menton',
      'Asymétrie du visage',
      'Refus de manger d\'un côté',
      'Larmoiement d\'un seul œil',
    ],
    quoiFaire: [
      'Consulter un vétérinaire — le traitement est souvent chirurgical',
      'Antibiothérapie longue durée nécessaire',
      'Ne pas tenter de "percer" l\'abcès soi-même',
    ],
  },
  {
    id: 'myxomatose',
    nom: 'Myxomatose',
    emoji: '🦟',
    urgence: 'urgence',
    description: 'Maladie virale grave transmise par les moustiques, puces et contact avec des lapins sauvages. Souvent fatale sans traitement. La vaccination est le meilleur moyen de protection.',
    symptomes: [
      'Gonflements autour des yeux, nez, oreilles, organes génitaux',
      'Yeux collés, écoulement purulent',
      'Fièvre élevée, abattement total',
      'Difficultés respiratoires',
      'Apparition de nodules sous la peau',
    ],
    quoiFaire: [
      'Consulter un vétérinaire immédiatement',
      'Isoler le lapin des autres animaux',
      'Traitement de soutien seulement (pas d\'antiviral)',
      'Pronostic sombre sans vaccination préalable',
    ],
    prevention: [
      'Vaccination annuelle obligatoire',
      'Éviter le contact avec des lapins sauvages',
      'Traitement antiparasitaire (moustiques, puces)',
      'Moustiquaire en été si vivant dehors',
    ],
  },
  {
    id: 'vhd',
    nom: 'VHD / Maladie hémorragique virale',
    emoji: '🩸',
    urgence: 'urgence',
    description: 'Maladie virale extrêmement contagieuse et souvent mortelle en quelques heures. Deux souches existent : VHD1 et VHD2. La mort peut survenir sans symptômes visibles préalables.',
    symptomes: [
      'Mort subite sans symptômes apparents',
      'Convulsions, sang au nez et à la bouche',
      'Abattement brutal, refus de boire',
      'Fièvre très élevée',
    ],
    quoiFaire: [
      'Vaccination annuelle — seule protection efficace',
      'Isoler tout lapin malade immédiatement',
      'Désinfecter tout le matériel (virus très résistant)',
      'Prévenir le vétérinaire sans délai',
    ],
    prevention: [
      'Vaccination VHD1 + VHD2 annuelle',
      'Ne pas amener de foin ou herbe de zones à risque',
      'Quarantaine pour tout nouveau lapin',
    ],
  },
  {
    id: 'otite',
    nom: 'Otite / Torticolis',
    emoji: '👂',
    urgence: 'important',
    description: 'L\'infection de l\'oreille interne ou moyenne peut provoquer un torticolis (tête penchée) et des problèmes d\'équilibre. Souvent causée par la bactérie Pasteurella ou Encephalitozoon cuniculi.',
    symptomes: [
      'Tête penchée d\'un côté (torticolis)',
      'Perte d\'équilibre, chutes, roulements',
      'Mouvements oculaires anormaux (nystagmus)',
      'Oreille grattée ou douloureuse',
      'Écoulement de l\'oreille',
    ],
    quoiFaire: [
      'Consulter un vétérinaire rapidement',
      'Traitement antibiotique ou antiparasitaire selon la cause',
      'Le torticolis peut persister même après guérison',
      'Aménager l\'espace pour éviter les chutes',
    ],
  },
  {
    id: 'pasteurellose',
    nom: 'Pasteurellose (snuffles)',
    emoji: '🤧',
    urgence: 'surveillance',
    description: 'Infection bactérienne très répandue causée par Pasteurella multocida. Elle peut rester silencieuse ou s\'activer lors de stress. Affecte principalement les voies respiratoires.',
    symptomes: [
      'Éternuements fréquents',
      'Écoulement nasal blanc ou jaunâtre',
      'Pattes avant mouillées (le lapin se frotte le nez)',
      'Respiration bruyante',
      'Dans les cas graves : pneumonie, abcès',
    ],
    quoiFaire: [
      'Consulter un vétérinaire pour identifier la bactérie',
      'Antibiothérapie adaptée et longue durée',
      'Réduire les sources de stress',
      'La maladie est souvent chronique et récurrente',
    ],
    prevention: [
      'Éviter les courants d\'air et changements de température',
      'Hygiène irréprochable de la litière',
      'Quarantaine des nouveaux lapins',
    ],
  },
  {
    id: 'ballonnements',
    nom: 'Ballonnements / Coliques',
    emoji: '💨',
    urgence: 'urgence',
    description: 'Accumulation de gaz dans le tractus digestif. Extrêmement douloureux pour le lapin et potentiellement fatal. Souvent causé par une alimentation inadaptée ou un changement brusque.',
    symptomes: [
      'Abdomen gonflé, tendu comme un ballon',
      'Refus de manger',
      'Posture voûtée, impossibilité de se mettre à l\'aise',
      'Grincements de dents intenses',
      'Aucune crotte depuis plusieurs heures',
    ],
    quoiFaire: [
      'Consulter un vétérinaire EN URGENCE',
      'Massage doux du ventre en cercles peut aider légèrement',
      'Proposer du foin et de l\'eau fraîche',
      'Ne jamais donner de Simethicone ou médicaments humains sans avis véto',
    ],
    prevention: [
      'Jamais de légumineuses crues (lentilles, pois, haricots)',
      'Transition alimentaire progressive sur 2 semaines',
      'Foin en accès illimité',
    ],
  },
  {
    id: 'coccidiose',
    nom: 'Coccidiose',
    emoji: '🔬',
    urgence: 'important',
    description: 'Infection parasitaire interne causée par des protozoaires Eimeria. Très fréquente chez les jeunes lapins ou en cas de stress. Peut être intestinale ou hépatique.',
    symptomes: [
      'Diarrhée liquide ou molle, parfois avec sang',
      'Amaigrissement rapide',
      'Abdomen ballonné (forme hépatique)',
      'Fourrure terne, léthargie',
      'Chez les jeunes : retard de croissance',
    ],
    quoiFaire: [
      'Consulter un vétérinaire pour analyse de selles',
      'Traitement antiparasitaire sur ordonnance',
      'Hygiène stricte de la cage (les œufs survivent dans l\'environnement)',
      'Isoler le lapin malade',
    ],
    prevention: [
      'Nettoyer la litière quotidiennement',
      'Ne pas surcharger les espaces de vie',
      'Éviter les selles dans la nourriture et l\'eau',
    ],
  },
  {
    id: 'gale-oreilles',
    nom: 'Gale des oreilles',
    emoji: '🐛',
    urgence: 'surveillance',
    description: 'Infestation par des acariens Psoroptes cuniculi à l\'intérieur des oreilles. Très prurigineuse mais rarement dangereuse si traitée rapidement. Contagieuse entre lapins.',
    symptomes: [
      'Grattage intense des oreilles',
      'Croûtes brunes à l\'intérieur du pavillon',
      'Odeur désagréable des oreilles',
      'Le lapin secoue souvent la tête',
      'Dans les cas graves : perforation du tympan',
    ],
    quoiFaire: [
      'Consulter un vétérinaire pour confirmer et prescrire',
      'Traitement antiparasitaire (ivermectine ou selamectine)',
      'Ne JAMAIS nettoyer les croûtes soi-même — cela est très douloureux',
      'Traiter tous les lapins en contact',
    ],
    prevention: [
      'Inspection régulière des oreilles',
      'Quarantaine des nouveaux lapins',
    ],
  },
  {
    id: 'tumeur-uterine',
    nom: 'Tumeur utérine',
    emoji: '⚠️',
    urgence: 'important',
    description: 'Extrêmement fréquente chez les lapines non stérilisées (jusqu\'à 80% après 4 ans). Le cancer de l\'utérus est l\'une des principales causes de mort chez les femelles adultes non stérilisées.',
    symptomes: [
      'Sang dans les urines (hématurie)',
      'Ganglions ou masse dans le ventre',
      'Pertes génitales',
      'Prise de poids ou amaigrissement',
      'Comportement agressif ou agitation',
    ],
    quoiFaire: [
      'Consulter un vétérinaire dès les premiers signes',
      'Stérilisation préventive avant 2 ans — traitement le plus efficace',
      'Ablation chirurgicale si déjà déclarée',
    ],
    prevention: [
      'Stérilisation avant 12–18 mois — réduit le risque à quasi zéro',
    ],
    savoirPlus: 'La stérilisation est l\'une des décisions les plus importantes pour la santé d\'une lapine.',
  },
  {
    id: 'urolithiase',
    nom: 'Calculs urinaires',
    emoji: '🪨',
    urgence: 'important',
    description: 'Accumulation de calcium dans les voies urinaires. Le lapin absorbe le calcium en grande quantité et élimine le surplus dans les urines, ce qui peut former des dépôts ou calculs.',
    symptomes: [
      'Urines blanches, laiteuses ou avec dépôt crayeux',
      'Cris de douleur lors des mictions',
      'Sang dans les urines',
      'Posture voûtée, rein courbé',
      'Perte d\'appétit',
    ],
    quoiFaire: [
      'Consulter un vétérinaire pour radiographie',
      'Augmenter l\'hydratation (fontaine d\'eau fraîche)',
      'Réduire les aliments riches en calcium (chou kale, épinards, brocoli)',
    ],
    prevention: [
      'Eau fraîche en permanence',
      'Éviter les végétaux très riches en calcium',
      'Foin comme base de l\'alimentation',
    ],
  },
]

export const URGENCE_INFO: Record<Urgence, { label: string; color: string; bg: string }> = {
  urgence:      { label: '🚨 Urgence',      color: '#ff3b30', bg: 'rgba(255,59,48,0.1)' },
  important:    { label: '⚠️ Important',     color: '#ffcc00', bg: 'rgba(255,204,0,0.1)' },
  surveillance: { label: '👁 Surveillance',  color: '#4cd964', bg: 'rgba(76,217,100,0.1)' },
}
