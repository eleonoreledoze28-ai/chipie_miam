import { useLocation, useNavigate } from 'react-router-dom'
import { haptic } from '../../services/haptics'
import styles from './VoiceFab.module.css'

// Pages où le bouton gênerait : l'assistant lui-même, et les jeux (zone de jeu tactile en plein écran)
function isHidden(pathname: string): boolean {
  return pathname.startsWith('/dis-chipie') || pathname.startsWith('/jeu/')
}

/** Bouton micro flottant : ouvre « Dis Chipie ! » depuis n'importe quelle page et lance l'écoute. */
export default function VoiceFab() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (isHidden(pathname)) return null

  return (
    <button
      className={styles.fab}
      onClick={() => { haptic('tap'); navigate('/dis-chipie?micro=1') }}
      aria-label="Parler à Chipie"
    >
      <span aria-hidden="true">🎤</span>
    </button>
  )
}
