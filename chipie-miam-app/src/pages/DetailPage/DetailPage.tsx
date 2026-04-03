import { useParams, useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import { useCustomImages } from '../../hooks/useCustomImages'
import { useJournal } from '../../hooks/useJournal'
import RestrictionBadge from '../../components/RestrictionBadge/RestrictionBadge'
import styles from './DetailPage.module.css'

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const [showImageEdit, setShowImageEdit] = useState(false)
  const { getImage, setImage } = useCustomImages()
  const { entries } = useJournal()

  const vegetal = VEGETAUX.find((v) => v.id === id)
  if (!vegetal) {
    return (
      <div className={styles.notFound}>
        <p>Aliment introuvable</p>
        <button onClick={() => navigate('/')}>Retour au guide</button>
      </div>
    )
  }

  const categorie = CATEGORIES.find((c) => c.id === vegetal.categorie)
  const imageUrl = getImage(vegetal.id, vegetal.image)
  const [editUrl, setEditUrl] = useState(imageUrl)

  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(vegetal.nom + ' plante lapin')}`

  // Count how many times this vegetal was logged
  const logCount = useMemo(() => entries.filter(e => e.vegetalId === vegetal.id).length, [entries, vegetal.id])

  const handleImageSave = () => {
    setImage(vegetal.id, editUrl)
    setShowImageEdit(false)
    setImgError(false)
  }

  const sugarLabel = vegetal.niveauSucre === 'eleve' ? 'Élevé' : vegetal.niveauSucre === 'moyen' ? 'Moyen' : 'Faible'

  const restrictionTip = vegetal.restriction === 'aucune'
    ? 'Cet aliment peut être donné sans restriction particulière.'
    : vegetal.restriction === 'petite_quantite'
      ? 'À donner en petite quantité uniquement.'
      : 'Cet aliment est à éviter.'

  return (
    <div className={styles.page}>
      {/* Hero image with name overlay */}
      <div className={styles.heroWrap}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>

        <button className={styles.editImgBtn} onClick={() => { setEditUrl(imageUrl); setShowImageEdit(!showImageEdit) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </button>

        {!imgError ? (
          <img src={imageUrl} alt={vegetal.nom} className={styles.hero} onError={() => setImgError(true)} />
        ) : (
          <div className={styles.heroPlaceholder}>🌿</div>
        )}
        <div className={styles.heroOverlay} />

        {/* Name on hero */}
        <div className={styles.heroText}>
          <h1 className={styles.heroName}>{vegetal.nom}</h1>
          <p className={styles.heroLatin}>{vegetal.nomLatin}</p>
        </div>
      </div>

      {/* Image edit bar */}
      {showImageEdit && (
        <div className={styles.imageEditBar}>
          <input type="text" value={editUrl} onChange={(e) => setEditUrl(e.target.value)}
            placeholder="URL de l'image…" className={styles.imageInput} autoFocus />
          <button className={styles.imageOk} onClick={handleImageSave}>OK</button>
          <button className={styles.imageCancel} onClick={() => setShowImageEdit(false)}>✕</button>
        </div>
      )}

      {/* Floating quick-info card */}
      <div className={styles.quickCard}>
        <div className={styles.quickLeft}>
          <RestrictionBadge restriction={vegetal.restriction} />
          {categorie && (
            <div className={styles.catBadge}>
              <span>{categorie.emoji}</span>
              <span>{categorie.nom}</span>
            </div>
          )}
        </div>
        <div className={styles.quickRight}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{logCount}</span>
            <span className={styles.statLabel}>fois donné</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>

        {/* Tip banner */}
        <div className={`${styles.tipBanner} ${styles[`tip_${vegetal.restriction}`]}`}>
          <svg className={styles.tipIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <span>{restrictionTip}</span>
        </div>

        {/* Notes */}
        {vegetal.notes && (
          <div className={styles.section}>
            <div className={styles.sectionBar} />
            <div className={styles.sectionContent}>
              <h2 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
                Notes
              </h2>
              <p className={styles.sectionText}>{vegetal.notes}</p>
            </div>
          </div>
        )}

        {/* Info grid */}
        {vegetal.niveauSucre && (
          <div className={styles.section}>
            <div className={styles.sectionBar} />
            <div className={styles.sectionContent}>
              <h2 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
                </svg>
                Informations
              </h2>
              <div className={styles.infoGrid}>
                <div className={`${styles.infoCard} ${styles[`sugar_${vegetal.niveauSucre}`]}`}>
                  <span className={styles.infoEmoji}>🍬</span>
                  <span className={styles.infoLabel}>Sucre</span>
                  <span className={styles.infoValue}>{sugarLabel}</span>
                  <div className={styles.sugarBar}>
                    <div className={`${styles.sugarFill} ${styles[`sugarFill_${vegetal.niveauSucre}`]}`} />
                  </div>
                </div>
                {vegetal.frequenceRecommandee && (
                  <div className={styles.infoCard}>
                    <span className={styles.infoEmoji}>📅</span>
                    <span className={styles.infoLabel}>Fréquence</span>
                    <span className={styles.infoValue}>{vegetal.frequenceRecommandee}</span>
                  </div>
                )}
                {vegetal.saisonnalite && (
                  <div className={styles.infoCard}>
                    <span className={styles.infoEmoji}>☀️</span>
                    <span className={styles.infoLabel}>Saison</span>
                    <span className={styles.infoValue}>{vegetal.saisonnalite}</span>
                  </div>
                )}
                <div className={styles.infoCard}>
                  <span className={styles.infoEmoji}>📊</span>
                  <span className={styles.infoLabel}>Catégorie</span>
                  <span className={styles.infoValue}>{categorie?.nom || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nutritional details */}
        {vegetal.infosNutritionnelles && (
          <div className={styles.section}>
            <div className={styles.sectionBar} />
            <div className={styles.sectionContent}>
              <h2 className={styles.sectionTitle}>
                <svg className={styles.sectionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
                Détails nutritionnels
              </h2>
              <p className={styles.sectionText}>{vegetal.infosNutritionnelles}</p>
            </div>
          </div>
        )}

        {/* Google Images */}
        <a href={googleImagesUrl} target="_blank" rel="noopener noreferrer" className={styles.googleBtn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Rechercher sur Google Images
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
            <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </div>
    </div>
  )
}
