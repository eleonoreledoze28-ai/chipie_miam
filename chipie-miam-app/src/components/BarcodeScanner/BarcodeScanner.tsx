import { useEffect, useRef, useState } from 'react'
import { SCAN_FORMATS, getBarcodeDetector, normalizeCode } from '../../services/barcode'
import styles from './BarcodeScanner.module.css'

interface Props {
  onCode: (code: string) => void
  onClose: () => void
}

const SCAN_EVERY_MS = 250

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Caméra refusée. Autorise-la dans les paramètres du site, ou saisis le code ci-dessous.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Aucune caméra trouvée. Saisis le code ci-dessous.'
  }
  return 'Impossible de démarrer la caméra. Saisis le code ci-dessous.'
}

/** Scanne un code-barres avec la caméra (si l'appareil sait le faire) ou le laisse saisir à la main. */
export default function BarcodeScanner({ onCode, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [manualError, setManualError] = useState(false)

  const Detector = getBarcodeDetector()
  const cameraAvailable = Detector !== null

  useEffect(() => {
    if (!Detector) return
    let stopped = false
    let timer = 0
    let stream: MediaStream | null = null

    const stop = () => {
      stopped = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach(t => t.stop())
      stream = null
    }

    void (async () => {
      try {
        const detector = new Detector({ formats: SCAN_FORMATS })
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        const video = videoRef.current
        if (stopped || !video) { stop(); return }
        video.srcObject = stream
        await video.play()

        const tick = async () => {
          if (stopped) return
          try {
            const found = await detector.detect(video)
            const code = found.map(f => normalizeCode(f.rawValue)).find((c): c is string => c !== null)
            if (code) {
              stop()
              onCode(code)
              return
            }
          } catch { /* image pas prête : on réessaie */ }
          timer = window.setTimeout(() => { void tick() }, SCAN_EVERY_MS)
        }
        void tick()
      } catch (err) {
        stop()
        setCameraError(cameraErrorMessage(err))
      }
    })()

    return stop
    // onCode vient du parent et change à chaque rendu : le scan ne doit pas redémarrer pour autant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Detector])

  const submitManual = () => {
    const code = normalizeCode(manual)
    if (!code) { setManualError(true); return }
    onCode(code)
  }

  return (
    <div className={styles.overlay} role="dialog" aria-label="Scanner un code-barres">
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>📷 Scanner un code-barres</span>
          <button className={styles.close} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {cameraAvailable && !cameraError && (
          <div className={styles.viewfinder}>
            <video ref={videoRef} className={styles.video} playsInline muted />
            <div className={styles.frame} />
          </div>
        )}

        {cameraAvailable && !cameraError && (
          <p className={styles.hint}>Place le code-barres du produit devant la caméra.</p>
        )}
        {!cameraAvailable && (
          <p className={styles.hint}>
            Ce navigateur ne sait pas scanner avec la caméra (c'est possible avec Chrome sur Android).
            Saisis le numéro sous les barres.
          </p>
        )}
        {cameraError && <p className={styles.error}>{cameraError}</p>}

        <label className={styles.label} htmlFor="manual-code">Ou saisis le code</label>
        <div className={styles.manualRow}>
          <input
            id="manual-code"
            className={`${styles.input} ${manualError ? styles.inputError : ''}`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ex : 3017620422003"
            value={manual}
            onChange={e => { setManual(e.target.value); setManualError(false) }}
            onKeyDown={e => { if (e.key === 'Enter') submitManual() }}
          />
          <button className={styles.ok} onClick={submitManual} disabled={manual.trim() === ''}>Valider</button>
        </div>
        {manualError && <p className={styles.error}>Ce n'est pas un code-barres valide (6 à 40 chiffres ou lettres).</p>}

        <p className={styles.privacy}>
          Le numéro du code est envoyé à openpetfoodfacts.org et openfoodfacts.org pour retrouver le nom du produit.
        </p>
      </div>
    </div>
  )
}
