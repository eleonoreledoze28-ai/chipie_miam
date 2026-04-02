import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { VEGETAUX, CATEGORIES } from '../../data/vegetaux'
import { useCustomImages } from '../../hooks/useCustomImages'
import RestrictionBadge from '../../components/RestrictionBadge/RestrictionBadge'
import styles from './DetailPage.module.css'

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const [showImageEdit, setShowImageEdit] = useState(false)
  const { getImage, setImage } = useCustomImages()

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

  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(vegetal.nom + ' plante')}`

  const handleImageSave = () => {
    setImage(vegetal.id, editUrl)
    setShowImageEdit(false)
    setImgError(false)
  }

  const sugarLabel = vegetal.niveauSucre === 'eleve' ? 'Elevé' : vegetal.niveauSucre === 'moyen' ? 'Moyen' : 'Faible'

  return (
    <div className={styles.page}>
      {/* Hero image */}
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
      </div>

      {/* Image edit bar */}
      {showImageEdit && (
        <div className={styles.imageEditBar}>
          <input
            type="text"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="URL de l'image…"
            className={styles.imageInput}
            autoFocus
          />
          <button className={styles.imageOk} onClick={handleImageSave}>OK</button>
          <button className={styles.imageCancel} onClick={() => setShowImageEdit(false)}>✕</button>
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {/* Title + latin */}
        <div className={styles.titleBlock}>
          <h1 className={styles.name}>{vegetal.nom}</h1>
          <p className={styles.latin}>{vegetal.nomLatin}</p>
        </div>

        {/* Badges: restriction + categorie */}
        <div className={styles.badges}>
          <RestrictionBadge restriction={vegetal.restriction} />
          {categorie && (
            <div className={styles.catBadge}>
              <span>{categorie.emoji}</span>
              <span>{categorie.nom}</span>
            </div>
          )}
        </div>

        {/* Notes card */}
        {vegetal.notes && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
              <span className={styles.cardTitle}>Notes</span>
            </div>
            <p className={styles.cardText}>{vegetal.notes}</p>
          </div>
        )}

        {/* Info card */}
        {vegetal.niveauSucre && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              <span className={styles.cardTitle}>Informations</span>
            </div>
            <div className={styles.infoGrid}>
              <div className={`${styles.infoItem} ${styles[`sugar_${vegetal.niveauSucre}`]}`}>
                <span className={styles.infoLabel}>Niveau de sucre</span>
                <span className={styles.infoValue}>{sugarLabel}</span>
                <div className={styles.sugarBar}>
                  <div className={`${styles.sugarFill} ${styles[`sugarFill_${vegetal.niveauSucre}`]}`} />
                </div>
              </div>
              {vegetal.frequenceRecommandee && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Frequence</span>
                  <span className={styles.infoValue}>{vegetal.frequenceRecommandee}</span>
                </div>
              )}
              {vegetal.saisonnalite && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Saisonnalite</span>
                  <span className={styles.infoValue}>{vegetal.saisonnalite}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nutritional details card */}
        {vegetal.infosNutritionnelles && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
              <span className={styles.cardTitle}>Details nutritionnels</span>
            </div>
            <p className={styles.cardText}>{vegetal.infosNutritionnelles}</p>
          </div>
        )}

        {/* Google Images link */}
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
