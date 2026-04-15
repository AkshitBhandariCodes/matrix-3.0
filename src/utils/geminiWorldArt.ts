import { hasGeminiApiConfig, requestGeminiJson } from './geminiClient'

const GEMINI_IMAGE_MODEL = (import.meta.env.VITE_GEMINI_IMAGE_MODEL as string | undefined)?.trim() || 'gemini-2.0-flash-preview-image-generation'

export interface GeminiWorldArtResult {
  imageDataUrl: string | null
  source: 'gemini' | 'fallback'
  reason: string
}

function extractInlineImage(payload: unknown): { mimeType: string; data: string } | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  const candidates = Array.isArray(record.candidates) ? record.candidates : []

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const content = (candidate as Record<string, unknown>).content
    if (!content || typeof content !== 'object') continue

    const parts = Array.isArray((content as Record<string, unknown>).parts)
      ? (content as Record<string, unknown>).parts as Array<Record<string, unknown>>
      : []

    for (const part of parts) {
      const inlineData = part.inlineData
      if (!inlineData || typeof inlineData !== 'object') continue
      const data = (inlineData as Record<string, unknown>).data
      const mimeType = (inlineData as Record<string, unknown>).mimeType
      if (typeof data !== 'string' || !data.trim()) continue
      if (typeof mimeType !== 'string' || !mimeType.startsWith('image/')) continue
      return { mimeType, data }
    }
  }

  return null
}

export async function generateGeminiWorldArt(prompt: string): Promise<GeminiWorldArtResult> {
  const cleanPrompt = prompt.trim()
  if (!cleanPrompt) {
    return { imageDataUrl: null, source: 'fallback', reason: 'empty-prompt' }
  }

  if (!hasGeminiApiConfig()) {
    return { imageDataUrl: null, source: 'fallback', reason: 'missing-api-key' }
  }

  try {
    const payload = await requestGeminiJson({
      model: GEMINI_IMAGE_MODEL,
      bucket: 'world-art',
      retries: 1,
      body: {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: [
                  'Create one cinematic game background in 16:9 landscape format.',
                  'Style: painterly fantasy, warm rural India, hopeful and immersive.',
                  'No text overlays, no logos, no watermarks.',
                  cleanPrompt,
                ].join('\n'),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          responseModalities: ['IMAGE', 'TEXT'],
        },
      },
    })

    const image = extractInlineImage(payload)
    if (!image) {
      return { imageDataUrl: null, source: 'fallback', reason: 'no-image-returned' }
    }

    return {
      imageDataUrl: `data:${image.mimeType};base64,${image.data}`,
      source: 'gemini',
      reason: 'ok',
    }
  } catch (error) {
    return {
      imageDataUrl: null,
      source: 'fallback',
      reason: (error as Error).message || 'image-generation-failed',
    }
  }
}
