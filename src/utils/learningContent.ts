import type { Challenge, Choice, Realm } from '../data/realms'
import type { Language } from '../store/gameStore'

export interface LearningContent {
  answer: string
  explanation: string
  learning: string
  source: 'openai' | 'static'
}

interface LearningRequest {
  realm: Realm
  challenge: Challenge
  choice: Choice
  language: Language
  playerName: string
}

const OPENAI_PROXY_URL = import.meta.env.VITE_OPENAI_PROXY_URL?.trim()
const OPENAI_API_BASE_URL = import.meta.env.VITE_OPENAI_API_BASE_URL?.trim() || 'https://api.openai.com/v1'
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY?.trim()
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL?.trim() || 'gpt-5.4-mini'
const CACHE_KEY = 'sakhi-learning-cache-v1'

function t3(hi: string, en: string, hinglish: string, language: Language) {
  if (language === 'hi') return hi
  if (language === 'en') return en
  return hinglish
}

function getFallbackLearningContent({ choice, language }: LearningRequest): LearningContent {
  const answer = t3(choice.feedback_hi, choice.feedback_en, choice.feedback_hinglish, language)
  const explanation = t3(
    choice.explanation_hi ?? choice.feedback_hi,
    choice.explanation_en ?? choice.feedback_en,
    choice.explanation_hinglish ?? choice.feedback_hinglish,
    language,
  )

  return {
    answer,
    explanation,
    learning: explanation,
    source: 'static',
  }
}

function getCacheEntry(key: string): LearningContent | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cache = JSON.parse(raw) as Record<string, LearningContent>
    return cache[key] ?? null
  } catch {
    return null
  }
}

function setCacheEntry(key: string, value: LearningContent) {
  if (typeof window === 'undefined') return

  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    const cache = raw ? JSON.parse(raw) as Record<string, LearningContent> : {}
    cache[key] = value
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore cache failures on restricted browsers.
  }
}

function getCacheKey({ realm, challenge, choice, language }: LearningRequest) {
  return [realm.id, challenge.id, choice.id, language, OPENAI_MODEL].join(':')
}

function buildPrompt({ realm, challenge, choice, language, playerName }: LearningRequest) {
  const requestedLanguage = language === 'hi'
    ? 'Hindi'
    : language === 'en'
      ? 'English'
      : 'Hinglish'

  return [
    'You are generating short educational feedback for a mobile financial-literacy game.',
    'Ground every line only in the provided static data.',
    'Do not invent new schemes, numbers, facts, or characters.',
    'Keep each field concise and friendly for low-end mobile screens.',
    `Write only in ${requestedLanguage}.`,
    'Return strict JSON with keys: answer, explanation, learning.',
    '',
    'Static game data:',
    JSON.stringify({
      realmTitle: {
        hi: realm.title_hi,
        en: realm.title_en,
        hinglish: realm.title_hinglish,
      },
      playerName,
      challenge: {
        id: challenge.id,
        title: {
          hi: challenge.title_hi,
          en: challenge.title_en,
          hinglish: challenge.title_hinglish,
        },
        guideIntro: {
          hi: challenge.guideIntro_hi,
          en: challenge.guideIntro_en,
          hinglish: challenge.guideIntro_hinglish,
        },
        scenario: {
          hi: challenge.scenario_hi,
          en: challenge.scenario_en,
          hinglish: challenge.scenario_hinglish,
        },
      },
      selectedChoice: {
        id: choice.id,
        isGood: choice.isGood,
        text: {
          hi: choice.text_hi,
          en: choice.text_en,
          hinglish: choice.text_hinglish,
        },
        staticAnswer: {
          hi: choice.feedback_hi,
          en: choice.feedback_en,
          hinglish: choice.feedback_hinglish,
        },
        staticExplanation: {
          hi: choice.explanation_hi ?? choice.feedback_hi,
          en: choice.explanation_en ?? choice.feedback_en,
          hinglish: choice.explanation_hinglish ?? choice.feedback_hinglish,
        },
        outcome: choice.outcome,
      },
    }, null, 2),
  ].join('\n')
}

function extractTextPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  if (typeof record.answer === 'string' && typeof record.explanation === 'string' && typeof record.learning === 'string') {
    return {
      answer: record.answer,
      explanation: record.explanation,
      learning: record.learning,
    }
  }

  const outputText = typeof record.output_text === 'string'
    ? record.output_text
    : typeof record.text === 'string'
      ? record.text
      : null

  if (!outputText) return null

  const firstBrace = outputText.indexOf('{')
  const lastBrace = outputText.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) return null

  try {
    const parsed = JSON.parse(outputText.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>
    if (typeof parsed.answer === 'string' && typeof parsed.explanation === 'string' && typeof parsed.learning === 'string') {
      return {
        answer: parsed.answer,
        explanation: parsed.explanation,
        learning: parsed.learning,
      }
    }
  } catch {
    return null
  }

  return null
}

async function requestOpenAILearningContent(request: LearningRequest) {
  const prompt = buildPrompt(request)

  if (OPENAI_PROXY_URL) {
    const response = await fetch(OPENAI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: prompt,
      }),
    })

    if (!response.ok) {
      throw new Error(`Proxy request failed with ${response.status}`)
    }

    return extractTextPayload(await response.json())
  }

  if (!OPENAI_API_KEY) {
    return null
  }

  const response = await fetch(`${OPENAI_API_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: prompt,
      max_output_tokens: 220,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}`)
  }

  return extractTextPayload(await response.json())
}

export async function getAdaptiveLearningContent(request: LearningRequest): Promise<LearningContent> {
  const fallback = getFallbackLearningContent(request)

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return fallback
  }

  const cacheKey = getCacheKey(request)
  const cached = getCacheEntry(cacheKey)
  if (cached) {
    return cached
  }

  if (!OPENAI_PROXY_URL && !OPENAI_API_KEY) {
    return fallback
  }

  try {
    const content = await requestOpenAILearningContent(request)
    if (!content) return fallback

    const normalized: LearningContent = {
      answer: content.answer.trim() || fallback.answer,
      explanation: content.explanation.trim() || fallback.explanation,
      learning: content.learning.trim() || fallback.learning,
      source: 'openai',
    }

    setCacheEntry(cacheKey, normalized)
    return normalized
  } catch {
    return fallback
  }
}

export function formatLearningContent(content: LearningContent, language: Language) {
  const labels = language === 'hi'
    ? { answer: 'उत्तर', explanation: 'समझ', learning: 'सीख' }
    : language === 'en'
      ? { answer: 'Answer', explanation: 'Explanation', learning: 'Learning' }
      : { answer: 'Answer', explanation: 'Samjho', learning: 'Learning' }

  const sections = [`${labels.answer}: ${content.answer}`]

  if (content.explanation && content.explanation !== content.answer) {
    sections.push(`${labels.explanation}: ${content.explanation}`)
  }

  if (
    content.learning &&
    content.learning !== content.answer &&
    content.learning !== content.explanation
  ) {
    sections.push(`${labels.learning}: ${content.learning}`)
  }

  return sections.join('\n\n')
}
