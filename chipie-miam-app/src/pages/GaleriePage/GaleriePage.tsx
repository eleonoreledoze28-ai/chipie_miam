import { useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveProfileId } from '../../hooks/useProfiles'
import { useProfil } from '../../hooks/useProfil'
import styles from './GaleriePage.module.css'

// ── Types ────────────────────────────────────────────────────────────────────
interface Photo {
  id: string
  dataUrl: string
  caption: string
  date: string // YYYY-MM-DD
}

// ── Persistence ───────────────────────────────────────────────────────────────
function storageKey() { return `chipie-galerie-${getActiveProfileId()}` }

function loadPhotos(): Photo[] {
  try {
    const raw = localStorage.getItem(storageKey())
    return raw ? JSON.parse(raw) as Photo[] : []
  } catch { return [] }
}

function savePhotos(list: Photo[]) {
  localStorage.setItem(storageKey(), JSON.stringify(list))
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function formatDateFr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const months = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.']
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`
}

const MONTHS_LONG = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function formatMonthGroup(ym: string): string {
  const [y, m] = ym.split('-')
  return `${MONTHS_LONG[parseInt(m, 10) - 1]} ${y}`
}

// Âge à une date donnée, ex. "3 mois" ou "1 an et 2 mois". '' si la date précède la naissance.
function ageAt(birth: string, date: string): string {
  if (!birth || date < birth) return ''
  const [by, bm, bd] = birth.split('-').map(Number)
  const [y, m, d] = date.split('-').map(Number)
  let months = (y - by) * 12 + (m - bm)
  if (d < bd) months--
  if (months < 1) return "moins d'un mois"
  const years = Math.floor(months / 12)
  const rest = months % 12
  const yPart = years > 0 ? `${years} an${years > 1 ? 's' : ''}` : ''
  const mPart = rest > 0 ? `${rest} mois` : ''
  return [yPart, mPart].filter(Boolean).join(' et ')
}

function byDateDesc(a: Photo, b: Photo): number {
  return b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
}

// ── Image resize ──────────────────────────────────────────────────────────────
function resizeImage(file: File, maxWidth = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject
    img.src = url
  })
}

// ── Component ────────────────────────────────────────────────────────────────
export default function GaleriePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [photos, setPhotos] = useState<Photo[]>(loadPhotos)
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [date, setDate] = useState(todayStr())
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'grille' | 'chrono'>('grille')
  const [monthFilter, setMonthFilter] = useState('')

  const sorted = useMemo(() => [...photos].sort(byDateDesc), [photos])

  const months = useMemo(
    () => [...new Set(sorted.map(p => p.date.slice(0, 7)))],
    [sorted],
  )

  const shown = useMemo(
    () => monthFilter ? sorted.filter(p => p.date.startsWith(monthFilter)) : sorted,
    [sorted, monthFilter],
  )

  const groups = useMemo(() => {
    const map = new Map<string, Photo[]>()
    shown.forEach(p => {
      const key = p.date.slice(0, 7)
      map.set(key, [...(map.get(key) ?? []), p])
    })
    return [...map.entries()]
  }, [shown])

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setLoading(true)
    try {
      const dataUrl = await resizeImage(file)
      setPendingDataUrl(dataUrl)
      setCaption('')
      setDate(todayStr())
      setShowAddModal(true)
    } catch {
      alert("Impossible de charger cette photo.")
    } finally {
      setLoading(false)
    }
  }, [])

  const savePhoto = useCallback(() => {
    if (!pendingDataUrl) return
    const newPhoto: Photo = {
      id: Date.now().toString(),
      dataUrl: pendingDataUrl,
      caption: caption.trim(),
      date,
    }
    setPhotos(prev => {
      const next = [newPhoto, ...prev]
      savePhotos(next)
      return next
    })
    setShowAddModal(false)
    setPendingDataUrl(null)
  }, [pendingDataUrl, caption, date])

  const deletePhoto = useCallback((id: string) => {
    if (!confirm('Supprimer cette photo ?')) return
    setPhotos(prev => {
      const next = prev.filter(p => p.id !== id)
      savePhotos(next)
      return next
    })
    setLightbox(null)
  }, [])

  return (
    <div className={styles.page}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.hiddenInput}
        onChange={handleFileChange}
      />

      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
        <button className={styles.addBtn} onClick={openFilePicker} disabled={loading}>
          {loading ? '…' : '+ Photo'}
        </button>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerEmoji}>📸</span>
        <div>
          <h1 className={styles.title}>Galerie de Chipie</h1>
          <p className={styles.subtitle}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* View + month filter */}
      {photos.length > 0 && (
        <div className={styles.controls}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${view === 'grille' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('grille')}
            >
              Grille
            </button>
            <button
              className={`${styles.viewBtn} ${view === 'chrono' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('chrono')}
            >
              Chronologie
            </button>
          </div>
          <select
            className={styles.monthSelect}
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            aria-label="Filtrer par mois"
          >
            <option value="">Toutes les dates</option>
            {months.map(ym => (
              <option key={ym} value={ym}>{formatMonthGroup(ym)}</option>
            ))}
          </select>
        </div>
      )}

      {photos.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🐰</span>
          <p>Aucune photo pour l'instant</p>
          <button className={styles.emptyBtn} onClick={openFilePicker}>
            Ajouter une photo
          </button>
        </div>
      ) : view === 'grille' ? (
        <div className={styles.grid}>
          {shown.map(photo => (
            <div key={photo.id} className={styles.gridItem} onClick={() => setLightbox(photo)}>
              <img src={photo.dataUrl} alt={photo.caption || 'Photo de Chipie'} className={styles.thumb} />
              {photo.caption && (
                <div className={styles.thumbCaption}>{photo.caption}</div>
              )}
              <div className={styles.thumbDate}>{formatDateFr(photo.date)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.timeline}>
          {groups.map(([ym, list]) => {
            const age = profil.dateNaissance ? ageAt(profil.dateNaissance, list[0].date) : ''
            return (
              <section key={ym} className={styles.group}>
                <h2 className={styles.groupTitle}>
                  {formatMonthGroup(ym)}
                  {age && <span className={styles.groupAge}>{profil.nom} avait {age}</span>}
                </h2>
                <div className={styles.grid}>
                  {list.map(photo => (
                    <div key={photo.id} className={styles.gridItem} onClick={() => setLightbox(photo)}>
                      <img src={photo.dataUrl} alt={photo.caption || 'Photo de Chipie'} className={styles.thumb} />
                      {photo.caption && (
                        <div className={styles.thumbCaption}>{photo.caption}</div>
                      )}
                      <div className={styles.thumbDate}>{formatDateFr(photo.date)}</div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className={styles.lightboxOverlay} onClick={() => setLightbox(null)}>
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <img src={lightbox.dataUrl} alt={lightbox.caption || 'Photo'} className={styles.lightboxImg} />
            <div className={styles.lightboxInfo}>
              {lightbox.caption && <p className={styles.lightboxCaption}>{lightbox.caption}</p>}
              <p className={styles.lightboxDate}>
                {formatDateFr(lightbox.date)}
                {profil.dateNaissance && ageAt(profil.dateNaissance, lightbox.date) && ` · ${ageAt(profil.dateNaissance, lightbox.date)}`}
              </p>
            </div>
            <div className={styles.lightboxActions}>
              <button className={styles.lightboxClose} onClick={() => setLightbox(null)}>Fermer</button>
              <button className={styles.lightboxDelete} onClick={() => deletePhoto(lightbox.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAddModal && pendingDataUrl && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Nouvelle photo</span>
              <button className={styles.modalClose} onClick={() => { setShowAddModal(false); setPendingDataUrl(null) }}>✕</button>
            </div>
            <img src={pendingDataUrl} alt="Aperçu" className={styles.preview} />
            <label className={styles.formLabel}>Légende (optionnel)</label>
            <input
              type="text"
              className={styles.formInput}
              value={caption}
              placeholder="Chipie mange sa carotte…"
              onChange={e => setCaption(e.target.value)}
              maxLength={80}
            />
            <label className={styles.formLabel}>Date</label>
            <input
              type="date"
              className={styles.formInput}
              value={date}
              max={todayStr()}
              onChange={e => setDate(e.target.value)}
            />
            <button className={styles.submitBtn} onClick={savePhoto}>
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
