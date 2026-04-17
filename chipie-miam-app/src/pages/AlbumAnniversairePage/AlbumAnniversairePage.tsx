import { useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import { getActiveProfileId } from '../../hooks/useProfiles'
import styles from './AlbumAnniversairePage.module.css'

interface Photo {
  id: string
  dataUrl: string
  caption: string
  date: string
}

function loadPhotos(): Photo[] {
  try {
    const raw = localStorage.getItem(`chipie-galerie-${getActiveProfileId()}`)
    if (!raw) return []
    const data = JSON.parse(raw) as { photos?: Photo[] }
    return data.photos ?? []
  } catch { return [] }
}

const CONFETTI_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8']

function drawCollage(canvas: HTMLCanvasElement, photos: Photo[], nom: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = 900
  const H = 900
  canvas.width = W
  canvas.height = H

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, '#fff9f0')
  grad.addColorStop(1, '#ffecd2')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Confetti dots
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
    ctx.globalAlpha = 0.3 + Math.random() * 0.4
    const size = 4 + Math.random() * 8
    ctx.beginPath()
    ctx.arc(Math.random() * W, Math.random() * H, size / 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Header text
  ctx.fillStyle = '#ff6b35'
  ctx.font = 'bold 52px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`🎂 Joyeux anniversaire ${nom} !`, W / 2, 70)

  // Layout photos in grid
  const display = photos.slice(0, 9)
  const cols = display.length <= 4 ? 2 : 3
  const rows = Math.ceil(display.length / cols)
  const margin = 20
  const headerH = 100
  const footerH = 60
  const cellW = (W - margin * (cols + 1)) / cols
  const cellH = (H - headerH - footerH - margin * (rows + 1)) / rows

  display.forEach((photo, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const x = margin + col * (cellW + margin)
    const y = headerH + margin + row * (cellH + margin)

    const img = new Image()
    img.src = photo.dataUrl
    // Draw rounded rect clip
    ctx.save()
    ctx.beginPath()
    const r = 14
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + cellW - r, y)
    ctx.arcTo(x + cellW, y, x + cellW, y + r, r)
    ctx.lineTo(x + cellW, y + cellH - r)
    ctx.arcTo(x + cellW, y + cellH, x + cellW - r, y + cellH, r)
    ctx.lineTo(x + r, y + cellH)
    ctx.arcTo(x, y + cellH, x, y + cellH - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.clip()
    ctx.drawImage(img, x, y, cellW, cellH)
    ctx.restore()

    // Caption
    if (photo.caption) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(x, y + cellH - 24, cellW, 24)
      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(photo.caption.slice(0, 30), x + 6, y + cellH - 8)
    }
  })

  // Footer
  ctx.fillStyle = '#ff6b35'
  ctx.font = 'bold 20px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('💛 Chipie Miam', W / 2, H - 20)
}

export default function AlbumAnniversairePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const photos = useMemo(loadPhotos, [])
  const displayPhotos = photos.slice(0, 9)

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas || photos.length === 0) return

    const loadImages = displayPhotos.map(p => new Promise<void>(resolve => {
      const img = new Image()
      img.onload = () => resolve()
      img.src = p.dataUrl
    }))

    Promise.all(loadImages).then(() => {
      drawCollage(canvas, displayPhotos, profil.nom)
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `album-anniversaire-${profil.nom.toLowerCase()}.png`
      a.click()
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
      </div>

      <div className={styles.header}>
        <span className={styles.headerEmoji}>🎂</span>
        <div>
          <h1 className={styles.title}>Album anniversaire</h1>
          <p className={styles.subtitle}>Les plus belles photos de {profil.nom}</p>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📷</span>
          <p className={styles.emptyTitle}>Aucune photo dans la galerie</p>
          <p className={styles.emptySub}>Ajoute des photos dans la Galerie pour créer l'album</p>
          <button className={styles.galleryBtn} onClick={() => navigate('/galerie')}>
            📸 Aller à la Galerie
          </button>
        </div>
      ) : (
        <>
          <div className={styles.banner}>
            <span className={styles.bannerEmoji}>🎉</span>
            <p className={styles.bannerText}>
              {displayPhotos.length} photo{displayPhotos.length > 1 ? 's' : ''} sélectionnée{displayPhotos.length > 1 ? 's' : ''} pour l'album
              {photos.length > 9 && ` (sur ${photos.length})`}
            </p>
          </div>

          {/* Photo grid */}
          <div className={styles.grid}>
            {displayPhotos.map((photo, i) => (
              <div key={photo.id} className={styles.photoWrap}>
                <img src={photo.dataUrl} alt={photo.caption || `Photo ${i + 1}`} className={styles.photo} />
                {photo.caption && <p className={styles.caption}>{photo.caption}</p>}
              </div>
            ))}
          </div>

          <button className={styles.downloadBtn} onClick={handleDownload}>
            ⬇️ Télécharger le collage
          </button>

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </>
      )}
    </div>
  )
}
