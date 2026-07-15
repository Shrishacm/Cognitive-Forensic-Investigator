import { useRef, useCallback } from 'react'

export default function useTilt(intensity = 10) {
  const ref = useRef(null)

  const onMouseMove = useCallback(e => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    el.style.transform = `
      perspective(900px)
      rotateX(${y * -intensity}deg)
      rotateY(${x * intensity}deg)
      translateZ(10px)
      scale(1.01)
    `
    const shine = el.querySelector('.card-shine')
    if (shine) {
      shine.style.opacity = '1'
      shine.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.12) 0%, transparent 60%)`
    }
  }, [intensity])

  const onMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.transform = `
      perspective(900px)
      rotateX(0deg)
      rotateY(0deg)
      translateZ(0)
      scale(1)
    `
    const shine = el.querySelector('.card-shine')
    if (shine) {
      shine.style.opacity = '0'
    }
  }, [])

  return { ref, onMouseMove, onMouseLeave }
}
