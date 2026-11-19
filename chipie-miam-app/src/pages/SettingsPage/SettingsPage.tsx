import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfil } from '../../hooks/useProfil'
import {
  getPermission,
  requestPermission,
  getSettings,
  saveSettings,
  checkAndFirePending,
  HEAT_ALERT_C,
  WEIGH_EVERY_DAYS,
  type NotifSettings,
} from '../../services/notifications'
import { setFx, useFx } from '../../services/fxSettings'
import { disableWeather, enableWeather, KIND_LABEL, useWeather } from '../../services/weather'
import type { EnableResult } from '../../services/weather'
import { haptic } from '../../services/haptics'
import {
  BackupError,
  downloadBackup,
  formatBytes,
  getLastBackupDate,
  parseBackup,
  restoreBackup,
} from '../../services/backup'
import { playSfx } from '../../services/sfx'
import styles from './SettingsPage.module.css'

interface ToggleRowProps {
  label: string
  desc: string
  on: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

function ToggleRow({ label, desc, on, onChange, disabled }: ToggleRowProps) {
  return (
    <div className={styles.notifRow}>
      <div className={styles.notifRowInfo}>
        <span className={styles.notifRowLabel}>{label}</span>
        <span className={styles.notifRowDesc}>{desc}</span>
      </div>
      <button
        className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
        onClick={() => onChange(!on)}
        aria-label={label}
        aria-pressed={on}
        disabled={disabled}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  )
}

const WEATHER_ERRORS: Record<Exclude<EnableResult, 'ok'>, string> = {
  denied: 'Position refusée. Autorise-la dans les paramètres du site de ton navigateur pour activer la météo.',
  unsupported: 'Ce navigateur ne sait pas donner ta position.',
  error: 'Impossible de récupérer la météo pour le moment. Réessaie un peu plus tard.',
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ msg: string; error?: boolean } | null>(null)
  const [lastBackup, setLastBackup] = useState<string | null>(getLastBackupDate)
  const { profil } = useProfil()
  const rabbitName = profil.nom || 'votre lapin'

  // Notification state
  const [permission, setPermission] = useState<NotificationPermission>(getPermission)
  const [notifSettings, setNotifSettings] = useState<NotifSettings>(getSettings)

  // Effets : sons, vibrations, ambiance, météo
  const fx = useFx()
  const weather = useWeather()
  const [weatherBusy, setWeatherBusy] = useState(false)
  const [weatherMsg, setWeatherMsg] = useState<string | null>(null)

  async function handleWeatherToggle(on: boolean) {
    if (!on) {
      disableWeather()
      setWeatherMsg(null)
      return
    }
    setWeatherBusy(true)
    setWeatherMsg('Recherche de ta position…')
    const result = await enableWeather()
    setWeatherBusy(false)
    setWeatherMsg(result === 'ok' ? null : WEATHER_ERRORS[result])
    if (result === 'ok') void checkAndFirePending()
  }

  useEffect(() => {
    setPermission(getPermission())
  }, [])

  function handleExport() {
    const { count, bytes } = downloadBackup()
    setLastBackup(getLastBackupDate())
    setStatus({ msg: `Sauvegarde téléchargée : ${count} éléments (${formatBytes(bytes)}).` })
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onerror = () => setStatus({ msg: 'Impossible de lire ce fichier.', error: true })
    reader.onload = () => {
      try {
        const entries = parseBackup(String(reader.result))
        const total = Object.keys(entries).length
        if (!window.confirm(
          `Restaurer ${total} éléments depuis cette sauvegarde ?\n`
          + 'Les données actuelles portant le même nom seront remplacées.',
        )) return

        const { restored, failed } = restoreBackup(entries)
        if (failed.length > 0) {
          setStatus({
            msg: `${restored} éléments restaurés, ${failed.length} n'ont pas pu l'être (stockage plein, souvent à cause des photos).`,
            error: true,
          })
          return
        }
        setStatus({ msg: `${restored} éléments restaurés ! Rechargement…` })
        setTimeout(() => window.location.reload(), 1200)
      } catch (err) {
        setStatus({ msg: err instanceof BackupError ? err.message : 'Fichier invalide.', error: true })
      }
    }
    reader.readAsText(file)
  }

