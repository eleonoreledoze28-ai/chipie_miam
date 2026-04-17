export interface Fact {
  id: string
  emoji: string
  texte: string
  categorie: 'biologie' | 'comportement' | 'alimentation' | 'histoire' | 'curiosite'
}

export const FACTS: Fact[] = [
  // Biologie
  { id: 'f01', emoji: '🚫', categorie: 'biologie',      texte: "Les lapins ne peuvent pas vomir. Leur système digestif est strictement à sens unique — d'où l'importance d'un régime irréprochable." },
  { id: 'f02', emoji: '🦷', categorie: 'biologie',      texte: "Les dents d'un lapin poussent toute sa vie à raison de ~2 mm par semaine. Sans foin pour les user, elles pousseraient jusqu'à rendre l'animal incapable de manger." },
  { id: 'f03', emoji: '👁️', categorie: 'biologie',      texte: "Un lapin voit presque à 360° grâce à ses yeux positionnés sur les côtés de la tête. Seul un petit angle mort existe directement devant son nez." },
  { id: 'f04', emoji: '👂', categorie: 'biologie',      texte: "Les oreilles d'un lapin peuvent pivoter à 270° de façon indépendante. Ils peuvent ainsi localiser un son précisément sans bouger la tête." },
  { id: 'f05', emoji: '❤️', categorie: 'biologie',      texte: "Le cœur d'un lapin bat entre 120 et 325 fois par minute — soit jusqu'à 5 fois plus vite qu'un cœur humain au repos." },
  { id: 'f06', emoji: '🦴', categorie: 'biologie',      texte: "Le squelette d'un lapin ne représente que 7 à 8% de son poids total. C'est pourquoi une chute ou une mauvaise manipulation peut facilement causer une fracture." },
  { id: 'f07', emoji: '💧', categorie: 'biologie',      texte: "Les lapins transpirent uniquement par les coussinets plantaires. Contrairement à nous, ils ne peuvent pas se rafraîchir par la sueur — d'où leur sensibilité extrême à la chaleur." },
  { id: 'f08', emoji: '🌡️', categorie: 'biologie',      texte: "Les oreilles d'un lapin sont un véritable système de climatisation naturel. Elles sont irriguées de nombreux vaisseaux sanguins qui permettent de dissiper la chaleur corporelle." },
  { id: 'f09', emoji: '🦷', categorie: 'biologie',      texte: "Un lapin adulte possède 28 dents : 4 incisives (dont 2 dents de peg derrière les supérieures), 12 prémolaires et 12 molaires. Zéro canine." },
  { id: 'f10', emoji: '🐾', categorie: 'biologie',      texte: "Les lapins sont digitigrades : ils marchent sur leurs doigts, pas sur toute leur patte. Comme les chats, mais en plus rebondissant." },
  // Comportement
  { id: 'f11', emoji: '🎉', categorie: 'comportement', texte: "Le \"binky\" — ce bond fou accompagné d'une torsion en l'air — est le signe le plus clair qu'un lapin est heureux. C'est littéralement un cri de joie silencieux." },
  { id: 'f12', emoji: '🦶', categorie: 'comportement', texte: "Le thumping (frappe du sol avec les pattes arrière) est un signal d'alarme hérité de la vie sauvage. En domesticité, ils l'utilisent aussi pour exprimer leur mécontentement." },
  { id: 'f13', emoji: '👅', categorie: 'comportement', texte: "Quand un lapin te lèche, c'est qu'il/elle te considère comme un membre de sa famille. C'est le plus grand signe d'affection dans le langage lapin." },
  { id: 'f14', emoji: '😤', categorie: 'comportement', texte: "Les lapins boudent vraiment. Après un événement déplaisant (vétérinaire, nettoyage de cage), certains ignorent leur propriétaire pendant des heures, voire des jours." },
  { id: 'f15', emoji: '😴', categorie: 'comportement', texte: "Les lapins peuvent dormir les yeux ouverts grâce à une membrane translucide. Ils restent ainsi en alerte, prêts à fuir au moindre danger." },
  { id: 'f16', emoji: '🌅', categorie: 'comportement', texte: "Les lapins sont crépusculaires : naturellement actifs à l'aube et au coucher du soleil. En domesticité, ils s'adaptent souvent au rythme de leur propriétaire." },
  { id: 'f17', emoji: '🏷️', categorie: 'comportement', texte: "Les lapins marquent leur territoire en frottant leur menton (glande odorante) sur les objets. Si ton lapin frotte sa tête contre toi, il te marque comme sa propriété." },
  { id: 'f18', emoji: '😡', categorie: 'comportement', texte: "Un lapin qui grogne et charge est un lapin qui défend son territoire. Ce comportement disparaît souvent après la stérilisation." },
  { id: 'f19', emoji: '🧠', categorie: 'comportement', texte: "Les lapins mémorisent parfaitement les routines de leurs propriétaires. Ils savent l'heure du repas avec une précision qui ferait rougir une horloge suisse." },
  { id: 'f20', emoji: '📛', categorie: 'comportement', texte: "Un lapin peut reconnaître son prénom et réagir quand on l'appelle — à condition d'associer ce son à quelque chose d'agréable (friandise, câlin)." },
  // Alimentation
  { id: 'f21', emoji: '💩', categorie: 'alimentation', texte: "Les lapins produisent 2 types de crottes : les normales (rondes et sèches) et les cecotrophes (molles et brillantes). Ils mangent directement les cecotrophes pour absorber les nutriments qui n'ont pas été digérés la première fois." },
  { id: 'f22', emoji: '🌾', categorie: 'alimentation', texte: "Un lapin adulte mange son propre poids en foin chaque semaine. Le foin ne doit jamais manquer — c'est la base absolue de sa santé digestive et dentaire." },
  { id: 'f23', emoji: '🌼', categorie: 'alimentation', texte: "Les feuilles de pissenlit contiennent plus de vitamine A, C et K que les épinards. C'est l'un des aliments les plus nutritifs pour les lapins — et ils l'adorent." },
  { id: 'f24', emoji: '🥕', categorie: 'alimentation', texte: "Contrairement aux dessins animés, les carottes ne sont pas un aliment quotidien pour les lapins. Trop riches en sucre, elles ne doivent être données qu'occasionnellement." },
  { id: 'f25', emoji: '💧', categorie: 'alimentation', texte: "Un lapin adulte boit entre 50 et 300 ml d'eau par jour selon son alimentation. Un lapin qui mange beaucoup de légumes frais en consomme moins." },
  { id: 'f26', emoji: '🌿', categorie: 'alimentation', texte: "Le persil frais contient plus de vitamine C que les oranges — mais il est aussi riche en calcium. À alterner avec d'autres herbes pour éviter les calculs urinaires." },
  { id: 'f27', emoji: '🌱', categorie: 'alimentation', texte: "Les fanes de radis, de carottes et de betteraves sont excellentes pour les lapins. La partie verte est souvent plus nutritive que le légume lui-même." },
  { id: 'f28', emoji: '🫐', categorie: 'alimentation', texte: "Les myrtilles fraîches contiennent des antioxydants bénéfiques pour les lapins — mais en petite quantité seulement (2-3 baies), comme une friandise rare." },
  { id: 'f29', emoji: '🌾', categorie: 'alimentation', texte: "Les granulés ne doivent représenter que 5% maximum de la ration quotidienne d'un lapin adulte. Trop de granulés entraîne obésité et problèmes dentaires." },
  { id: 'f30', emoji: '🍃', categorie: 'alimentation', texte: "Le thym, la mélisse et l'estragon ont des propriétés antibactériennes et digestives naturelles pour les lapins. Les herbes aromatiques sont d'excellents compléments au foin." },
  // Histoire
  { id: 'f31', emoji: '🧑‍🍳', categorie: 'histoire',    texte: "Les lapins ont été domestiqués il y a environ 1400 ans par des moines bénédictins français, qui les élevaient comme source de viande considérée comme « poisson » pendant le Carême." },
  { id: 'f32', emoji: '🌍', categorie: 'histoire',    texte: "Il existe plus de 305 races de lapins officiellement reconnues dans le monde. Des géants de Flandre (~8 kg) aux nains hollandais (~1 kg), la diversité est vertigineuse." },
  { id: 'f33', emoji: '🏛️', categorie: 'histoire',    texte: "Les Romains élevaient des lapins dans des enclos appelés \"leporaria\". Ces premiers élevages organisés existaient dès le Ier siècle avant J.-C." },
  { id: 'f34', emoji: '🏆', categorie: 'histoire',    texte: "Le plus vieux lapin du monde a vécu 18 ans et 10 mois — soit l'équivalent d'environ 150 ans humains. Il s'appelait Flopsie et vivait en Australie." },
  { id: 'f35', emoji: '🦘', categorie: 'histoire',    texte: "En 1859, 24 lapins introduits en Australie pour la chasse ont engendré une population de plusieurs centaines de millions, causant une catastrophe écologique sans précédent." },
  { id: 'f36', emoji: '🌙', categorie: 'histoire',    texte: "Dans de nombreuses cultures asiatiques, le lapin est associé à la lune. La légende chinoise dit qu'un lapin de jade habite la lune et prépare l'élixir d'immortalité." },
  { id: 'f37', emoji: '📚', categorie: 'histoire',    texte: "Le lapin blanc d'Alice au Pays des Merveilles est directement inspiré du lapin commun européen (Oryctolagus cuniculus). Lewis Carroll en possédait plusieurs." },
  { id: 'f38', emoji: '🐣', categorie: 'histoire',    texte: "Le lapin de Pâques vient d'une tradition germanique du XVIIe siècle. L\"Osterhase\" (lièvre de Pâques) cachait des œufs colorés pour les enfants sages." },
  { id: 'f39', emoji: '🖼️', categorie: 'histoire',    texte: "Albrecht Dürer a peint en 1502 \"Le Lièvre\" — l'une des œuvres animalières les plus célèbres au monde. L'original est conservé à Vienne." },
  { id: 'f40', emoji: '🚀', categorie: 'histoire',    texte: "En 1959, avant les chiens de Laïka, deux lapins soviétiques nommés Marfusa et Snezhinka ont voyagé dans l'espace à bord d'une fusée R2 et sont revenus vivants." },
  // Curiosités
  { id: 'f41', emoji: '⚡', categorie: 'curiosite',   texte: "Un lapin en pleine course peut atteindre 70 km/h sur de courtes distances. C'est plus rapide qu'un cheval au trot et qu'un humain en sprint olympique." },
  { id: 'f42', emoji: '🦴', categorie: 'curiosite',   texte: "Les empreintes avant d'un lapin ressemblent à de petites mains humaines. Leurs doigts sont si distincts qu'on peut compter leurs cinq doigts dans la neige." },
  { id: 'f43', emoji: '👃', categorie: 'curiosite',   texte: "Le nez d'un lapin remue entre 20 et 120 fois par minute selon son niveau d'alerte. Plus vite il remue, plus l'animal est stressé ou en train d'analyser une odeur." },
  { id: 'f44', emoji: '🎭', categorie: 'curiosite',   texte: "Les lapins ont deux types de poils : les poils de garde (longs et protecteurs) et le sous-poil (doux et isolant). Lors de la mue, ils peuvent perdre des centaines de poils par jour." },
  { id: 'f45', emoji: '🏠', categorie: 'curiosite',   texte: "À l'état sauvage, les lapins creusent des terriers complexes avec plusieurs entrées, chambres et issues de secours. Certaines garennes existent depuis des siècles." },
  { id: 'f46', emoji: '💪', categorie: 'curiosite',   texte: "Les pattes arrière d'un lapin sont si puissantes qu'une ruade bien placée peut briser le poignet d'un humain. C'est leur première arme défensive." },
  { id: 'f47', emoji: '🌈', categorie: 'curiosite',   texte: "Les lapins voient le monde en bleu et vert principalement. Ils ont une très bonne vision des mouvements mais ne perçoivent pas les détails fins comme nous." },
  { id: 'f48', emoji: '🧹', categorie: 'curiosite',   texte: "Les lapins sont des animaux extrêmement propres — ils passent jusqu'à 30% de leur temps éveillé à se toiletter, comme les chats." },
  { id: 'f49', emoji: '🏅', categorie: 'curiosite',   texte: "Un lapin peut apprendre à utiliser une litière en moins d'une semaine. Certains apprennent même à ouvrir des portes, appuyer sur des leviers ou reconnaître des formes." },
  { id: 'f50', emoji: '✂️', categorie: 'curiosite',   texte: "Le pelage d'un lapin angora peut pousser de 2,5 cm par mois. Un angora adulte peut produire jusqu'à 500g de laine par an — une laine considérée comme l'une des plus douces au monde." },
]

export const CATEGORIE_LABELS: Record<string, string> = {
  biologie:     '🔬 Biologie',
  comportement: '🐇 Comportement',
  alimentation: '🥕 Alimentation',
  histoire:     '📜 Histoire',
  curiosite:    '🔮 Curiosité',
}
