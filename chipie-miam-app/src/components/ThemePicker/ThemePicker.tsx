import { useTheme, type ThemeId } from '../../hooks/useTheme'
import styles from './ThemePicker.module.css'

const THEMES: { id: ThemeId; label: string; left: string; right: string }[] = [
  { id: 'dark', label: 'Sombre', left: '#0A0B0F', right: '#F0A53A' },
  { id: 'lavender', label: 'Lavande', left: '#B29EB1', right: '#CED6B6' },
  { id: 'aqua', label: 'Aqua', left: '#D6F0FA', right: '#49A9D6' },
  { id: 'aqua-dark', label: 'Ocean', left: '#071A26', right: '#62C3EB' },
]

interface Props {
  onClose: () => void
}

export default function ThemePicker({ onClose }: Props) {
  const { theme, setTheme } = useTheme()

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.popup}>
        {THEMES.map(t => (
          <button
            key={t.id}
            className={`${styles.option} ${theme === t.id ? styles.optionActive : ''}`}
            onClick={() => { setTheme(t.id); onClose() }}
          >
            <div className={styles.swatch}>
              <div className={`${styles.swatchHalf} ${styles.swatchLeft}`} style={{ background: t.left }} />
              <div className={`${styles.swatchHalf} ${styles.swatchRight}`} style={{ background: t.right }} />
            </div>
            <span className={styles.label}>{t.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}
