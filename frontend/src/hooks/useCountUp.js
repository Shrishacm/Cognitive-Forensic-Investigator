import { useState, useEffect, useRef } from 'react'

/**
 * Animates a number from 0 to `target`
 * over `duration` milliseconds using
 * an ease-out-cubic easing.
 */
export default function useCountUp(target, duration = 800) {
  const [count, setCount] = useState(0)
  const startTime = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (target === 0 || !target) {
      setCount(0)
      return
    }
    startTime.current = null

    const animate = (timestamp) => {
      if (!startTime.current) {
        startTime.current = timestamp
      }
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setCount(target)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [target, duration])

  return count
}
