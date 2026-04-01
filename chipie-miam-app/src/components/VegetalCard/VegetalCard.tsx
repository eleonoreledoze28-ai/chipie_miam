import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { Vegetal } from '../../data/vegetaux'
import styles from './VegetalCard.module.css'

interface Props {
  vegetal: Vegetal
  imageUrl: string
  todayCount: number
  onAddToJournal: (vegetalId: string) => void
  onChangeImage: (vegetalId: string, url: string) => void
}

function shortNote(v: Vegetal): string {
  if (v.restriction === 'a_eviter') return '(à éviter)'
  if (v.restriction === 'petite_quantite') return '(petites doses)'
  return ''
}

export default function VegetalCard({ vegetal, imageUrl, todayCount, onAddToJournal, onChangeImage }: Props) {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const [showImageEdit, setShowImageEdit] = useState(false)
  const [editUrl, setEditUrl] = useState('')
  const note = shortNote(vegetal)

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAddToJournal(vegetal.id)
  }

  const handleMoreInfo = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/detail/${vegetal.id}`)
  }

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditUrl(imageUrl)
    setShowImageEdit(true)
  }

  const handleImageSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChangeImage(vegetal.id, editUrl)
    setShowImageEdit(false)
    setImgError(false)
  }

  const handleImageCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowImageEdit(false)
  }

  const hasCount = todayCount > 0

  return (
    <div className={styles.cardWrap}>
      <div className={`${styles.card} ${hasCount ? styles.cardGiven : ''}`}>
        {/* Bouton "ajouter au journal" avec compteur */}
        <button
          className={`${styles.addBtn} ${hasCount ? styles.addBtnActive : ''}`}
          onClick={handleAddClick}
          title="Ajouter au journal d'aujourd'hui"
        >
          {hasCount ? (
            <span className={styles.countBadge}>{todayCount}</span>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
              <path d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          )}
        </button>

        {/* Thumbnail (click to edit URL) */}
        <button className={styles.thumbWrap} onClick={handleImageClick} title="Changer l'image">
          {!imgError ? (
            <img
              src={imageUrl}
              alt={vegetal.nom}
              className={styles.thumb}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={styles.thumbPlaceholder}>🌿</div>
          )}
          <div className={styles.editOverlay}>✎</div>
        </button>

        {/* Label + note */}
        <div className={styles.labelArea}>
          <span className={styles.label}>
            {vegetal.nom}
            {note && <span className={styles.note}> {note}</span>}
          </span>
        </div>

        {/* "Plus d'infos" button */}
        <button className={styles.moreBtn} onClick={handleMoreInfo}>
          Plus d'infos
        </button>
      </div>

      {/* Image URL edit popup */}
      {showImageEdit && (
        <div className={styles.imageEditRow} onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            className={styles.imageInput}
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="URL de l'image…"
            autoFocus
          />
          <button className={styles.imageOk} onClick={handleImageSave}>OK</button>
          <button className={styles.imageCancel} onClick={handleImageCancel}>✕</button>
        </div>
      )}
    </div>
  )
}
