export type SpeechLang = 'hi' | 'en' | 'hinglish'

type SpeakEmotion = 'friendly' | 'excited' | 'calm' | 'urgent'

interface SpeakOptions {
  interrupt?: boolean
  rate?: number
  pitch?: number
  volume?: number
  emotion?: SpeakEmotion
  speed?: number
  cacheable?: boolean
}

export interface VoiceEngineInfo {
  provider: 'gemini-tts' | 'browser-fallback'
  online: boolean
  apiConfigured: boolean
  voiceId: string
  modelId: string
}

const GEMINI_API_BASE_URL = (import.meta.env.VITE_GEMINI_API_BASE_URL as string | undefined)?.trim() || 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() || ''
const GEMINI_TTS_MODEL = (import.meta.env.VITE_GEMINI_TTS_MODEL as string | undefined)?.trim() || 'gemini-2.5-flash-preview-tts'
const GEMINI_TTS_VOICE = (import.meta.env.VITE_GEMINI_TTS_VOICE as string | undefined)?.trim() || 'Achird'

const SAKHI_AUDIO_CACHE = 'sakhi-audio-v2'
const SAKHI_AUDIO_CACHE_LIMIT_BYTES = 8 * 1024 * 1024
const GEMINI_TTS_SAMPLE_RATE = 24000

export const SAKHI_PHRASES = [
  'Namaste Sakhi!',
  'Badhiya kaam!',
  'Dhyaan se suniye',
  'Loan repayment time!',
  'Wisdom plus 10!',
]

const DEVA_RX = /[\u0900-\u097F]/
const LATIN_RX = /[A-Za-z]/

let activeAudio: HTMLAudioElement | null = null
let cachedHindiVoice: SpeechSynthesisVoice | null = null
let cachedEnglishVoice: SpeechSynthesisVoice | null = null

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function hasWebSpeech() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function hasGeminiTtsConfig() {
  return GEMINI_API_KEY.length > 0
}

function canUseCacheApi() {
  return typeof window !== 'undefined' && 'caches' in window
}

function cacheKeyForText(text: string, lang: SpeechLang, emotion: SpeakEmotion) {
  return `${GEMINI_API_BASE_URL}/tts-cache/${GEMINI_TTS_MODEL}/${GEMINI_TTS_VOICE}/${lang}/${emotion}?text=${encodeURIComponent(text)}`
}

async function openAudioCache() {
  if (!canUseCacheApi()) return null
  try {
    return await caches.open(SAKHI_AUDIO_CACHE)
  } catch {
    return null
  }
}

async function getCacheUsageBytes(cache: Cache): Promise<number> {
  const keys = await cache.keys()
  let total = 0

  for (const key of keys) {
    const response = await cache.match(key)
    if (!response) continue
    const blob = await response.clone().blob()
    total += blob.size
  }

  return total
}

async function fitBlobInCache(cache: Cache, incomingBlobSize: number) {
  let usedBytes = await getCacheUsageBytes(cache)
  if (usedBytes + incomingBlobSize <= SAKHI_AUDIO_CACHE_LIMIT_BYTES) return

  const keys = await cache.keys()
  for (const key of keys) {
    if (usedBytes + incomingBlobSize <= SAKHI_AUDIO_CACHE_LIMIT_BYTES) break
    const existing = await cache.match(key)
    if (existing) {
      const blob = await existing.clone().blob()
      usedBytes -= blob.size
    }
    await cache.delete(key)
  }
}

async function getCachedAudio(text: string, lang: SpeechLang, emotion: SpeakEmotion): Promise<Blob | null> {
  const cache = await openAudioCache()
  if (!cache) return null

  const request = new Request(cacheKeyForText(text, lang, emotion))
  const response = await cache.match(request)
  if (!response) return null

  return response.clone().blob()
}

async function cacheAudio(text: string, lang: SpeechLang, emotion: SpeakEmotion, blob: Blob) {
  const cache = await openAudioCache()
  if (!cache) return

  await fitBlobInCache(cache, blob.size)
  const request = new Request(cacheKeyForText(text, lang, emotion))
  const response = new Response(blob, {
    headers: {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'max-age=604800',
    },
  })

  await cache.put(request, response)
}

