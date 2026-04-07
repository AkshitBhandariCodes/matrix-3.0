import { useEffect, useState } from 'react'

interface ResponsiveMode {
  isCompactView: boolean
  isTouchInput: boolean
}

function getResponsiveMode(breakpoint: number): ResponsiveMode {
  if (typeof window === 'undefined') {
    return {
      isCompactView: false,
      isTouchInput: false,
    }
  }

  const compactQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)
  const touchQuery = window.matchMedia('(hover: none) and (pointer: coarse)')
  const hasTouchPoints = navigator.maxTouchPoints > 0
  const isTouchInput = touchQuery.matches || hasTouchPoints

  return {
    isCompactView: compactQuery.matches || isTouchInput,
    isTouchInput,
  }
}

export function useResponsiveMode(breakpoint = 860) {
  const [mode, setMode] = useState<ResponsiveMode>(() => getResponsiveMode(breakpoint))

  useEffect(() => {
    const compactQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const touchQuery = window.matchMedia('(hover: none) and (pointer: coarse)')
    const updateMode = () => setMode(getResponsiveMode(breakpoint))

    updateMode()
    compactQuery.addEventListener('change', updateMode)
    touchQuery.addEventListener('change', updateMode)
    window.addEventListener('resize', updateMode)

    return () => {
      compactQuery.removeEventListener('change', updateMode)
      touchQuery.removeEventListener('change', updateMode)
      window.removeEventListener('resize', updateMode)
    }
  }, [breakpoint])

  return mode
}
