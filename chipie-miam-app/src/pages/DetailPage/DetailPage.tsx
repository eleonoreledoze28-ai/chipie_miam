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

  return (
    <div className={styles.page}>
      {/* Header image */}
      <div className={styles.heroWrap}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Edit image button */}
        <button className={styles.editImgBtn} onClick={() => { setEditUrl(imageUrl); setShowImageEdit(!showImageEdit) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </button>

        {!imgError ? (
          <img
            src={imageUrl}
            alt={vegetal.nom}
            className={styles.hero}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.heroPlaceholder}>🌿</div>
        )}
        <div className={styles.heroOverlay} />
      </div>

      {/* Image edit popup */}
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
        <div className={styles.titleRow}>
          <h1 className={styles.name}>{vegetal.nom}</h1>
          <RestrictionBadge restriction={vegetal.restriction} />
        </div>

        <p className={styles.latin}>{vegetal.nomLatin}</p>

        {categorie && (
          <div className={styles.catBadge}>
            <span>{categorie.emoji}</span>
            <span>{categorie.nom}</span>
          </div>
        )}

        {/* Google Images button */}
        <a
          href={googleImagesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.googleBtn}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Rechercher sur Google Images
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>

        {/* Notes */}
        {vegetal.notes && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Notes</h2>
            <p className={styles.notes}>{vegetal.notes}</p>
          </div>
        )}

        {/* Infos nutritionnelles */}
        {vegetal.niveauSucre && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Informations</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Niveau de sucre</span>
                <span className={`${styles.infoValue} ${styles[`sugar_${vegetal.niveauSucre}`]}`}>
                  {vegetal.niveauSucre === 'eleve' ? 'Élevé' : vegetal.niveauSucre === 'moyen' ? 'Moyen' : 'Faible'}
                </span>
              </div>
              {vegetal.frequenceRecommandee && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Fréquence</span>
                  <span className={styles.infoValue}>{vegetal.frequenceRecommandee}</span>
                </div>
              )}
              {vegetal.saisonnalite && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Saisonnalité</span>
                  <span className={styles.infoValue}>{vegetal.saisonnalite}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {vegetal.infosNutritionnelles && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Détails nutritionnels</h2>
            <p className={styles.notes}>{vegetal.infosNutritionnelles}</p>
          </div>
        )}
      </div>
    </div>
  )
}
