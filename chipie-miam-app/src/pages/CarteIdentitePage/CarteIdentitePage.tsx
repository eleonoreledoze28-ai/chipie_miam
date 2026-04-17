import { useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import styles from './CarteIdentitePage.module.css'

// ── Age helper ────────────────────────────────────────────────────────────────
function calcAge(dateNaissance: string): string {
  if (!dateNaissance) return ''
  const today = new Date()
  const bday = new Date(dateNaissance + 'T00:00:00')
  let age = today.getFullYear() - bday.getFullYear()
  const m = today.getMonth() - bday.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) age--
  return `${Math.max(0, age)} an${age > 1 ? 's' : ''}`
}

// ── Canvas export ─────────────────────────────────────────────────────────────
async function exportCard(
  profil: { nom: string; sousTitre: string; race: string; poids: string; couleur: string; sterilise: string; dateNaissance: string; avatar: string; age: string }
): Promise<void> {
  const W = 360, H = 560
  const canvas = document.createElement('canvas')
  canvas.width = W * 2  // retina
  canvas.height = H * 2
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#1A1D24')
  bg.addColorStop(1, '#0A0B0F')
  ctx.fillStyle = bg
  roundRect(ctx, 0, 0, W, H, 24)
  ctx.fill()

  // Decorative dots
  ctx.fillStyle = 'rgba(176,124,255,0.08)'
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    ctx.arc(W - 30 + i * 5, 30 + i * 8, 40 - i * 4, 0, Math.PI * 2)
    ctx.fill()
  }

  // Header band
  const hdr = ctx.createLinearGradient(0, 0, W, 0)
  hdr.addColorStop(0, '#F0A53A')
  hdr.addColorStop(1, '#B07CFF')
  ctx.fillStyle = hdr
  ctx.fillRect(0, 0, W, 5)

  // Avatar circle
  const avatarSrc = profil.avatar || `${import.meta.env.BASE_URL}chipie-avatar.jpeg`
  const avatarImg = await loadImage(avatarSrc).catch(() => null)
  const CX = W / 2, CY = 110, R = 60
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, R, 0, Math.PI * 2)
  ctx.clip()
  if (avatarImg) {
    ctx.drawImage(avatarImg, CX - R, CY - R, R * 2, R * 2)
  } else {
    ctx.fillStyle = '#262A33'
    ctx.fill()
    ctx.fillStyle = '#6E7280'
    ctx.font = `bold 40px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(profil.nom[0]?.toUpperCase() ?? '?', CX, CY)
  }
  ctx.restore()

  // Avatar ring
  ctx.strokeStyle = '#F0A53A'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(CX, CY, R + 4, 0, Math.PI * 2)
  ctx.stroke()

  // Name
  ctx.fillStyle = '#E7E7EA'
  ctx.font = `bold 28px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(profil.nom, W / 2, 205)

  // Subtitle
  ctx.fillStyle = '#B07CFF'
  ctx.font = `600 14px sans-serif`
  ctx.fillText(profil.sousTitre || 'Lapin', W / 2, 228)

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(24, 248); ctx.lineTo(W - 24, 248)
  ctx.stroke()

  // Info rows
  const rows: [string, string][] = [
    ['🐇  Race',      profil.race || '—'],
    ['🎨  Couleur',   profil.couleur || '—'],
    ['🎂  Âge',       profil.dateNaissance ? calcAge(profil.dateNaissance) : (profil.age || '—')],
    ['⚖️  Poids',     profil.poids ? `${profil.poids} kg` : '—'],
    ['✂️  Stérilisé', profil.sterilise || '—'],
  ]

  let y = 274
  for (const [label, value] of rows) {
    ctx.fillStyle = '#6E7280'
    ctx.font = `600 12px sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText(label, 28, y)

    ctx.fillStyle = '#E7E7EA'
    ctx.font = `bold 13px sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText(value, W - 28, y)

    y += 38

    if (y < 274 + 38 * 5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(28, y - 12); ctx.lineTo(W - 28, y - 12)
      ctx.stroke()
    }
  }

  // Paw prints decoration
  ctx.fillStyle = 'rgba(240,165,58,0.12)'
  ctx.font = '20px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('🐾', 18, H - 44)
  ctx.fillText('🐾', 44, H - 28)

  // Branding
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.font = `600 11px sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText('Chipie Miam', W / 2, H - 18)

  // Download
  const link = document.createElement('a')
  link.download = `carte-${profil.nom.toLowerCase().replace(/\s+/g, '-')}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CarteIdentitePage() {
  const navigate = useNavigate()
  const { profil } = useProfil()
  const cardRef = useRef<HTMLDivElement>(null)

  const ageDisplay = useMemo(() =>
    profil.dateNaissance ? calcAge(profil.dateNaissance) : (profil.age || '—'),
    [profil.dateNaissance, profil.age]
  )

  const avatarSrc = profil.avatar || `${import.meta.env.BASE_URL}chipie-avatar.jpeg`

  const handleDownload = useCallback(async () => {
    try {
      await exportCard(profil)
    } catch {
      alert('Impossible d\'exporter la carte. Essaie de faire une capture d\'écran.')
    }
  }, [profil])

  const rows = [
    { emoji: '🐇', label: 'Race',        value: profil.race || '—' },
    { emoji: '🎨', label: 'Couleur',     value: profil.couleur || '—' },
    { emoji: '🎂', label: 'Âge',         value: ageDisplay },
    { emoji: '⚖️', label: 'Poids',       value: profil.poids ? `${profil.poids} kg` : '—' },
    { emoji: '✂️', label: 'Stérilisé(e)', value: profil.sterilise || '—' },
  ]

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <path d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>
        <button className={styles.downloadBtn} onClick={handleDownload}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
            <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Télécharger
        </button>
      </div>

      <p className={styles.hint}>La carte ci-dessous représente le profil de {profil.nom}.</p>

      {/* The visual card */}
      <div className={styles.cardWrap}>
        <div className={styles.card} ref={cardRef}>
          {/* Header stripe */}
          <div className={styles.headerStripe} />

          {/* Avatar */}
          <div className={styles.avatarSection}>
            <div className={styles.avatarRing}>
              <img src={avatarSrc} alt={profil.nom} className={styles.avatarImg} />
            </div>
          </div>

          {/* Name */}
          <h1 className={styles.name}>{profil.nom}</h1>
          <p className={styles.subtitle}>{profil.sousTitre || 'Lapin'}</p>

          {/* Divider */}
          <div className={styles.divider} />

          {/* Info rows */}
          <div className={styles.infoList}>
            {rows.map((r, i) => (
              <div key={i} className={styles.infoRow}>
                <span className={styles.infoLabel}>
                  <span className={styles.infoEmoji}>{r.emoji}</span>
                  {r.label}
                </span>
                <span className={styles.infoValue}>{r.value}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <span className={styles.paws}>🐾🐾</span>
            <span className={styles.brand}>Chipie Miam</span>
          </div>
        </div>
      </div>

      {/* Edit hint */}
      <button className={styles.editHint} onClick={() => navigate('/profil')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
        </svg>
        Modifier le profil
      </button>
    </div>
  )
}
