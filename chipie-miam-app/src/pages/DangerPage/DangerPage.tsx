import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import styles from './DangerPage.module.css'

const catMap = new Map(CATEGORIES.map(c => [c.id, c]))

// Common toxic foods for rabbits (not in database)
const TOXIC_FOODS = [
  { nom: 'Pomme de terre', emoji: '🥔', raison: 'Contient de la solanine, toxique pour les lapins. Crue ou cuite, elle est dangereuse.' },
  { nom: 'Oignon / Ail', emoji: '🧅', raison: 'Detruisent les globules rouges et provoquent une anemie grave.' },
  { nom: 'Avocat', emoji: '🥑', raison: 'La persine contenue dans la chair et le noyau est mortelle pour les lapins.' },
  { nom: 'Chocolat', emoji: '🍫', raison: 'La theobromine est extremement toxique, meme en petite quantite.' },
  { nom: 'Rhubarbe', emoji: '🌿', raison: 'Contient de l\'acide oxalique en grande quantite, toxique pour les reins.' },
  { nom: 'Laitue iceberg', emoji: '🥬', raison: 'Contient du lactucarium, un sedatif dangereux. Preferer les laitues feuilles.' },
  { nom: 'Haricots / Pois crus', emoji: '🫘', raison: 'Les legumineuses crues causent des ballonnements graves et potentiellement mortels.' },
  { nom: 'Pain / Cereales', emoji: '🍞', raison: 'Les glucides complexes fermentent dans l\'intestin et causent des blocages digestifs.' },
  { nom: 'Noyaux / Pepins', emoji: '🍒', raison: 'Contiennent du cyanure. Les fruits sont OK sans noyaux ni pepins.' },
  { nom: 'Muguet', emoji: '🌷', raison: 'Plante extremement toxique meme en petite quantite. Provoque arret cardiaque.' },
  { nom: 'Laurier', emoji: '🌿', raison: 'Toutes les parties sont toxiques et provoquent des troubles digestifs graves.' },
  { nom: 'If', emoji: '🌲', raison: 'Mortel meme en tres petite quantite. Toutes les parties sont toxiques.' },
]

const EMERGENCY_TIPS = [
  { emoji: '🚨', title: 'Symptomes d\'intoxication', text: 'Diarrhee, lethargie, refus de manger, tremblements, salivation excessive, gonflements abdominaux.' },
  { emoji: '⏰', title: 'Agir vite', text: 'Si vous suspectez une intoxication, consultez un veterinaire en urgence dans l\'heure.' },
  { emoji: '📞', title: 'Urgence veterinaire', text: 'Gardez toujours le numero de votre veterinaire et des urgences veterinaires a portee.' },
  { emoji: '🚫', title: 'Ne pas faire vomir', text: 'Contrairement aux chiens, ne jamais faire vomir un lapin. Cela peut aggraver la situation.' },
]

export default function DangerPage() {
  const navigate = useNavigate()

  const dangerFoods = useMemo(() =>
    VEGETAUX.filter(v => v.restriction === 'a_eviter').map(v => ({
      ...v,
      cat: catMap.get(v.categorie),
    })), [])

  const cautionFoods = useMemo(() =>
    VEGETAUX.filter(v => v.restriction === 'petite_quantite' && v.image && !v.image.includes('placeholder')).map(v => ({
      ...v,
      cat: catMap.get(v.categorie),
    })), [])

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>⚠️</span>
        <h1 className={styles.title}>Aliments dangereux</h1>
        <p className={styles.subtitle}>Ce que Chipie ne doit JAMAIS manger</p>
      </div>

      {/* Emergency tips */}
      <div className={styles.emergencySection}>
        <h2 className={styles.sectionTitle}>🚨 En cas d'urgence</h2>
        <div className={styles.emergencyGrid}>
          {EMERGENCY_TIPS.map((tip, i) => (
            <div key={i} className={styles.emergencyCard}>
              <span className={styles.emergencyEmoji}>{tip.emoji}</span>
              <div className={styles.emergencyInfo}>
                <span className={styles.emergencyTitle}>{tip.title}</span>
                <span className={styles.emergencyText}>{tip.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aliments a eviter from database */}
      {dangerFoods.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>❌ Aliments a eviter (dans le guide)</h2>
          <div className={styles.foodList}>
            {dangerFoods.map(v => (
              <div key={v.id} className={styles.dangerCard}>
                <img src={assetUrl(v.image)} alt="" className={styles.foodImg} />
                <div className={styles.foodInfo}>
                  <span className={styles.foodName}>{v.nom}</span>
                  <span className={styles.foodCat}>{v.cat?.emoji} {v.cat?.nom}</span>
                  <span className={styles.foodNotes}>{v.notes}</span>
                </div>
                <span className={styles.dangerBadge}>❌</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toxic foods not in database */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>☠️ Aliments et plantes toxiques</h2>
        <p className={styles.sectionDesc}>Ces aliments courants ne figurent pas dans le guide car ils ne doivent JAMAIS etre donnes a un lapin.</p>
        <div className={styles.toxicList}>
          {TOXIC_FOODS.map((item, i) => (
            <div key={i} className={styles.toxicCard}>
              <span className={styles.toxicEmoji}>{item.emoji}</span>
              <div className={styles.toxicInfo}>
                <span className={styles.toxicName}>{item.nom}</span>
                <span className={styles.toxicReason}>{item.raison}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Caution foods */}
      {cautionFoods.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>⚠️ A donner avec moderation</h2>
          <p className={styles.sectionDesc}>Ces aliments sont acceptables en petite quantite mais peuvent causer des problemes en exces.</p>
          <div className={styles.cautionGrid}>
            {cautionFoods.slice(0, 12).map(v => (
              <div key={v.id} className={styles.cautionCard}>
                <img src={assetUrl(v.image)} alt="" className={styles.cautionImg} />
                <span className={styles.cautionName}>{v.nom}</span>
                <span className={styles.cautionBadge}>⚠️</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety reminder */}
      <div className={styles.safetyCard}>
        <span className={styles.safetyEmoji}>🐰</span>
        <p className={styles.safetyText}>
          En cas de doute sur un aliment, <strong>ne le donnez pas</strong>. Consultez toujours votre veterinaire avant d'introduire un nouvel aliment dans l'alimentation de votre lapin.
        </p>
      </div>
    </div>
  )
}
