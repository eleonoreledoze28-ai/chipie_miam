import { useState } from 'react'
import type { Vegetal } from '../../data/vegetaux'
import { assetUrl } from '../../utils/assetUrl'
import { useFx } from '../../services/fxSettings'
import VegetalIllustration from '../VegetalIllustration/VegetalIllustration'

interface Props {
  vegetal: Vegetal
  /** Adresse de la photo (par défaut : celle de l'aliment) */
  src?: string
  className?: string
  alt?: string
  loading?: 'lazy' | 'eager'
  style?: React.CSSProperties
  draggable?: boolean
}

/**
 * Photo d'un aliment. Tant qu'elle charge, ou si elle est introuvable (hors ligne, lien cassé),
 * on affiche à la place le dessin de l'aliment. Le réglage « Illustrations » force le dessin.
 */
export default function VegetalImage({ vegetal, src, className, alt = '', loading, style, draggable }: Props) {
  const { illustrations } = useFx()
  const url = src ?? assetUrl(vegetal.image)
  const [loaded, setLoaded] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  const showPhoto = !illustrations && failed !== url
  const ready = loaded === url

  return (
    <>
      {showPhoto && (
        <img
          src={url}
          alt={alt}
          className={className}
          style={ready ? style : { display: 'none' }}
          loading={loading}
          draggable={draggable}
          onLoad={e => (e.currentTarget.naturalWidth > 0 ? setLoaded(url) : setFailed(url))}
          onError={() => setFailed(url)}
        />
      )}
      {(!showPhoto || !ready) && <VegetalIllustration vegetal={vegetal} className={className} />}
    </>
  )
}