  async function handleRequestPermission() {
    const perm = await requestPermission()
    setPermission(perm)
    if (perm === 'granted') {
      void checkAndFirePending()
    }
  }

  function updateNotifSettings(patch: Partial<NotifSettings>) {
    const next = { ...notifSettings, ...patch }
    setNotifSettings(next)
    saveSettings(next)
  }

  const notifSupported = 'Notification' in window

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate(-1)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
          <path d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        <span>Retour</span>
      </button>

      <h1 className={styles.title}>Paramètres</h1>
      <p className={styles.subtitle}>
        Ambiance, notifications, sauvegarde et restauration des données.
      </p>

      {/* ===== Ambiance & effets ===== */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Ambiance &amp; effets</div>

        <ToggleRow
          label="🔊 Sons"
          desc="Ronronnement, croc-croc et bruitages des jeux"
          on={fx.sounds}
          onChange={on => { setFx({ sounds: on }); if (on) playSfx('pop') }}
        />
        <ToggleRow
          label="📳 Vibrations"
          desc="Petites vibrations du téléphone (caresses, jeux)"
          on={fx.haptics}
          onChange={on => { setFx({ haptics: on }); if (on) haptic('success') }}
        />
        <ToggleRow
          label="🌙 Ambiance visuelle"
          desc="L'écran change avec l'heure de la journée (nuit étoilée, soleil couchant…)"
          on={fx.ambient}
          onChange={on => setFx({ ambient: on })}
        />
        <ToggleRow
          label="🌦️ Météo réelle"
          desc="Pluie, neige, soleil… comme dehors. Utilise ta position approximative."
          on={fx.weather}
          onChange={on => { void handleWeatherToggle(on) }}
          disabled={weatherBusy}
        />

        {weatherMsg && <p className={styles.notifRowDesc}>{weatherMsg}</p>}

        {fx.weather && weather && (
          <div className={styles.notifInfo}>
            <span>{KIND_LABEL[weather.kind].emoji}</span>
            <span>
              {KIND_LABEL[weather.kind].label}, {Math.round(weather.tempC)} °C
              (de {Math.round(weather.minC)} à {Math.round(weather.maxC)} °C aujourd'hui).
            </span>
          </div>
        )}

        <p className={styles.notifRowDesc}>
          Seule ta position approximative (à ~10 km près) est envoyée à open-meteo.com pour obtenir la météo.
          Elle reste enregistrée sur cet appareil et s'efface quand tu désactives la météo.
        </p>
      </div>

      {/* ===== Notifications ===== */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Notifications</div>

        {!notifSupported ? (
          <p className={styles.notifUnsupported}>
            Les notifications ne sont pas supportées par ce navigateur.
          </p>
        ) : permission === 'denied' ? (
          <div className={styles.notifDenied}>
            <span className={styles.notifDeniedIcon}>🔕</span>
            <p className={styles.notifDeniedText}>
              Notifications bloquées. Pour les activer, modifie les autorisations
              du site dans les paramètres de ton navigateur.
            </p>
          </div>
        ) : permission === 'default' ? (
          <div className={styles.notifPrompt}>
            <p className={styles.sectionDesc}>
              Reçois des rappels pour nourrir {rabbitName} et tes rendez-vous vétérinaires.
            </p>
            <button className={`${styles.btn} ${styles.btnNotif}`} onClick={() => { void handleRequestPermission() }}>
              🔔 Activer les notifications
            </button>
          </div>
        ) : (
          /* permission === 'granted' */
          <div className={styles.notifGranted}>
            <div className={styles.notifStatus}>
              <span className={styles.notifStatusDot} />
              <span className={styles.notifStatusText}>Notifications activées</span>
            </div>

            {/* Feeding reminder */}
            <div className={styles.notifRow}>
              <div className={styles.notifRowInfo}>
                <span className={styles.notifRowLabel}>🥕 Rappel repas quotidien</span>
                <span className={styles.notifRowDesc}>{rabbitName} doit manger chaque jour</span>
              </div>
              <button
                className={`${styles.toggle} ${notifSettings.feedingEnabled ? styles.toggleOn : ''}`}
                onClick={() => updateNotifSettings({ feedingEnabled: !notifSettings.feedingEnabled })}
                aria-label="Activer rappel repas"
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>

            {notifSettings.feedingEnabled && (
              <div className={styles.notifTimeRow}>
                <label className={styles.notifTimeLabel}>Heure du rappel</label>
                <input
                  type="time"
                  value={notifSettings.feedingTime}
                  className={styles.timeInput}
                  onChange={e => updateNotifSettings({
                    feedingTime: e.target.value,
                    feedingFiredDate: '', // reset so it fires again today if time is in future
                  })}
                />
              </div>
            )}

            <ToggleRow
              label="⚖️ Rappel de pesée"
              desc={`Si ${rabbitName} n'a pas été pesé(e) depuis ${WEIGH_EVERY_DAYS} jours`}
              on={notifSettings.weighEnabled}
              onChange={on => updateNotifSettings({ weighEnabled: on })}
            />
            <ToggleRow
              label="💊 Pharmacie"
              desc="Médicaments périmés ou bientôt périmés, stock bas"
              on={notifSettings.pharmacieEnabled}
              onChange={on => updateNotifSettings({ pharmacieEnabled: on })}
            />
            <ToggleRow
              label="🌡️ Chaleur et gel"
              desc={fx.weather
                ? `Alerte dès ${HEAT_ALERT_C} °C ou en cas de gel`
                : 'Demande d’activer la météo réelle ci-dessus'}
              on={notifSettings.weatherAlertEnabled && fx.weather}
              onChange={on => updateNotifSettings({ weatherAlertEnabled: on })}
              disabled={!fx.weather}
            />

            {/* Carnet santé info */}
            <div className={styles.notifInfo}>
              <span>🩺</span>
              <span>Les rappels du Carnet santé s'affichent à la date prévue. Les notifications apparaissent quand tu ouvres l'app ou que tu y reviens (l'app ne tourne pas en arrière-plan).</span>
            </div>
          </div>
        )}
      </div>

      {/* ===== Sauvegarde ===== */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Sauvegarde</div>
        <p className={styles.sectionDesc}>
          Télécharge un fichier contenant toutes vos données : profils, journal, pesées, pharmacie, galerie photos,
          dépenses, carnet de santé, Tamagotchi, meilleurs scores et préférences.
          La position utilisée pour la météo n'en fait pas partie.
        </p>
        <p className={styles.notifRowDesc}>
          {lastBackup
            ? `Dernière sauvegarde : ${new Date(lastBackup).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : 'Aucune sauvegarde faite pour le moment.'}
        </p>
        <button className={`${styles.btn} ${styles.btnExport}`} onClick={handleExport}>
          Sauvegarder mes données
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Restauration</div>
        <p className={styles.sectionDesc}>
          Importez un fichier de sauvegarde (les anciennes sauvegardes fonctionnent aussi) pour restaurer vos données.
        </p>
        <button className={`${styles.btn} ${styles.btnImport}`} onClick={() => fileRef.current?.click()}>
          Restaurer une sauvegarde
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className={styles.fileInput}
          onChange={handleImport}
        />
      </div>

      {status && (
        <p className={status.error ? styles.statusError : styles.status}>
          {status.msg}
        </p>
      )}
    </div>
  )
}
