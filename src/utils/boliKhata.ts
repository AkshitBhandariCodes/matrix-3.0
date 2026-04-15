import { requestGeminiJson } from './geminiClient'

const GEMINI_MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || 'gemini-2.5-flash'

export interface BoliKhataCommand {
  amount: number
  intent: 'add' | 'repay' | 'unknown'
  note: string
  source: 'gemini' | 'fallback'
}

function normalizeDigits(input: string) {
  const devanagariDigits: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  }

  return input
    .split('')
    .map((char) => devanagariDigits[char] ?? char)
    .join('')
}

function normalizeToken(token: string) {
  return token
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .replace(/aa+/g, 'a')
    .replace(/ee+/g, 'e')
    .replace(/oo+/g, 'o')
}

const unitMap: Record<string, number> = {
  ek: 1, ik: 1, ikk: 1, एक: 1,
  do: 2, दो: 2,
  teen: 3, tin: 3, तीन: 3,
  char: 4, chaar: 4, चार: 4,
  paanch: 5, panch: 5, पांच: 5,
  cheh: 6, chhe: 6, छह: 6,
  saat: 7, sat: 7, सात: 7,
  aath: 8, आठ: 8,
  nau: 9, नो: 9, नौ: 9,
}

const tensMap: Record<string, number> = {
  das: 10, दस: 10,
  bees: 20, bis: 20, बीस: 20,
  tees: 30, tis: 30, तीस: 30,
  chalis: 40, chalisi: 40, चालीस: 40,
  pachaas: 50, पचास: 50,
  saath: 60, साठ: 60,
  sattar: 70, सत्तर: 70,
  assi: 80, ashi: 80, अस्सी: 80,
  nabbe: 90, नव्वे: 90,
}

function parseHindiWordsAmount(raw: string) {
  const text = normalizeDigits(raw)
  const directNumber = text.match(/(?:₹|rs\.?|rupaye?|rupey?|rupees?)?\s*(\d{1,6})/i)
  if (directNumber) {
    return Number(directNumber[1])
  }

  const tokens = text
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean)

  let total = 0
  let current = 0

  for (const token of tokens) {
    if (unitMap[token]) {
      current += unitMap[token]
      continue
    }

    if (tensMap[token]) {
      current += tensMap[token]
      continue
    }

    if (token === 'sau' || token === 'soo' || token === 'so' || token === 'hundred' || token === 'सौ') {
      current = (current || 1) * 100
      continue
    }

    if (token === 'hazar' || token === 'hazaar' || token === 'thousand' || token === 'हजार') {
      current = (current || 1) * 1000
      total += current
      current = 0
      continue
    }
  }

  const value = total + current
  return value > 0 ? value : 0
}

function parseIntent(raw: string): 'add' | 'repay' | 'unknown' {
  const text = raw.toLowerCase()
  if (/daalo|dalo|jodo|add|jama|save/.test(text)) return 'add'
  if (/loan|kisht|kis?t|repay|chuka|payment/.test(text)) return 'repay'
  return 'unknown'
}

function cleanNote(raw: string) {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 90)
}

function parseGeminiCommand(payload: unknown): Omit<BoliKhataCommand, 'source'> | null {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  const candidates = Array.isArray(record.candidates) ? record.candidates : []
  const text = candidates
    .flatMap((candidate) => {
      if (!candidate || typeof candidate !== 'object') return []
      const content = (candidate as Record<string, unknown>).content
      if (!content || typeof content !== 'object') return []
      const parts = Array.isArray((content as Record<string, unknown>).parts)
        ? ((content as Record<string, unknown>).parts as Array<Record<string, unknown>>)
        : []
      return parts
        .map((part) => (typeof part.text === 'string' ? part.text : ''))
        .filter(Boolean)
    })
    .join('\n')

  if (!text) return null

  try {
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    const jsonText = firstBrace >= 0 && lastBrace > firstBrace ? text.slice(firstBrace, lastBrace + 1) : text
    const parsed = JSON.parse(jsonText) as Record<string, unknown>

    const amount = typeof parsed.amount === 'number' ? parsed.amount : Number(parsed.amount)
    const intentRaw = typeof parsed.intent === 'string' ? parsed.intent : 'unknown'
    const intent = intentRaw === 'add' || intentRaw === 'repay' ? intentRaw : 'unknown'
    const note = typeof parsed.note === 'string' ? parsed.note : ''

    if (!Number.isFinite(amount) || amount <= 0) return null
    return {
      amount: Math.round(amount),
      intent,
      note: cleanNote(note),
    }
  } catch {
    return null
  }
}

async function parseWithGemini(utterance: string): Promise<Omit<BoliKhataCommand, 'source'> | null> {
  const prompt = [
    'You parse a Hindi/Hinglish money command for a rural ledger app.',
    'Return strict JSON only: {"amount": number, "intent": "add"|"repay"|"unknown", "note": string}',
    'Rules:',
    '- Understand spoken variants like: ik soo beees, ek sau bees, do hazar, paanchso, 120 rupay.',
    '- If user says add/daalo/jodo/jama => intent add.',
    '- If user says repay/kisht/chukao/payment => intent repay.',
    '- amount must be positive integer rupees.',
    '- note should be short user-facing summary in same language as utterance.',
    '',
    `Utterance: ${utterance}`,
  ].join('\n')

  const json = await requestGeminiJson({
    model: GEMINI_MODEL,
    bucket: 'boli-khata',
    retries: 1,
    body: {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 120,
      },
    },
  })

  return parseGeminiCommand(json)
}

export async function parseBoliKhataCommand(utterance: string): Promise<BoliKhataCommand | null> {
  const clean = cleanNote(normalizeDigits(utterance))
  if (!clean) return null

  try {
    const gemini = await parseWithGemini(clean)
    if (gemini) {
      return { ...gemini, source: 'gemini' }
    }
  } catch {
    // Fall back to local parser if Gemini fails or rate-limit hits.
  }

  const amount = parseHindiWordsAmount(clean)
  if (!amount) return null

  return {
    amount,
    intent: parseIntent(clean),
    note: clean,
    source: 'fallback',
  }
}
