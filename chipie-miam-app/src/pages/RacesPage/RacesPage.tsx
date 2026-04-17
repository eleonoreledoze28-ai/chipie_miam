import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './RacesPage.module.css'

interface Race {
  id: string
  nom: string
  emoji: string
  taille: string
  poids: string
  esperanceVie: string
  caractere: string[]
  particularites: string[]
  alimentation: string[]
  soins: string[]
}

const RACES: Race[] = [
  {
    id: 'nain-colore',
    nom: 'Lapin nain coloré',
    emoji: '🐇',
    taille: 'Très petit',
    poids: '0,9 – 1,3 kg',
    esperanceVie: '8 – 12 ans',
    caractere: [
      'Très actif et curieux',
      'Peut être territorial, surtout non stérilisé',
      'S\'attache fortement à son propriétaire',
      'Plein d\'énergie, a besoin de stimulation quotidienne',
    ],
    particularites: [
      'Plus petite race reconnue, tête ronde et oreilles courtes dressées',
      'Très sensible au froid et aux courants d\'air du fait de sa petite taille',
      'Prone aux problèmes dentaires (malocclusion) à cause de la petite tête',
      'Nombreuses variétés de couleurs (REW, agoutti, havane, bleu...)',
    ],
    alimentation: [
      'Foin à volonté, indispensable pour ses petites dents',
      'Environ 80-100g de verdure fraîche par jour',
      'Granulés : 15-20g maximum par jour (risque d\'obésité)',
      'Éviter les friandises sucrées : métabolisme très sensible',
    ],
    soins: [
      'Brossage 1x/semaine, quotidien en période de mue',
      'Contrôle dentaire régulier chez un vétérinaire NAC',
      'Ongle à couper toutes les 6-8 semaines',
      'Enclos d\'au minimum 1,5m² + sorties quotidiennes',
    ],
  },
  {
    id: 'belier',
    nom: 'Bélier',
    emoji: '🐰',
    taille: 'Petit à moyen',
    poids: '1,5 – 3,5 kg',
    esperanceVie: '8 – 12 ans',
    caractere: [
      'Calme, doux et sociable — idéal en famille',
      'Très affectueux, aime être caressé',
      'Moins agile que les oreilles droites, moins enclin à fuir',
      'Bonne cohabitation avec enfants une fois apprivoisé',
    ],
    particularites: [
      'Oreilles tombantes caractéristiques, posées de chaque côté de la tête',
      'Très susceptible aux otites et infections auriculaires (vérifier les oreilles)',
      'Le bélier nain (Mini Lop) ne dépasse pas 2kg',
      'Plusieurs variétés : Bélier français, anglais, hollandais, mini...',
    ],
    alimentation: [
      'Besoins identiques aux autres races : foin à 80% du régime',
      'Légumes frais variés : 100g/kg de poids corporel',
      'Fruits : 1-2x par semaine maximum, petites quantités',
      'Eviter le chou et les crucifères qui fermentent',
    ],
    soins: [
      'Nettoyage des oreilles régulier avec une compresse sèche',
      'Contrôle vétérinaire si odeur inhabituelle des oreilles',
      'Brossage plus important que chez les lapins à oreilles droites',
      'Surveiller le poids : tendance à l\'embonpoint',
    ],
  },
  {
    id: 'rex',
    nom: 'Rex',
    emoji: '🦁',
    taille: 'Moyen à grand',
    poids: '3 – 4,5 kg',
    esperanceVie: '6 – 10 ans',
    caractere: [
      'Calme, intelligent et très docile',
      'Excellent compagnon, s\'adapte bien aux enfants',
      'Curieux et joueur, apprécie l\'interaction',
      'Peu stressé, supporte bien les manipulations',
    ],
    particularites: [
      'Fourrure courte, veloutée et dense — mutation génétique unique',
      'Pattes courtes avec des griffes recourbées — à surveiller',
      'Peau sensible aux abrasions (sols trop durs à éviter)',
      'Mini Rex : version réduite 1,5-2kg, même fourrure veloutée',
    ],
    alimentation: [
      'Foin de qualité indispensable, de préférence timothy ou orchard',
      'Grande quantité de verdure fraîche pour maintenir le transit',
      'Granulés limités : 25-30g/kg de poids corporel',
      'Surveiller les signes de stase (transit plus fragile que la moyenne)',
    ],
    soins: [
      'Brossage minimal grâce à la fourrure courte : 1x/quinzaine',
      'Vérifier les griffes recourbées toutes les 4-6 semaines',
      'Sol souple recommandé (tapis, tissu épais) pour les pattes',
      'Vaccins annuels myxomatose + VHD particulièrement importants',
    ],
  },
  {
    id: 'angora',
    nom: 'Angora',
    emoji: '☁️',
    taille: 'Moyen',
    poids: '2,5 – 4 kg',
    esperanceVie: '7 – 12 ans',
    caractere: [
      'Doux, placide et très affectueux',
      'Aime la compagnie humaine, peu agressif',
      'Moins actif que les races courtes, plus contemplatif',
      'Idéal pour les propriétaires patients et attentionnés',
    ],
    particularites: [
      'Fourrure extrêmement longue (5-15cm) qui pousse continuellement',
      'Risque élevé de fécalomes (boules de poils dans le tube digestif)',
      'Tonte obligatoire toutes les 8-12 semaines',
      'Variétés : Angora anglais, français, géant, satiné...',
    ],
    alimentation: [
      'Foin impératif pour éliminer les poils ingérés lors du toilettage',
      'Papaye fraîche ou comprimés de papaïne pour prévenir les fécalomes',
      'Régime riche en fibres longues (herbes sauvages, pissenlit)',
      'Éviter les aliments humides qui collent dans la fourrure',
    ],
    soins: [
      'Brossage quotidien obligatoire pour éviter les nœuds',
      'Tonte 4-6 fois par an — à confier à un professionnel NAC si débutant',
      'Contrôle des zones sensibles : ventre, pattes, derrière les oreilles',
      'Hygiène autour du derrière : surveiller les souillures pouvant causer myiases',
    ],
  },
  {
    id: 'geant-des-flandres',
    nom: 'Géant des Flandres',
    emoji: '🐘',
    taille: 'Très grand',
    poids: '6 – 10 kg',
    esperanceVie: '5 – 8 ans',
    caractere: [
      'Très calme, posé et affectueux malgré sa taille',
      'Excellent avec les enfants, peu nerveux',
      'Besoin important d\'espace et d\'exercice quotidien',
      'Particulièrement intelligent, peut apprendre des tours simples',
    ],
    particularites: [
      'Une des plus grandes races, peut atteindre la taille d\'un petit chien',
      'Espérance de vie plus courte que les races naines (métabolisme)',
      'Tendance aux problèmes articulaires avec l\'âge',
      'Pattes postérieures très puissantes — manipulation avec précaution',
    ],
    alimentation: [
      'Rations importantes : 300-500g de verdure fraîche par jour',
      'Foin en quantité très importante — renouveler plusieurs fois/jour',
      'Granulés : 50-80g par jour selon l\'activité',
      'Hydratation essentielle : gamelle large et toujours remplie',
    ],
    soins: [
      'Enclos d\'au minimum 4-6m² avec accès libre plusieurs heures/jour',
      'Litière épaisse pour protéger les articulations',
      'Brossage hebdomadaire — pertes de poils importantes',
      'Suivi vétérinaire régulier pour les articulations dès 4 ans',
    ],
  },
  {
    id: 'hollandais',
    nom: 'Lapin hollandais (Dutch)',
    emoji: '🎭',
    taille: 'Petit',
    poids: '1,5 – 2,5 kg',
    esperanceVie: '8 – 12 ans',
    caractere: [
      'Très sociable, joueur et énergique',
      'Facile à apprivoiser, bon pour les débutants',
      'Aime être en groupe ou en duo',
      'Curieux et espiègle — a besoin de jeux et d\'exploration',
    ],
    particularites: [
      'Reconnaissable à son pelage bicolore avec le blanc sur la moitié avant',
      'Race ancienne et robuste, peu de problèmes génétiques',
      'Taille idéale pour un appartement avec sorties régulières',
      'Très commune en Europe, facile à trouver chez des éleveurs sérieux',
    ],
    alimentation: [
      'Alimentation standard : foin, légumes verts, peu de granulés',
      'Apprécie particulièrement les herbes fraîches (persil, coriandre)',
      'Friandises légumes occasionnelles : carottes, pomme sans pépin',
      'Éviter les mélanges graines du commerce qui favorisent le tri',
    ],
    soins: [
      'Entretien facile : brossage 1x/semaine',
      'Race robuste, peu de prédispositions particulières',
      'Stérilisation recommandée pour améliorer le comportement',
      'Sorties quotidiennes importantes pour l\'équilibre psychologique',
    ],
  },
  {
    id: 'fauve-de-bourgogne',
    nom: 'Fauve de Bourgogne',
    emoji: '🦊',
    taille: 'Moyen',
    poids: '3 – 4 kg',
    esperanceVie: '7 – 10 ans',
    caractere: [
      'Calme, équilibré et très doux',
      'Facile à apprivoiser, s\'habitue rapidement à la maison',
      'Aime l\'exploration mais reste proche de son propriétaire',
      'Bon avec les enfants, peu mordeur',
    ],
    particularites: [
      'Pelage court d\'un roux vif caractéristique (couleur fauve)',
      'Race française ancienne, origine du XIXe siècle en Bourgogne',
      'Très robuste et peu sujet aux maladies héréditaires',
      'Poils courts et brillants, entretien minimal',
    ],
    alimentation: [
      'Appétit vigoureux — surveiller les portions pour éviter l\'obésité',
      'Foin à volonté, verdure fraîche variée quotidienne',
      'Particulièrement friand de pissenlit et de feuilles de framboisier',
      'Granulés de qualité : 25-30g/kg/jour maximum',
    ],
    soins: [
      'Brossage simple 1x/semaine suffit',
      'Robuste : moins de problèmes de santé que les races naines',
      'Grand besoin d\'espace et d\'exercice malgré l\'apparence calme',
      'Convient parfaitement à une vie en extérieur sécurisé (étable, clapier spacieux)',
    ],
  },
  {
    id: 'lionhead',
    nom: 'Lionhead (Tête de lion)',
    emoji: '🦁',
    taille: 'Petit',
    poids: '1,2 – 1,8 kg',
    esperanceVie: '7 – 10 ans',
    caractere: [
      'Énergique, joueur et très expressif',
      'Peut être timide au départ, mais très affectueux une fois confiant',
      'Aime les jeux interactifs et les jouets à mâcher',
      'Bien dans un duo avec un congénère de même taille',
    ],
    particularites: [
      'Crinière de poils longs autour de la tête, corps plus court et plus court',
      'Mutation génétique du gène "mane" responsable de la crinière',
      'Deux types : single mane (crinière s\'éclaircit avec l\'âge) et double mane',
      'Race récente, reconnue officiellement aux USA en 2014',
    ],
    alimentation: [
      'Alimentation identique aux autres petites races',
      'Foin impératif pour éliminer les poils de la crinière ingérés',
      'Papaye fraîche recommandée pour prévenir les fécalomes (crinière)',
      'Verdure fraîche : 80-100g par jour',
    ],
    soins: [
      'Brossage de la crinière 3-4x par semaine pour éviter les nœuds',
      'Vérifier la zone derrière les oreilles, sujette aux feutres',
      'Contrôle dentaire : petite tête = risque de malocclusion',
      'Tonte légère autour du derrière si les poils sont très longs',
    ],
  },
  {
    id: 'californien',
    nom: 'Lapin de Californie',
    emoji: '🤍',
    taille: 'Grand',
    poids: '3,5 – 4,5 kg',
    esperanceVie: '5 – 10 ans',
    caractere: [
      'Calme et placide en général',
      'Peut être timide, préfère les environnements stables et tranquilles',
      'Devient très doux et affectueux avec le temps et la confiance',
      'Moins démonstratif que d\'autres races, mais très fidèle',
    ],
    particularites: [
      'Pelage blanc avec les extrémités noires ou brunes (points de couleur : nez, oreilles, pattes, queue)',
      'Ressemble au chat siamois pour les marques de couleur',
      'Race créée aux États-Unis au début du XXe siècle',
      'Yeux roses caractéristiques (albinisme partiel)',
    ],
    alimentation: [
      'Grands besoins : foin à volonté + 150-200g de légumes verts/jour',
      'Granulés de bonne qualité : 30-40g/jour maximum',
      'Attention à la chaleur : les marques foncées apparaissent plus sur les lapins exposés au froid',
      'Éviter les aliments très colorants qui peuvent ternir le pelage blanc',
    ],
    soins: [
      'Brossage 1-2x par semaine',
      'Pelage blanc : surveiller la propreté du dessous (taches urinaires)',
      'Yeux sensibles : vérifier régulièrement les sécrétions',
      'Besoin d\'espace conséquent et de sorties longues',
    ],
  },
]