function stopActiveAudio() {
  if (!activeAudio) return
  activeAudio.pause()
  activeAudio.currentTime = 0
  activeAudio = null
}

function loadVoices(): SpeechSynthesisVoice[] {
  if (!hasWebSpeech()) return []
  return window.speechSynthesis.getVoices()
}

function scoreHindiVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()
  let score = 0

  if (lang === 'hi-in') score += 100
  if (lang.startsWith('hi')) score += 70
  if (lang.includes('in')) score += 15
  if (name.includes('google') || name.includes('microsoft')) score += 15
  if (name.includes('neural') || name.includes('natural')) score += 14
  if (voice.default) score += 10

  return score
}

function scoreEnglishVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()
  let score = 0

  if (lang === 'en-in') score += 100
  if (lang.startsWith('en')) score += 60
  if (lang.includes('in')) score += 20
  if (name.includes('google') || name.includes('microsoft')) score += 15
  if (name.includes('neural') || name.includes('natural')) score += 12
  if (voice.default) score += 10

  return score
}

function findBestVoice(lang: 'hi' | 'en'): SpeechSynthesisVoice | null {
  const voices = loadVoices()
  if (!voices.length) return null

  if (lang === 'hi' && cachedHindiVoice) return cachedHindiVoice
  if (lang === 'en' && cachedEnglishVoice) return cachedEnglishVoice

  const scored = voices
    .map((voice) => ({
      voice,
      score: lang === 'hi' ? scoreHindiVoice(voice) : scoreEnglishVoice(voice),
    }))
    .sort((a, b) => b.score - a.score)

  const bestVoice = scored[0]?.voice ?? null
  if (lang === 'hi') cachedHindiVoice = bestVoice
  if (lang === 'en') cachedEnglishVoice = bestVoice
  return bestVoice
}

function normalizeTokenLang(token: string, previous: 'hi' | 'en'): 'hi' | 'en' {
  if (DEVA_RX.test(token)) return 'hi'
  if (LATIN_RX.test(token)) return 'en'
  return previous
}

function splitHinglishSegments(text: string): Array<{ text: string; lang: 'hi' | 'en' }> {
  const chunks = text
    .split(/([,.;!?\n])/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  if (!chunks.length) {
    return [{ text, lang: 'hi' }]
  }

  const segments: Array<{ text: string; lang: 'hi' | 'en' }> = []
  let previousLang: 'hi' | 'en' = 'hi'

  for (const chunk of chunks) {
    const lang = normalizeTokenLang(chunk, previousLang)
    const previous = segments[segments.length - 1]

    if (previous && previous.lang === lang) {
      previous.text = `${previous.text} ${chunk}`.trim()
    } else {
      segments.push({ text: chunk, lang })
    }

    previousLang = lang
  }

  return segments
}

const HINDI_SPEECH_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bSHG\b/gi, replacement: 'एस एच जी' },
  { pattern: /\bUPI\b/gi, replacement: 'यू पी आई' },
  { pattern: /\bDBT\b/gi, replacement: 'डी बी टी' },
  { pattern: /\bNRLM\b/gi, replacement: 'एन आर एल एम' },
  { pattern: /\bPM\b/gi, replacement: 'पी एम' },
  { pattern: /\bMUDRA\b/gi, replacement: 'मुद्रा' },
]

