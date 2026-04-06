import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Language = 'hi' | 'en' | 'hinglish'
export type Screen = 'intro' | 'hub' | 'realm1' | 'realm2' | 'realm3' | 'realm4' | 'realm5' | 'results' | 'gameover' | 'profile' | 'sakhisathi' | 'suraksha' | 'certificate'

export interface PlayerStats {
  health: number
  wisdom: number
}

export interface StatDelta {
  health?: number
  wisdom?: number
}

export interface MapPosition {
  x: number
  y: number
}

export interface GameState {
  screen: Screen
  playerName: string
  language: Language
  stats: PlayerStats
  mapPosition: MapPosition
  realm1Completed: boolean
  realm2Completed: boolean
  realm3Completed: boolean
  realm4Completed: boolean
  realm5Completed: boolean
  realm1Score: number
  realm2Score: number
  realm3Score: number
  realm4Score: number
  realm5Score: number
  lastFeedback: string | null
  lastFeedbackGood: boolean | null
  lastStatDeltas: StatDelta | null
  transitioning: boolean
  transitionColor: string
  wrongCount: number
  voiceMode: boolean

  setScreen: (screen: Screen) => void
  setPlayerName: (name: string) => void
  setLanguage: (lang: Language) => void
  cycleLang: () => void
  applyStatDelta: (delta: StatDelta, feedback: string, good: boolean) => void
  clearFeedback: () => void
  completeRealm: (realm: 1 | 2 | 3 | 4 | 5, score: number) => void
  setMapPosition: (pos: MapPosition) => void
  startTransition: (color: string) => void
  endTransition: () => void
  incrementWrongCount: () => void
  resetWrongCount: () => void
  toggleVoiceMode: () => void
  resetGame: () => void
}

const initialStats: PlayerStats = {
  health: 80,
  wisdom: 20,
}

const clamp = (val: number) => Math.max(0, Math.min(100, val))

export const useGameStore = create<GameState>()(persist((set, get) => ({
  screen: 'hub',
  playerName: '',
  language: 'hinglish',
  stats: { ...initialStats },
  mapPosition: { x: 450, y: 300 },
  realm1Completed: false,
  realm2Completed: false,
  realm3Completed: false,
  realm4Completed: false,
  realm5Completed: false,
  realm1Score: 0,
  realm2Score: 0,
  realm3Score: 0,
  realm4Score: 0,
  realm5Score: 0,
  lastFeedback: null,
  lastFeedbackGood: null,
  lastStatDeltas: null,
  transitioning: false,
  transitionColor: '#7c3aed',
  wrongCount: 0,
  voiceMode: true,

  setScreen: (screen) => set({ screen }),
  setPlayerName: (playerName) => set({ playerName }),
  setLanguage: (language) => set({ language }),

  cycleLang: () =>
    set((state) => {
      const order: Language[] = ['hi', 'en', 'hinglish']
      const idx = order.indexOf(state.language)
      return { language: order[(idx + 1) % 3] }
    }),

  applyStatDelta: (delta, feedback, good) => {
    const state = get()
    const newHealth = clamp(state.stats.health + (delta.health ?? 0))
    const newWisdom = clamp(state.stats.wisdom + (delta.wisdom ?? 0))

    set({
      stats: { health: newHealth, wisdom: newWisdom },
      lastFeedback: feedback,
      lastFeedbackGood: good,
      lastStatDeltas: delta,
    })

    if (newHealth <= 0) {
      setTimeout(() => set({ screen: 'gameover' }), 1500)
    }
  },

  clearFeedback: () => set({ lastFeedback: null, lastFeedbackGood: null, lastStatDeltas: null }),

  completeRealm: (realm, score) =>
    set((state) => ({
      realm1Completed: realm === 1 ? true : state.realm1Completed,
      realm2Completed: realm === 2 ? true : state.realm2Completed,
      realm3Completed: realm === 3 ? true : state.realm3Completed,
      realm4Completed: realm === 4 ? true : state.realm4Completed,
      realm5Completed: realm === 5 ? true : state.realm5Completed,
      realm1Score: realm === 1 ? score : state.realm1Score,
      realm2Score: realm === 2 ? score : state.realm2Score,
      realm3Score: realm === 3 ? score : state.realm3Score,
      realm4Score: realm === 4 ? score : state.realm4Score,
      realm5Score: realm === 5 ? score : state.realm5Score,
    })),

  setMapPosition: (mapPosition) => set({ mapPosition }),

  startTransition: (transitionColor) => set({ transitioning: true, transitionColor }),
  endTransition: () => set({ transitioning: false }),

  incrementWrongCount: () => set((s) => ({ wrongCount: s.wrongCount + 1 })),
  resetWrongCount: () => set({ wrongCount: 0 }),

  toggleVoiceMode: () => set((s) => ({ voiceMode: !s.voiceMode })),

  resetGame: () =>
    set({
      screen: 'hub',
      stats: { ...initialStats },
      mapPosition: { x: 450, y: 300 },
      realm1Completed: false,
      realm2Completed: false,
      realm3Completed: false,
      realm4Completed: false,
      realm5Completed: false,
      realm1Score: 0,
      realm2Score: 0,
      realm3Score: 0,
      realm4Score: 0,
      realm5Score: 0,
      lastFeedback: null,
      lastFeedbackGood: null,
      lastStatDeltas: null,
      transitioning: false,
      wrongCount: 0,
    }),
}), {
  name: 'sakhi-ki-udaan-state',
  storage: createJSONStorage(() => localStorage),
}))

// ── Language helper ────────────────────────────────────────────
export function t3(hi: string, en: string, hinglish: string, lang: Language): string {
  if (lang === 'hi') return hi
  if (lang === 'en') return en
  return hinglish
}
