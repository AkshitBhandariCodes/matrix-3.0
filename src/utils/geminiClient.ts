const GEMINI_API_BASE_URL = (import.meta.env.VITE_GEMINI_API_BASE_URL as string | undefined)?.trim() || 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() || ''

const LOCK_PREFIX = 'sakhi-gemini-lock-until:'
const MIN_GAP_MS = 900

const lastRequestByBucket = new Map<string, number>()

function canUseLocalStorage() {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function getLockKey(bucket: string) {
  return `${LOCK_PREFIX}${bucket}`
}

function readLockUntil(bucket: string) {
  if (!canUseLocalStorage()) return 0
  const raw = window.localStorage.getItem(getLockKey(bucket))
  const parsed = raw ? Number(raw) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

export function getGeminiBucketLockUntil(bucket: string) {
  return readLockUntil(bucket)
}

export function clearGeminiBucketLock(bucket: string) {
  writeLockUntil(bucket, 0)
}

function writeLockUntil(bucket: string, until: number) {
  if (!canUseLocalStorage()) return
  if (until > Date.now()) {
    window.localStorage.setItem(getLockKey(bucket), String(until))
  } else {
    window.localStorage.removeItem(getLockKey(bucket))
  }
}

function getNextLocalMidnightTimestamp() {
  const nextMidnight = new Date()
  nextMidnight.setHours(24, 0, 0, 0)
  return nextMidnight.getTime()
}

function parseRetryAfterMs(retryAfterHeader: string | null) {
  if (!retryAfterHeader) return null
  const asSeconds = Number(retryAfterHeader)
  if (Number.isFinite(asSeconds) && asSeconds > 0) return asSeconds * 1000

  const asDate = Date.parse(retryAfterHeader)
  if (Number.isFinite(asDate)) {
    const diff = asDate - Date.now()
    return diff > 0 ? diff : 0
  }

  return null
}

async function waitForRateWindow(bucket: string) {
  const now = Date.now()
  const last = lastRequestByBucket.get(bucket) ?? 0
  const waitMs = Math.max(0, MIN_GAP_MS - (now - last))
  if (waitMs > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, waitMs))
  }
  lastRequestByBucket.set(bucket, Date.now())
}

export function hasGeminiApiConfig() {
  return GEMINI_API_KEY.length > 0
}

export function isGeminiBucketLocked(bucket: string) {
  const lockUntil = readLockUntil(bucket)
  if (lockUntil <= Date.now()) {
    if (lockUntil !== 0) writeLockUntil(bucket, 0)
    return false
  }
  return true
}

export interface GeminiRequestOptions {
  model: string
  body: unknown
  bucket?: string
  signal?: AbortSignal
  retries?: number
}

export async function requestGeminiJson({
  model,
  body,
  bucket = 'default',
  signal,
  retries = 2,
}: GeminiRequestOptions): Promise<unknown> {
  if (!hasGeminiApiConfig()) {
    throw new Error('Gemini API key missing')
  }

  if (isGeminiBucketLocked(bucket)) {
    throw new Error(`Gemini bucket locked: ${bucket}`)
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await waitForRateWindow(bucket)

    const response = await fetch(`${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      signal,
      body: JSON.stringify(body),
    })

    if (response.ok) {
      return response.json()
    }

    const errorText = await response.text()

    if (response.status === 429) {
      const isDailyQuotaLimit = /GenerateRequestsPerDayPerProjectPerModel-FreeTier|quota exceeded|exceeded your current quota/i.test(errorText)
      if (isDailyQuotaLimit) {
        writeLockUntil(bucket, getNextLocalMidnightTimestamp())
      } else {
        const retryMs = parseRetryAfterMs(response.headers.get('retry-after')) ?? (30 * 1000)
        writeLockUntil(bucket, Date.now() + retryMs)
      }
      throw new Error(isDailyQuotaLimit ? 'Gemini daily quota exhausted' : 'Gemini rate limited')
    }

    lastError = new Error(errorText || `Gemini request failed with ${response.status}`)
    if (response.status < 500 || attempt === retries) {
      break
    }

    await new Promise((resolve) => window.setTimeout(resolve, 900 * (attempt + 1)))
  }

  throw lastError ?? new Error('Gemini request failed')
}
