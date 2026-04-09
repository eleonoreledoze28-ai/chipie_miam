import { useEffect, useState } from 'react'
import css from './Chipie.module.css'

export type ChipieMood = 'happy' | 'content' | 'neutral' | 'sad' | 'sleeping' | 'eating' | 'excited'

interface Props {
  mood: ChipieMood
  accessory?: string | null
  className?: string
}

export default function ChipieSvg({ mood, accessory, className }: Props) {
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    if (mood === 'sleeping') return
    const interval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 150)
    }, 3000 + Math.random() * 2000)
    return () => clearInterval(interval)
  }, [mood])

  const isHappy = mood === 'happy' || mood === 'excited'
  const isSad = mood === 'sad'
  const isSleeping = mood === 'sleeping'
  const isEating = mood === 'eating'

  const moodClass = isSleeping ? css.sleeping
    : mood === 'excited' ? css.excited
    : isHappy ? css.happy
    : isSad ? css.sad
    : css.neutral

  return (
    <div className={`${css.chipie} ${moodClass} ${className || ''}`}>
      {/* Ears */}
      <div className={`${css.ear} ${css.earL}`}>
        <div className={css.earInner} />
      </div>
      <div className={`${css.ear} ${css.earR}`}>
        <div className={css.earInner} />
      </div>

      {/* Head */}
      <div className={css.head}>
        {/* Muzzle area */}
        <div className={css.muzzle} />

        {/* Eyes */}
        <div className={css.eyes}>
          {isSleeping || blink ? (
            <>
              <div className={css.eyeClosed} />
              <div className={css.eyeClosed} />
            </>
          ) : (
            <>
              <div className={`${css.eye} ${isHappy ? css.eyeHappy : ''} ${isSad ? css.eyeSad : ''}`}>
                <div className={css.pupil}>
                  <div className={css.shine} />
                  <div className={css.shineSm} />
                </div>
              </div>
              <div className={`${css.eye} ${isHappy ? css.eyeHappy : ''} ${isSad ? css.eyeSad : ''}`}>
                <div className={css.pupil}>
                  <div className={css.shine} />
                  <div className={css.shineSm} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sad eyebrows */}
        {isSad && !isSleeping && !blink && (
          <div className={css.eyebrows}>
            <div className={css.browL} />
            <div className={css.browR} />
          </div>
        )}

        {/* Nose */}
        <div className={css.nose} />

        {/* Whiskers */}
        <div className={css.whiskers}>
          <div className={`${css.whisker} ${css.wl1}`} />
          <div className={`${css.whisker} ${css.wl2}`} />
          <div className={`${css.whisker} ${css.wr1}`} />
          <div className={`${css.whisker} ${css.wr2}`} />
        </div>

        {/* Mouth */}
        <div className={css.mouth}>
          {isHappy || mood === 'excited' ? (
            <div className={css.smile} />
          ) : isEating ? (
            <div className={css.mouthOpen} />
          ) : isSad ? (
            <div className={css.frown} />
          ) : (
            <div className={css.smileSoft} />
          )}
        </div>

        {/* Cheek blush */}
        <div className={css.cheeks}>
          <div className={`${css.cheek} ${isHappy ? css.cheekBright : ''}`} />
          <div className={`${css.cheek} ${isHappy ? css.cheekBright : ''}`} />
        </div>
      </div>

      {/* Body */}
      <div className={css.body}>
        <div className={css.belly} />
        {/* Paws */}
        <div className={`${css.paw} ${css.pawL}`} />
        <div className={`${css.paw} ${css.pawR}`} />
        {/* Feet */}
        <div className={`${css.foot} ${css.footL}`} />
        <div className={`${css.foot} ${css.footR}`} />
        {/* Tail */}
        <div className={css.tail} />
      </div>

      {/* Accessories */}
      {accessory === 'bow_tie' && <div className={css.bowTie}><div className={css.bowCenter} /></div>}
      {accessory === 'top_hat' && <div className={css.topHat}><div className={css.hatBand} /></div>}
      {accessory === 'glasses' && <div className={css.glasses}><div className={css.lensL} /><div className={css.bridge} /><div className={css.lensR} /></div>}
      {accessory === 'flower_crown' && (
        <div className={css.flowerCrown}>
          <span>🌸</span><span>🌼</span><span>🌺</span><span>🌷</span>
        </div>
      )}
      {accessory === 'scarf' && <div className={css.scarf}><div className={css.scarfEnd} /></div>}
      {accessory === 'bandana' && <div className={css.bandana} />}

      {/* Zzz */}
      {isSleeping && (
        <div className={css.zzz}>
          <span className={css.z1}>z</span>
          <span className={css.z2}>Z</span>
          <span className={css.z3}>Z</span>
        </div>
      )}

      {/* Excited sparkles */}
      {mood === 'excited' && (
        <div className={css.sparkles}>
          <span className={css.sparkle1}>✦</span>
          <span className={css.sparkle2}>✦</span>
          <span className={css.sparkle3}>✧</span>
        </div>
      )}
    </div>
  )
}
