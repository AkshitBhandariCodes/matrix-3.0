import { requestGeminiJson } from './geminiClient'

const GEMINI_MODEL = (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || 'gemini-2.5-flash'

export type SavingsVoiceAction = 'set_salary' | 'add_expense' | 'save_money' | 'unknown'

export interface SavingsVoiceCommand {
  action: SavingsVoiceAction
  amount: number
  note: string
  source: 'gemini' | 'fallback'
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Failed to read audio blob'))
        return
      }
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Failed to extract base64 audio'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Audio read failed'))
    reader.readAsDataURL(blob)
  })
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
  nau: 9, नौ: 9,
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

function cleanNote(raw: string) {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 100)
}

function fallbackAction(raw: string): SavingsVoiceAction {
  const text = raw.toLowerCase()
  if (/salary|tankhwa|tankha|vetan|income|kamai/.test(text)) return 'set_salary'
  if (/expense|kharcha|kharche|spend|bill|rent|kiraya|sabzi/.test(text)) return 'add_expense'
  if (/save|bachat|jama|deposit|daalo|dalo|jodo/.test(text)) return 'save_money'
  return 'unknown'
}

function parseGeminiPayload(payload: unknown): Omit<SavingsVoiceCommand, 'source'> | null {
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
    const actionRaw = typeof parsed.action === 'string' ? parsed.action : 'unknown'
    const action: SavingsVoiceAction = actionRaw === 'set_salary' || actionRaw === 'add_expense' || actionRaw === 'save_money'
      ? actionRaw
      : 'unknown'

    const note = typeof parsed.note === 'string' ? parsed.note : ''

    if (!Number.isFinite(amount) || amount <= 0) return null

    return {
      action,
      amount: Math.round(amount),
      note: cleanNote(note),
    }
  } catch {
    return null
  }
}

function extractCandidateText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''

  const record = payload as Record<string, unknown>
  const candidates = Array.isArray(record.candidates) ? record.candidates : []

  return candidates
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
    .join(' ')
    .trim()
}

async function parseWithGemini(utterance: string): Promise<Omit<SavingsVoiceCommand, 'source'> | null> {
  const prompt = [
    'You parse one Hindi/Hinglish command for a rural women savings app.',
    'Return strict JSON only: {"action":"set_salary"|"add_expense"|"save_money"|"unknown","amount":number,"note":string}',
    'Map user intent as follows:',
    '- set_salary: mentions salary, income, tankhwa, vetan, kamai.',
    '- add_expense: mentions kharcha, expense, rent, bill, spent, kiraya, sabzi.',
    '- save_money: mentions bachat, save, jama, deposit, daalo, jodo.',
    'Must understand amount variants like: ik soo beees, ek sau bees, do hazar, paanchso, 120 rupay.',
    'amount must be positive integer rupees.',
    'note should be short and user-facing in the same language tone as utterance.',
    '',
    `Utterance: ${utterance}`,
  ].join('\n')

  const json = await requestGeminiJson({
    model: GEMINI_MODEL,
    bucket: 'savings-voice',
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
        maxOutputTokens: 140,
      },
    },
  })

  return parseGeminiPayload(json)
}

export async function parseSavingsAudioCommand(audioBlob: Blob, mimeType = 'audio/webm'): Promise<SavingsVoiceCommand | null> {
  const base64Audio = await blobToBase64(audioBlob)

  const prompt = [
    'You are parsing one Hindi/Hinglish spoken money command for a rural women savings app.',
    'Return strict JSON only: {"action":"set_salary"|"add_expense"|"save_money"|"unknown","amount":number,"note":string}',
    'Map intent exactly:',
    '- set_salary: salary, income, tankhwa, vetan, kamai.',
    '- add_expense: kharcha, expense, spent, bill, rent, kiraya, sabzi.',
    '- save_money: bachat, save, jama, deposit, daalo, jodo.',
    'Understand spoken number variants like: ik soo beees, ek sau bees, do hazar, paanchso, 120 rupay.',
    'amount must be positive integer rupees.',
  ].join('\n')

  const json = await requestGeminiJson({
    model: GEMINI_MODEL,
    bucket: 'savings-voice',
    retries: 1,
    body: {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Audio,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 160,
      },
    },
  })

  const parsed = parseGeminiPayload(json)
  return parsed ? { ...parsed, source: 'gemini' } : null
}

export async function transcribeSavingsAudio(audioBlob: Blob, mimeType = 'audio/webm'): Promise<string> {
  const base64Audio = await blobToBase64(audioBlob)

  const json = await requestGeminiJson({
    model: GEMINI_MODEL,
    bucket: 'savings-voice',
    retries: 1,
    body: {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: [
                'Transcribe the spoken audio to plain text exactly as spoken.',
                'Do not summarize. Do not translate unless absolutely necessary for readability.',
                'Return only the transcription text, no JSON, no labels.',
              ].join('\n'),
            },
            {
              inlineData: {
                mimeType,
                data: base64Audio,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 160,
      },
    },
  })

  return cleanNote(extractCandidateText(json))
}

export async function parseSavingsVoiceCommand(utterance: string): Promise<SavingsVoiceCommand | null> {
  const clean = cleanNote(normalizeDigits(utterance))
  if (!clean) return null

  try {
    const gemini = await parseWithGemini(clean)
    if (gemini) {
      return { ...gemini, source: 'gemini' }
    }
  } catch {
    // Fallback to local parser when Gemini is unavailable.
  }

  const amount = parseHindiWordsAmount(clean)
  if (!amount) return null

  return {
    action: fallbackAction(clean),
    amount,
    note: clean,
    source: 'fallback',
  }
}
