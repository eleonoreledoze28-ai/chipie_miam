const COLORS = ['#f0a53a', '#ff6b8b', '#4cd964', '#5ac8fa', '#af8cff', '#ffd84a']

/** Pluie de confettis (records, objectifs atteints). Sans effet si l'écran demande de réduire les animations. */
export function confetti(count = 46): void {
  if (typeof document === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9000'
  const w = window.innerWidth
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i')
    const size = 6 + Math.random() * 6
    const drift = (Math.random() - 0.5) * 160
    p.style.cssText = `position:absolute;top:-16px;left:${Math.random() * w}px;width:${size}px;height:${size * 0.55}px;` +
      `background:${COLORS[i % COLORS.length]};border-radius:2px;opacity:0.95`
    layer.appendChild(p)
    p.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${drift}px, ${window.innerHeight + 40}px) rotate(${360 + Math.random() * 540}deg)`, opacity: 0.9 },
      ],
      { duration: 1800 + Math.random() * 1400, delay: Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' },
    )
  }
  document.body.appendChild(layer)
  setTimeout(() => layer.remove(), 4200)
}
