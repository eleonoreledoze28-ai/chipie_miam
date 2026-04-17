import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MALADIES, URGENCE_INFO } from '../../data/maladies'
import type { Urgence } from '../../data/maladies'
import styles from './MaladiesPage.module.css'

const URGENCE_ORDER: Urgence[] = ['urgence', 'important', 'surveillance']

export default function MaladiesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterUrgence, setFilterUrgence] = useState<Urgence | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = [...MALADIES].sort(
      (a, b) => URGENCE_ORDER.indexOf(a.urgence) - URGENCE_ORDER.indexOf(b.urgence)
    )
    if (filterUrgence !== 'all') list = list.filter(m => m.urgence === filterUrgence)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.nom.toLowerCase().includes(q) ||
        m.symptomes.some(s => s.toLowerCase().includes(q))
      )
    }
    return list
  }, [search, filterUrgence])

  const toggle = (id: string) => setExpanded(prev => prev === id ? null : id)

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
        <span className={styles.headerEmoji}>🏥</span>
        <div>
          <h1 className={styles.title}>Maladies courantes</h1>
          <p className={styles.subtitle}>{MALADIES.length} fiches · symptômes &amp; conseils</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className={styles.disclaimer}>
        <span>ℹ️</span>
        <p>Ces informations ne remplacent pas un avis vétérinaire. En cas de doute, consultez toujours un professionnel.</p>
      </div>

      {/* Search */}
      <div className={styles.searchWrap}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Rechercher une maladie ou un symptôme…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Urgence filters */}
      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filterUrgence === 'all' ? styles.filterActive : ''}`}
          onClick={() => setFilterUrgence('all')}
        >
          Toutes
        </button>
        {URGENCE_ORDER.map(u => {
          const info = URGENCE_INFO[u]
          return (
            <button
              key={u}
              className={`${styles.filterBtn} ${filterUrgence === u ? styles.filterActive : ''}`}
              style={filterUrgence === u ? { borderColor: info.color, background: info.bg, color: info.color } as React.CSSProperties : undefined}
              onClick={() => setFilterUrgence(u)}
            >
              {info.label}
            </button>
          )
        })}
      </div>

      {/* Disease list */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>🔍</span>
          <p>Aucun résultat pour « {search} »</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(m => {
            const info = URGENCE_INFO[m.urgence]
            const open = expanded === m.id
            return (
              <div key={m.id} className={styles.card}>
                {/* Card header — always visible */}
                <button className={styles.cardHeader} onClick={() => toggle(m.id)}>
                  <span className={styles.cardEmoji}>{m.emoji}</span>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardName}>{m.nom}</span>
                    <span
                      className={styles.urgenceBadge}
                      style={{ color: info.color, background: info.bg } as React.CSSProperties}
                    >
                      {info.label}
                    </span>
                  </div>
                  <svg
                    className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {/* Expanded content */}
                {open && (
                  <div className={styles.cardBody}>
                    <p className={styles.description}>{m.description}</p>

                    <Section title="Symptômes" emoji="🔎">
                      <ul className={styles.bulletList}>
                        {m.symptomes.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </Section>

                    <Section title="Que faire ?" emoji="✅">
                      <ul className={styles.bulletList}>
                        {m.quoiFaire.map((q, i) => <li key={i}>{q}</li>)}
                      </ul>
                    </Section>

                    {m.prevention && m.prevention.length > 0 && (
                      <Section title="Prévention" emoji="🛡️">
                        <ul className={styles.bulletList}>
                          {m.prevention.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </Section>
                    )}

                    {m.savoirPlus && (
                      <div className={styles.savoirPlus}>
                        <span>💡</span>
                        <p>{m.savoirPlus}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{emoji} {title}</p>
      {children}
    </div>
  )
}