function normalizeSpeechTextForLang(text: string, lang: SpeechLang): string {
  let normalized = text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (lang !== 'hi') return normalized

  normalized = normalized
    .replace(/₹\s*([\d,]+)/g, '$1 रुपये')
    .replace(/\//g, ' ')
    .replace(/&/g, ' और ')

  for (const entry of HINDI_SPEECH_REPLACEMENTS) {
    normalized = normalized.replace(entry.pattern, entry.replacement)
  }

  return normalized.replace(/\s+/g, ' ').trim()
}

function getFallbackRate(lang: 'hi' | 'en', options: SpeakOptions) {
  if (typeof options.rate === 'number') return options.rate
  return lang === 'en' ? 0.98 : 0.93
}

function speakSegment(text: string, lang: 'hi' | 'en', options: SpeakOptions, onEnd?: () => void) {
  if (!hasWebSpeech()) return

  const utterance = new SpeechSynthesisUtterance(text)
  const selectedVoice = findBestVoice(lang)

  if (selectedVoice) {
    utterance.voice = selectedVoice
    utterance.lang = selectedVoice.lang
  } else {
    utterance.lang = lang === 'en' ? 'en-IN' : 'hi-IN'
  }

  utterance.rate = getFallbackRate(lang, options)
  utterance.pitch = options.pitch ?? 1.0
  utterance.volume = options.volume ?? 1.0
  if (onEnd) utterance.onend = onEnd

  window.speechSynthesis.speak(utterance)
}

export function speakFallback(text: string, lang: SpeechLang, options: SpeakOptions = {}) {
  if (!text.trim() || !hasWebSpeech()) return null

  if (options.interrupt !== false) {
    window.speechSynthesis.cancel()
  }

  if (lang !== 'hinglish') {
    speakSegment(text, lang === 'en' ? 'en' : 'hi', options)
    return null
  }

  const segments = splitHinglishSegments(text)
  let index = 0

  const playNext = () => {
    const next = segments[index]
    index += 1
    if (!next) return

    speakSegment(next.text, next.lang, { ...options, interrupt: false }, playNext)
  }

  playNext()
  return null
}

function getVoiceDirection(lang: SpeechLang, emotion: SpeakEmotion) {
  const style = emotion === 'urgent'
    ? 'clear, focused, slightly urgent but still supportive'
    : emotion === 'excited'
      ? 'encouraging, energetic, and celebratory'
      : emotion === 'calm'
        ? 'steady, warm, and reassuring'
        : 'friendly, caring, and easy to understand'

  const accent = lang === 'hi'
    ? 'Natural Indian Hindi with very clear pronunciation.'
    : lang === 'en'
      ? 'Indian English with warm, clear pronunciation.'
      : 'Natural Indian Hinglish with smooth Hindi-English code switching and strong Hindi pronunciation.'

  return { style, accent }
}

function buildGeminiTtsPrompt(text: string, lang: SpeechLang, emotion: SpeakEmotion) {
  const { style, accent } = getVoiceDirection(lang, emotion)

  return [
    '# AUDIO PROFILE: Sakhi Guide',
    '## THE SCENE: A supportive mentor is guiding a learner inside a mobile financial literacy game.',
    '### DIRECTORS NOTES',
    `Style: ${style}`,
    'Pacing: Medium pace, very clear, mobile-friendly, short pauses at commas and full stops.',
    `Accent: ${accent}`,
    '### TRANSCRIPT',
    text,
  ].join('\n')
}

function base64ToBytes(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i))
  }
}

function pcmToWavBlob(pcmBytes: Uint8Array, sampleRate = GEMINI_TTS_SAMPLE_RATE, channels = 1, bitsPerSample = 16) {
  const header = new ArrayBuffer(44)
  const view = new DataView(header)
  const byteRate = sampleRate * channels * (bitsPerSample / 8)
  const blockAlign = channels * (bitsPerSample / 8)
  const audioBytes = new Uint8Array(pcmBytes.byteLength)
  audioBytes.set(pcmBytes)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + pcmBytes.length, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, pcmBytes.length, true)

  return new Blob([header, audioBytes.buffer], { type: 'audio/wav' })
}

function extractGeminiAudioBase64(payload: unknown) {
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
      if (typeof data === 'string' && data.trim()) {
        return data
      }
    }
  }

  return null
}

