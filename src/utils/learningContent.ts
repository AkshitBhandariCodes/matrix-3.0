import type { Challenge, Choice, Realm } from '../data/realms'
import { useGameStore, type Language } from '../store/gameStore'
import type { LearningContent } from '../types/learning'
import type { ShgScheme } from '../data/shgSchemes'

interface LearningRequest {
  realm: Realm
  challenge: Challenge
  choice: Choice
  language: Language
  playerName: string
}

export interface SchemeGuideContent {
  title: string
  explanation: string
  action: string
  source: 'gemini' | 'static'
}

interface SchemeGuideRequest {
  scheme: ShgScheme
  language: Language
}

const GEMINI_API_BASE_URL = import.meta.env.VITE_GEMINI_API_BASE_URL?.trim() || 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim()
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL?.trim() || 'gemini-2.5-flash'
const LEARNING_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    explanation: { type: 'string' },
    learning: { type: 'string' },
  },
  required: ['answer', 'explanation', 'learning'],
}
const SCHEME_GUIDE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    explanation: { type: 'string' },
    action: { type: 'string' },
  },
  required: ['title', 'explanation', 'action'],
}

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
  return useGameStore.getState().learningContentCache[key] ?? null
}

function setCacheEntry(key: string, value: LearningContent) {
  useGameStore.getState().setLearningContentCacheEntry(key, value)
}

function getCacheKey({ realm, challenge, choice, language }: LearningRequest) {
  const mode = GEMINI_API_KEY ? 'gemini' : 'static'
  return [realm.id, challenge.id, choice.id, language, GEMINI_MODEL, mode].join(':')
}

function getSchemeGuideCacheKey({ scheme, language }: SchemeGuideRequest) {
  const mode = GEMINI_API_KEY ? 'gemini' : 'static'
  return ['scheme-guide', scheme.id, language, GEMINI_MODEL, mode].join(':')
}

function buildPrompt({ realm, challenge, choice, language, playerName }: LearningRequest) {
  const requestedLanguage = language === 'hi'
    ? 'Hindi'
    : language === 'en'
      ? 'English'
      : 'Hinglish'

  return [
    'You are generating short educational feedback for a mobile financial-literacy game.',
    'The question must stay tied to the provided static data.',
    'Ground every line only in the provided static data.',
    'Do not invent new schemes, numbers, facts, links, or characters.',
    'Keep each field concise and friendly for low-end mobile screens.',
    'If the choice is correct, appreciate briefly and reinforce why it is right.',
    'If the choice is wrong, explain gently and clearly what should happen instead.',
    `Write only in ${requestedLanguage}.`,
    'Return strict JSON only with keys: answer, explanation, learning.',
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

function buildSchemeGuidePrompt({ scheme, language }: SchemeGuideRequest) {
  const requestedLanguage = language === 'hi'
    ? 'Hindi'
    : language === 'en'
      ? 'English'
      : 'Hinglish'

  return [
    'You are generating a very short voice-friendly scheme guide for a mobile SHG learning game.',
    'Ground every line only in the provided static data.',
    'Do not invent new numbers, benefits, rules, or websites.',
    'Keep the output brief, practical, and easy to hear in audio.',
    `Write only in ${requestedLanguage}.`,
    'Return strict JSON only with keys: title, explanation, action.',
    '',
    'Static scheme data:',
    JSON.stringify({
      id: scheme.id,
      title: scheme.title,
      summary: scheme.summary,
      steps: scheme.steps,
      url: scheme.url,
    }, null, 2),
  ].join('\n')
}

function parseLearningJson(rawText: string | null) {
  if (!rawText) return null

  const trimmed = rawText.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    if (typeof parsed.answer === 'string' && typeof parsed.explanation === 'string' && typeof parsed.learning === 'string') {
      return {
        answer: parsed.answer,
        explanation: parsed.explanation,
        learning: parsed.learning,
      }
    }
  } catch {
    // Fall through and try extracting the JSON object from surrounding text.
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) return null

  try {
    const parsed = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>
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

function extractTextPayload(payload: unknown) {
  if (!payload) return null

  if (typeof payload === 'string') {
    return parseLearningJson(payload)
  }

  if (typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  if (typeof record.answer === 'string' && typeof record.explanation === 'string' && typeof record.learning === 'string') {
    return {
      answer: record.answer,
      explanation: record.explanation,
      learning: record.learning,
    }
  }

  const directText = typeof record.text === 'string'
    ? record.text
    : typeof record.output_text === 'string'
      ? record.output_text
      : null

  if (directText) {
    return parseLearningJson(directText)
  }

  const candidates = Array.isArray(record.candidates) ? record.candidates : []
  const candidateText = candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== 'object') return []
      const content = (candidate as Record<string, unknown>).content
      if (!content || typeof content !== 'object') return []
      const parts = Array.isArray((content as Record<string, unknown>).parts)
        ? (content as Record<string, unknown>).parts as Array<Record<string, unknown>>
        : []
      return parts
        .map((part) => typeof part?.text === 'string' ? part.text : '')
        .filter(Boolean)
    })
    .join('\n')

  return parseLearningJson(candidateText || null)
}

function parseSchemeGuideJson(rawText: string | null) {
  if (!rawText) return null

  const trimmed = rawText.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    if (typeof parsed.title === 'string' && typeof parsed.explanation === 'string' && typeof parsed.action === 'string') {
      return {
        title: parsed.title,
        explanation: parsed.explanation,
        action: parsed.action,
      }
    }
  } catch {
    // Fall through and try extracting the JSON object from surrounding text.
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) return null

  try {
    const parsed = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>
    if (typeof parsed.title === 'string' && typeof parsed.explanation === 'string' && typeof parsed.action === 'string') {
      return {
        title: parsed.title,
        explanation: parsed.explanation,
        action: parsed.action,
      }
    }
  } catch {
    return null
  }

  return null
}

