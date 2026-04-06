import { useGameStore } from '../store/gameStore'

export function useLanguage() {
  const { language } = useGameStore()

  /**
   * Returns the value matching the current language.
   * Usage: t('हिंदी पाठ', 'English text')
   */
  const t = (hi: string, en: string): string => {
    return language === 'hi' ? hi : en
  }

  return { language, t }
}