export default function RacesPage() {
  const navigate = useNavigate()
  const [openRace, setOpenRace] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? RACES.filter(r =>
        r.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .includes(search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      )
    : RACES

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>🐇</span>
        <h1 className={styles.title}>Lexique des races</h1>
        <p className={styles.subtitle}>{RACES.length} races de lapins domestiques</p>
      </div>

      <div className={styles.searchWrap}>
        <input
          type="text"
          placeholder="Rechercher une race…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.list}>
        {filtered.map(race => {
          const isOpen = openRace === race.id
          return (
            <div key={race.id} className={`${styles.card} ${isOpen ? styles.cardOpen : ''}`}>
              <button className={styles.cardHeader} onClick={() => setOpenRace(isOpen ? null : race.id)}>
                <span className={styles.cardEmoji}>{race.emoji}</span>
                <div className={styles.cardMeta}>
                  <span className={styles.cardNom}>{race.nom}</span>
                  <div className={styles.cardTags}>
                    <span className={styles.tag}>{race.taille}</span>
                    <span className={styles.tag}>{race.poids}</span>
                    <span className={styles.tag}>⏳ {race.esperanceVie}</span>
                  </div>
                </div>
                <svg
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {isOpen && (
                <div className={styles.cardBody}>
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>😊 Caractère</h3>
                    <ul className={styles.ul}>
                      {race.caractere.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>✨ Particularités</h3>
                    <ul className={styles.ul}>
                      {race.particularites.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>🥬 Alimentation</h3>
                    <ul className={styles.ul}>
                      {race.alimentation.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>🪮 Soins</h3>
                    <ul className={styles.ul}>
                      {race.soins.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className={styles.noResult}>Aucune race trouvée.</p>
        )}
      </div>

      <button className={styles.comparateurLink} onClick={() => navigate('/comparateur-races')}>
        <span>⚖️</span>
        <div>
          <span className={styles.comparateurLinkTitle}>Comparer 2 races</span>
          <span className={styles.comparateurLinkSub}>Tableau comparatif côte à côte</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
          <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  )
}