async function requestGeminiAudio(
  text: string,
  {
    lang,
    emotion = 'friendly',
    cacheable = true,
  }: {
    lang: SpeechLang
    emotion?: SpeakEmotion
    cacheable?: boolean
  },
): Promise<Blob | null> {
  if (!hasGeminiTtsConfig()) return null

  if (cacheable) {
    const cached = await getCachedAudio(text, lang, emotion)
    if (cached) return cached
  }

  const response = await fetch(`${GEMINI_API_BASE_URL}/models/${encodeURIComponent(GEMINI_TTS_MODEL)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildGeminiTtsPrompt(text, lang, emotion),
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: GEMINI_TTS_VOICE,
            },
          },
        },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini TTS failed with status ${response.status}`)
  }

  const json = await response.json()
  const base64Audio = extractGeminiAudioBase64(json)
  if (!base64Audio) {
    throw new Error('Gemini TTS returned no audio payload')
  }

  const blob = pcmToWavBlob(base64ToBytes(base64Audio))

  if (cacheable) {
    void cacheAudio(text, lang, emotion, blob)
  }

  return blob
}

async function playAudioBlob(blob: Blob, speed = 1): Promise<HTMLAudioElement | null> {
  stopActiveAudio()

  const audioUrl = URL.createObjectURL(blob)
  const audio = new Audio(audioUrl)
  activeAudio = audio
  audio.preload = 'auto'
  audio.playbackRate = clamp(speed, 0.75, 1.25)

  const cleanup = () => {
    URL.revokeObjectURL(audioUrl)
    if (activeAudio === audio) activeAudio = null
  }

  audio.onended = cleanup
  audio.onerror = cleanup

  try {
    await audio.play()
    return audio
  } catch {
    cleanup()
    return null
  }
}

export function getVoiceEngineInfo(): VoiceEngineInfo {
  return {
    provider: isOnline() && hasGeminiTtsConfig() ? 'gemini-tts' : 'browser-fallback',
    online: isOnline(),
    apiConfigured: hasGeminiTtsConfig(),
    voiceId: GEMINI_TTS_VOICE,
    modelId: GEMINI_TTS_MODEL,
  }
}

export async function sakhiSpeak(
  text: string,
  {
    lang = 'hinglish',
    emotion = 'friendly',
    speed = 1,
    interrupt = true,
    cacheable = true,
    ...fallbackOptions
  }: SpeakOptions & { lang?: SpeechLang } = {},
): Promise<HTMLAudioElement | null> {
  const cleanText = text.trim()
  if (!cleanText) return null

  const speechText = normalizeSpeechTextForLang(cleanText, lang)
  if (!speechText) return null

  if (interrupt !== false) {
    stopSpeaking()
  }

  if (!isOnline() || !hasGeminiTtsConfig()) {
    return speakFallback(speechText, lang, { ...fallbackOptions, interrupt: false })
  }

  try {
    const blob = await requestGeminiAudio(speechText, { lang, emotion, cacheable })
    if (blob) {
      const audio = await playAudioBlob(blob, speed)
      if (audio) return audio
    }
  } catch {
    if (import.meta.env.DEV) {
      console.warn('Gemini TTS failed, using fallback Web Speech')
    }
  }

  return speakFallback(speechText, lang, { ...fallbackOptions, interrupt: false })
}

export function speak(text: string, lang: SpeechLang, options: SpeakOptions = {}) {
  void sakhiSpeak(text, { ...options, lang })
}

export function speakButton(text: string, lang: SpeechLang) {
  speak(text, lang, { emotion: 'friendly', speed: 1.0, rate: 1.0, volume: 0.95, interrupt: true })
}

export function stopSpeaking() {
  stopActiveAudio()
  if (hasWebSpeech()) {
    window.speechSynthesis.cancel()
  }
}

export async function preloadCriticalAudio() {
  if (!isOnline() || !hasGeminiTtsConfig()) return

  for (const phrase of SAKHI_PHRASES) {
    try {
      await requestGeminiAudio(phrase, { lang: 'hinglish', emotion: 'friendly', cacheable: true })
    } catch {
      // Ignore preload failures; runtime fallback handles it.
    }
  }
}

if (hasWebSpeech()) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedHindiVoice = null
    cachedEnglishVoice = null
    loadVoices()
  }
  loadVoices()
}