function extractSchemeGuidePayload(payload: unknown) {
  if (!payload) return null

  if (typeof payload === 'string') {
    return parseSchemeGuideJson(payload)
  }

  if (typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  if (typeof record.title === 'string' && typeof record.explanation === 'string' && typeof record.action === 'string') {
    return {
      title: record.title,
      explanation: record.explanation,
      action: record.action,
    }
  }

  const directText = typeof record.text === 'string'
    ? record.text
    : typeof record.output_text === 'string'
      ? record.output_text
      : null

  if (directText) {
    return parseSchemeGuideJson(directText)
  }

  const candidates = Array.isArray(record.candidates) ? record.candidates : []
  const candidateText = candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== 'object') return []
      const content = (candidate as Record<string, unknown>).content
      if (!content || typeof content !== 'object') return []
      const parts = Array.isArray((content as Record<string, unknown>).parts)
        ? (content as Record<string, unknown>).parts as Array<Record<string, unknown>>
        : []
      return parts
        .map((part) => typeof part?.text === 'string' ? part.text : '')
        .filter(Boolean)
    })
    .join('\n')

  return parseSchemeGuideJson(candidateText || null)
}

async function requestGeminiLearningContent(request: LearningRequest) {
  if (!GEMINI_API_KEY) return null

  const response = await fetch(`${GEMINI_API_BASE_URL}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildPrompt(request) }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 320,
        responseMimeType: 'application/json',
        responseJsonSchema: LEARNING_RESPONSE_SCHEMA,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`)
  }

  return extractTextPayload(await response.json())
}

async function requestGeminiSchemeGuide(request: SchemeGuideRequest) {
  if (!GEMINI_API_KEY) return null

  const response = await fetch(`${GEMINI_API_BASE_URL}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildSchemeGuidePrompt(request) }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 320,
        responseMimeType: 'application/json',
        responseJsonSchema: SCHEME_GUIDE_RESPONSE_SCHEMA,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini scheme guide failed with ${response.status}`)
  }

  return extractSchemeGuidePayload(await response.json())
}

export async function getAdaptiveLearningContent(request: LearningRequest): Promise<LearningContent> {
  const fallback = getFallbackLearningContent(request)
  const cacheKey = getCacheKey(request)

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setCacheEntry(cacheKey, fallback)
    return fallback
  }

  const cached = getCacheEntry(cacheKey)
  if (cached) {
    return cached
  }

  if (!GEMINI_API_KEY) {
    setCacheEntry(cacheKey, fallback)
    return fallback
  }

  try {
    const content = await requestGeminiLearningContent(request)
    if (!content) {
      setCacheEntry(cacheKey, fallback)
      return fallback
    }

    const normalized: LearningContent = {
      answer: content.answer.trim() || fallback.answer,
      explanation: content.explanation.trim() || fallback.explanation,
      learning: content.learning.trim() || fallback.learning,
      source: 'gemini',
    }

    setCacheEntry(cacheKey, normalized)
    return normalized
  } catch {
    setCacheEntry(cacheKey, fallback)
    return fallback
  }
}

function getFallbackSchemeGuide({ scheme, language }: SchemeGuideRequest): SchemeGuideContent {
  return {
    title: t3(scheme.title.hi, scheme.title.en, scheme.title.hinglish, language),
    explanation: t3(scheme.summary.hi, scheme.summary.en, scheme.summary.hinglish, language),
    action: t3(scheme.steps.hi, scheme.steps.en, scheme.steps.hinglish, language),
    source: 'static',
  }
}

export async function getAdaptiveSchemeGuide(request: SchemeGuideRequest): Promise<SchemeGuideContent> {
  const fallback = getFallbackSchemeGuide(request)
  const cacheKey = getSchemeGuideCacheKey(request)

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return fallback
  }

  const cached = useGameStore.getState().learningContentCache[cacheKey] as unknown as SchemeGuideContent | undefined
  if (cached?.title && cached?.explanation && cached?.action) {
    return cached
  }

  if (!GEMINI_API_KEY) {
    return fallback
  }

  try {
    const content = await requestGeminiSchemeGuide(request)
    if (!content) return fallback

    const normalized: SchemeGuideContent = {
      title: content.title.trim() || fallback.title,
      explanation: content.explanation.trim() || fallback.explanation,
      action: content.action.trim() || fallback.action,
      source: 'gemini',
    }

    useGameStore.getState().setLearningContentCacheEntry(cacheKey, normalized as unknown as LearningContent)
    return normalized
  } catch {
    return fallback
  }
}

export function formatSchemeGuideForSpeech(content: SchemeGuideContent) {
  return [content.title, content.explanation, content.action].filter(Boolean).join('. ')
}

export function formatLearningContent(content: LearningContent, language: Language) {
  const labels = language === 'hi'
    ? { answer: 'Uttar', explanation: 'Samjho', learning: 'Seekh' }
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
