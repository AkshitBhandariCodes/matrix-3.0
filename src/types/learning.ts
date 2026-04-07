export type LearningSource = 'gemini' | 'static'

export interface LearningContent {
  answer: string
  explanation: string
  learning: string
  source: LearningSource
}
