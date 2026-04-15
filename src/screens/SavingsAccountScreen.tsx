import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore, t3 } from '../store/gameStore'
import { ArrowLeft, Mic, PiggyBank, IndianRupee, Wallet, TrendingUp, Loader2, Volume2, VolumeX, PlayCircle, RotateCcw } from 'lucide-react'
import { parseSavingsVoiceCommand, transcribeSavingsAudio, type SavingsVoiceCommand } from '../utils/savingsVoice'
import { getVoiceEngineDiagnostics, getVoiceEngineInfo, resetAltCloudTtsLock, resetGeminiTtsLock } from '../utils/speech'
import { preloadBoliKhataBundledAudio, speakBoliKhataGuide } from '../utils/boliKhataSpeech'

type SpeechRecognitionCtor = new () => SpeechRecognition

type SpeechRecognition = {
  lang: string
  continuous?: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart?: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionEvent = {
  resultIndex?: number
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

interface ExpenseEntry {
  id: string
  amount: number
  note: string
}

const SAVINGS_OFFLINE_KEY = 'sakhi-savings-account-v1'

function readInitialSavingsState() {
  if (typeof window === 'undefined') {
    return {
      salary: 12000,
      savingsBalance: 0,
      interestRate: 7.5,
      fdPrincipal: 10000,
      rdMonthlyDeposit: 1000,
      investmentYears: 3,
      expenses: [] as ExpenseEntry[],
    }
  }

  try {
    const raw = window.localStorage.getItem(SAVINGS_OFFLINE_KEY)
    if (!raw) {
      return {
        salary: 12000,
        savingsBalance: 0,
        interestRate: 7.5,
        fdPrincipal: 10000,
        rdMonthlyDeposit: 1000,
        investmentYears: 3,
        expenses: [] as ExpenseEntry[],
      }
    }

    const parsed = JSON.parse(raw) as Partial<{
      salary: number
      savingsBalance: number
      interestRate: number
      fdPrincipal: number
      rdMonthlyDeposit: number
      investmentYears: number
      expenses: ExpenseEntry[]
    }>

    return {
      salary: Number(parsed.salary) > 0 ? Number(parsed.salary) : 12000,
      savingsBalance: Number(parsed.savingsBalance) >= 0 ? Number(parsed.savingsBalance) : 0,
      interestRate: Number(parsed.interestRate) > 0 ? Number(parsed.interestRate) : 7.5,
      fdPrincipal: Number(parsed.fdPrincipal) > 0 ? Number(parsed.fdPrincipal) : 10000,
      rdMonthlyDeposit: Number(parsed.rdMonthlyDeposit) > 0 ? Number(parsed.rdMonthlyDeposit) : 1000,
      investmentYears: Number(parsed.investmentYears) > 0 ? Number(parsed.investmentYears) : 3,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses.slice(0, 20) : [],
    }
  } catch {
    return {
      salary: 12000,
      savingsBalance: 0,
      interestRate: 7.5,
      fdPrincipal: 10000,
      rdMonthlyDeposit: 1000,
      investmentYears: 3,
      expenses: [] as ExpenseEntry[],
    }
  }
}

export const SavingsAccountScreen: React.FC = () => {
  const { language, setLanguage, setScreen, voiceMode, toggleVoiceMode } = useGameStore()
  const tt = (hi: string, en: string, hg: string) => t3(hi, en, hg, language)

  const [initialState] = useState(() => readInitialSavingsState())
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  const [salary, setSalary] = useState(initialState.salary)
  const [savingsBalance, setSavingsBalance] = useState(initialState.savingsBalance)
  const [interestRate, setInterestRate] = useState(initialState.interestRate)
  const [fdPrincipal, setFdPrincipal] = useState(initialState.fdPrincipal)
  const [rdMonthlyDeposit, setRdMonthlyDeposit] = useState(initialState.rdMonthlyDeposit)
  const [investmentYears, setInvestmentYears] = useState(initialState.investmentYears)
  const [commandInput, setCommandInput] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(initialState.expenses)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaChunksRef = useRef<Blob[]>([])
  const autoStopTimeoutRef = useRef<number | null>(null)

  const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + item.amount, 0), [expenses])
  const monthlyLeft = Math.max(0, salary - totalExpenses)

  const projectedYearEnd = useMemo(() => {
    const monthlySavings = monthlyLeft
    const principalGrowth = savingsBalance + monthlySavings * 12
    const averagePrincipal = savingsBalance + monthlySavings * 6
    const yearlyInterest = (averagePrincipal * interestRate) / 100
    return Math.round(principalGrowth + yearlyInterest)
  }, [interestRate, monthlyLeft, savingsBalance])

  const fdProjection = useMemo(() => {
    const yearlyRate = interestRate / 100
    const compoundsPerYear = 4
    const maturity = fdPrincipal * Math.pow(1 + (yearlyRate / compoundsPerYear), compoundsPerYear * investmentYears)
    const invested = fdPrincipal
    const interestEarned = maturity - invested

    return {
      invested: Math.round(invested),
      maturity: Math.round(maturity),
      interestEarned: Math.round(interestEarned),
    }
  }, [fdPrincipal, interestRate, investmentYears])

  const rdProjection = useMemo(() => {
    const monthlyRate = (interestRate / 100) / 12
    const months = investmentYears * 12
    let balance = 0

    for (let month = 0; month < months; month += 1) {
      balance = (balance + rdMonthlyDeposit) * (1 + monthlyRate)
    }

    const invested = rdMonthlyDeposit * months
    const maturity = balance
    const interestEarned = maturity - invested

    return {
      months,
      invested: Math.round(invested),
      maturity: Math.round(maturity),
      interestEarned: Math.round(interestEarned),
    }
  }, [interestRate, investmentYears, rdMonthlyDeposit])

  const formatMoney = (value: number) => new Intl.NumberFormat('en-IN').format(Math.round(value))

  const fdRdSmartGuide = useMemo(() => {
    const fdWins = fdProjection.maturity >= rdProjection.maturity
    const maturityDiff = Math.abs(fdProjection.maturity - rdProjection.maturity)
    const fdLabel = tt('FD', 'FD', 'FD')
    const rdLabel = tt('RD', 'RD', 'RD')
    const winner = fdWins ? fdLabel : rdLabel

    const summary = tt(
      `${investmentYears} साल में ${fdLabel} maturity ₹${formatMoney(fdProjection.maturity)} और ${rdLabel} maturity ₹${formatMoney(rdProjection.maturity)} है।`,
      `In ${investmentYears} years, ${fdLabel} maturity is ₹${formatMoney(fdProjection.maturity)} and ${rdLabel} maturity is ₹${formatMoney(rdProjection.maturity)}.`,
      `${investmentYears} saal mein ${fdLabel} maturity ₹${formatMoney(fdProjection.maturity)} aur ${rdLabel} maturity ₹${formatMoney(rdProjection.maturity)} hai.`,
    )

    const comparison = tt(
      `अभी के डेटा में ${winner} लगभग ₹${formatMoney(maturityDiff)} ज्यादा रिटर्न दे रहा है।`,
      `With current inputs, ${winner} is giving roughly ₹${formatMoney(maturityDiff)} higher return.`,
      `Current inputs mein ${winner} lagbhag ₹${formatMoney(maturityDiff)} zyada return de raha hai.`,
    )

    const tip = tt(
      `अगर महीने की नियमित बचत चाहिए तो RD रखें, और एकमुश्त राशि है तो FD अच्छा विकल्प है।`,
      `Choose RD for disciplined monthly saving, and FD when you have a lump-sum amount.`,
      `Regular monthly saving ke liye RD, aur lump-sum amount ho to FD better option hai.`,
    )

    return { summary, comparison, tip }
  }, [fdProjection.maturity, investmentYears, rdProjection.maturity, tt])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const payload = {
      salary,
      savingsBalance,
      interestRate,
      fdPrincipal,
      rdMonthlyDeposit,
      investmentYears,
      expenses,
    }

    window.localStorage.setItem(SAVINGS_OFFLINE_KEY, JSON.stringify(payload))
  }, [salary, savingsBalance, interestRate, fdPrincipal, rdMonthlyDeposit, investmentYears, expenses])

  useEffect(() => {
    preloadBoliKhataBundledAudio(language)
  }, [language])

  const guideItems = useMemo(() => ([
    {
      id: 'salary',
      title: tt('Salary सेट करें', 'Set Salary', 'Set Salary'),
      detail: tt('यह आपकी मासिक आय है। सही salary डालने से budget और बचत calculation सही होगा।', 'This is your monthly income. Set accurate salary to get correct budget and savings calculations.', 'Yeh aapki monthly income hai. Sahi salary se budget aur savings calculation accurate hoga.'),
    },
    {
      id: 'expense',
      title: tt('खर्च जोड़ें', 'Add Expense', 'Add Expense'),
      detail: tt('हर खर्च जोड़ने से आपको पता चलता है कि पैसे कहाँ जा रहे हैं। इससे अनावश्यक खर्च कम होते हैं।', 'Adding every expense shows where money is going. This helps cut unnecessary spending.', 'Har expense add karne se pata chalta hai paisa kahan jaa raha hai. Isse extra kharcha kam hota hai.'),
    },
    {
      id: 'savings',
      title: tt('बचत बढ़ाएं', 'Grow Savings', 'Grow Savings'),
      detail: tt('बचत बैलेंस में पैसा डालने से emergency fund बनता है और financial stress कम होता है।', 'Adding money to savings builds an emergency fund and reduces financial stress.', 'Savings mein paisa daalne se emergency fund banta hai aur financial stress kam hota hai.'),
    },
    {
      id: 'interest',
      title: tt('Interest सीखें', 'Learn Interest', 'Learn Interest'),
      detail: tt('ब्याज दर बदलकर देखें। जितनी ज्यादा दर और समय होगा, उतनी तेजी से आपका पैसा बढ़ेगा।', 'Adjust the interest rate to see growth. Higher rate and longer time increase money faster.', 'Interest rate badal kar dekho. Higher rate aur zyada time se paisa fast grow karta hai.'),
    },
    {
      id: 'fd-rd',
      title: tt('FD vs RD तुलना', 'FD vs RD Comparison', 'FD vs RD Comparison'),
      detail: tt('FD में एक बार बड़ी राशि लगती है। RD में हर महीने छोटी राशि जमा होती है। दोनों की maturity compare करें।', 'FD uses one-time lump sum. RD uses monthly deposits. Compare both maturity values.', 'FD mein one-time amount lagta hai, RD mein monthly deposit hota hai. Dono ki maturity compare karo.'),
    },
    {
      id: 'voice',
      title: tt('Voice Command उपयोग', 'Use Voice Commands', 'Use Voice Commands'),
      detail: tt('आप बोलकर salary, खर्च और बचत अपडेट कर सकती हैं। जैसे: इक सौ बीस रुपये बचत में डालो।', 'You can update salary, expense, and savings by voice. Example: add one hundred twenty rupees to savings.', 'Aap bolkar salary, expense aur savings update kar sakti hain. Example: ik soo beees rupey bachat mein daalo.'),
    },
  ]), [tt])

  const speakGuide = (id: string, text: string) => {
    if (!voiceMode) {
      setStatus(tt('Voice mode off है। पहले voice चालू करें।', 'Voice mode is off. Please enable voice first.', 'Voice mode off hai. Pehle voice on karo.'))
      return
    }

    const engine = getVoiceEngineInfo()
    if (engine.provider !== 'gemini-tts' && engine.provider !== 'alt-cloud-tts') {
      const diag = getVoiceEngineDiagnostics()
      setStatus(tt(
        `Cloud TTS unavailable: ${diag.reason}.`,
        `Cloud TTS unavailable: ${diag.reason}.`,
        `Cloud TTS unavailable: ${diag.reason}.`,
      ))
    }

    setActiveGuideId(id)
    void speakBoliKhataGuide({ text, lang: language, id: id as 'salary' | 'expense' | 'savings' | 'interest' | 'fd-rd' | 'voice', emotion: 'friendly', speed: 1 })
      .then((result) => {
        const sourceText = result.source === 'gemini-tts'
          ? 'Gemini TTS'
          : result.source === 'alt-cloud-tts'
            ? 'Alt Cloud TTS'
          : result.source === 'offline-audio'
            ? 'Offline Audio'
            : result.source === 'web-speech'
              ? 'Device Voice'
              : 'No Audio'

        if (result.source === 'none') {
          setStatus(tt(
            `Guide play नहीं हुई (${result.reason}).`,
            `Guide playback failed (${result.reason}).`,
            `Guide play nahi hui (${result.reason}).`,
          ))
          return
        }

        setStatus(tt(
          `Guide play हो रही है (${sourceText}).`,
          `Guide narration is playing (${sourceText}).`,
          `Guide narration play ho rahi hai (${sourceText}).`,
        ))
      })
    window.setTimeout(() => setActiveGuideId((curr) => (curr === id ? null : curr)), 2400)
  }

  const playFullGuide = () => {
    if (!voiceMode) {
      setStatus(tt('Voice mode off है। पहले voice चालू करें।', 'Voice mode is off. Please enable voice first.', 'Voice mode off hai. Pehle voice on karo.'))
      return
    }

    const engine = getVoiceEngineInfo()
    if (engine.provider !== 'gemini-tts' && engine.provider !== 'alt-cloud-tts') {
      const diag = getVoiceEngineDiagnostics()
      setStatus(tt(
        `Cloud TTS unavailable: ${diag.reason}.`,
        `Cloud TTS unavailable: ${diag.reason}.`,
        `Cloud TTS unavailable: ${diag.reason}.`,
      ))
    }

    const combined = guideItems.map((item) => `${item.title}. ${item.detail}`).join(' ')
    void speakBoliKhataGuide({ id: 'full', text: combined, lang: language, emotion: 'calm', speed: 0.95 })
      .then((result) => {
        const sourceText = result.source === 'gemini-tts'
          ? 'Gemini TTS'
          : result.source === 'alt-cloud-tts'
            ? 'Alt Cloud TTS'
          : result.source === 'offline-audio'
            ? 'Offline Audio'
            : result.source === 'web-speech'
              ? 'Device Voice'
              : 'No Audio'

        if (result.source === 'none') {
          setStatus(tt(
            `Full guide play नहीं हुई (${result.reason}).`,
            `Full guide playback failed (${result.reason}).`,
            `Full guide play nahi hui (${result.reason}).`,
          ))
          return
        }

        setStatus(tt(
          `पूरा guide चल रहा है (${sourceText}).`,
          `Full guide is playing (${sourceText}).`,
          `Poora guide chal raha hai (${sourceText}).`,
        ))
      })
  }

  const playFdRdSmartGuide = () => {
    if (!voiceMode) {
      setStatus(tt('Voice mode off है। पहले voice चालू करें।', 'Voice mode is off. Please enable voice first.', 'Voice mode off hai. Pehle voice on karo.'))
      return
    }

    const engine = getVoiceEngineInfo()
    if (engine.provider !== 'gemini-tts' && engine.provider !== 'alt-cloud-tts') {
      const diag = getVoiceEngineDiagnostics()
      setStatus(tt(
        `Cloud TTS unavailable: ${diag.reason}.`,
        `Cloud TTS unavailable: ${diag.reason}.`,
        `Cloud TTS unavailable: ${diag.reason}.`,
      ))
    }

    const narration = `${fdRdSmartGuide.summary} ${fdRdSmartGuide.comparison} ${fdRdSmartGuide.tip}`
    void speakBoliKhataGuide({ id: 'fd-rd-smart', text: narration, lang: language, emotion: 'calm', speed: 0.95 })
      .then((result) => {
        const sourceText = result.source === 'gemini-tts'
          ? 'Gemini TTS'
          : result.source === 'alt-cloud-tts'
            ? 'Alt Cloud TTS'
          : result.source === 'offline-audio'
            ? 'Offline Audio'
            : result.source === 'web-speech'
              ? 'Device Voice'
              : 'No Audio'

        if (result.source === 'none') {
          setStatus(tt(
            `FD/RD guide play नहीं हुई (${result.reason}).`,
            `FD/RD guide playback failed (${result.reason}).`,
            `FD/RD guide play nahi hui (${result.reason}).`,
          ))
          return
        }

        setStatus(tt(
          `FD/RD smart guide चल रही है (${sourceText}).`,
          `FD/RD smart guide is playing (${sourceText}).`,
          `FD/RD smart guide chal rahi hai (${sourceText}).`,
        ))
      })
  }

  const addExpense = (amount: number, note: string) => {
    setExpenses((prev) => [{ id: `${Date.now()}-${Math.random()}`, amount, note }, ...prev].slice(0, 20))
  }

  const applyParsedCommand = (parsed: SavingsVoiceCommand) => {
    if (parsed.action === 'set_salary') {
      setSalary(parsed.amount)
      setStatus(tt(
        `Salary ₹${parsed.amount} set हुई (${parsed.source}).`,
        `Salary set to ₹${parsed.amount} (${parsed.source}).`,
        `Salary ₹${parsed.amount} set hui (${parsed.source}).`,
      ))
      return
    }

    if (parsed.action === 'add_expense') {
      addExpense(parsed.amount, parsed.note || tt('खर्च', 'Expense', 'Kharcha'))
      setStatus(tt(
        `Expense ₹${parsed.amount} जोड़ा गया (${parsed.source}).`,
        `Expense ₹${parsed.amount} added (${parsed.source}).`,
        `Expense ₹${parsed.amount} add hua (${parsed.source}).`,
      ))
      return
    }

    const canSave = monthlyLeft >= parsed.amount
    setSavingsBalance((prev) => prev + parsed.amount)
    setStatus(
      canSave
        ? tt(
          `₹${parsed.amount} बचत में जोड़ा गया (${parsed.source}).`,
          `₹${parsed.amount} added to savings (${parsed.source}).`,
          `₹${parsed.amount} bachat mein add hua (${parsed.source}).`,
        )
        : tt(
          `₹${parsed.amount} बचत में जोड़ दिया, पर खर्च salary से ज्यादा है।`,
          `₹${parsed.amount} added to savings, but expenses are above salary.`,
          `₹${parsed.amount} bachat mein add hua, par kharcha salary se zyada hai.`,
        ),
    )
  }

  const applyVoiceCommand = async (input: string) => {
    const utterance = input.trim()
    if (!utterance) {
      setStatus(tt('कृपया कमांड बोलें या लिखें।', 'Please speak or type a command.', 'Command bolo ya type karo.'))
      return
    }

    setIsParsing(true)
    setStatus(tt('समझ रही हूँ...', 'Understanding...', 'Samajh rahi hoon...'))

    try {
      const parsed = await parseSavingsVoiceCommand(utterance)
      if (!parsed) {
        setStatus(tt('राशि समझ नहीं आई। फिर से बोलिए।', 'Could not parse amount. Please try again.', 'Amount samajh nahi aaya, dobara bolo.'))
        return
      }

      applyParsedCommand(parsed)

      setCommandInput('')
    } finally {
      setIsParsing(false)
    }
  }

  const cleanupAudioCapture = () => {
    if (autoStopTimeoutRef.current) {
      window.clearTimeout(autoStopTimeoutRef.current)
      autoStopTimeoutRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    mediaRecorderRef.current = null
    mediaChunksRef.current = []
  }

  const stopAudioCapture = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
  }

  const startAudioCapture = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      startListening()
      return
    }

    if (!isOnline) {
      setStatus(tt('ऑफलाइन मोड: voice-to-text सीमित हो सकता है। Parse manually या online होकर try करें।', 'Offline mode: voice-to-text may be limited. Parse manually or try when online.', 'Offline mode mein voice-to-text limited ho sakta hai. Manual Parse karo ya online hoke try karo.'))
      startListening()
      return
    }

    if (isRecordingAudio) {
      stopAudioCapture()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      mediaChunksRef.current = []

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      setIsRecordingAudio(true)
      setStatus(tt('रिकॉर्ड हो रहा है... दोबारा दबाकर रोकें।', 'Recording... tap again to stop.', 'Recording ho rahi hai... dobara tap karke stop karo.'))

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          mediaChunksRef.current.push(event.data)
        }
      }

      recorder.onerror = () => {
        setIsRecordingAudio(false)
        setStatus(tt('Audio record fail हुआ।', 'Audio recording failed.', 'Audio recording fail hua.'))
        cleanupAudioCapture()
      }

      recorder.onstop = async () => {
        setIsRecordingAudio(false)
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(mediaChunksRef.current, { type: mimeType })
        cleanupAudioCapture()

        if (blob.size < 1024) {
          setStatus(tt('आवाज़ बहुत कम थी। फिर से बोलें।', 'Audio was too short. Please try again.', 'Awaaz bahut kam thi. Dobara bolo.'))
          return
        }

        setIsParsing(true)
        setStatus(tt('Voice को text में बदल रही हूँ...', 'Converting voice to text...', 'Voice ko text mein badal rahi hoon...'))

        try {
          const transcript = await transcribeSavingsAudio(blob, mimeType)
          if (!transcript) {
            setStatus(tt('Voice text नहीं बन पाया। कृपया फिर बोलें।', 'Could not transcribe voice. Please speak again.', 'Voice text nahi ban paya. Kripya phir bolo.'))
            return
          }

          setCommandInput(transcript)
          setStatus(tt('Voice text box में आ गई। अब Parse दबाएं।', 'Voice text added to the box. Now press Parse.', 'Voice text box mein aa gayi. Ab Parse dabao.'))
        } finally {
          setIsParsing(false)
        }
      }

      recorder.start(250)
      autoStopTimeoutRef.current = window.setTimeout(() => {
        stopAudioCapture()
      }, 6500)
    } catch {
      setStatus(tt('Mic permission चाहिए। Browser settings में allow करें।', 'Microphone permission is required. Please allow it in browser settings.', 'Mic permission chahiye. Browser settings me allow karo.'))
      setIsRecordingAudio(false)
      cleanupAudioCapture()
      startListening()
    }
  }

  const startListening = () => {
    const win = window as Window & {
      webkitSpeechRecognition?: SpeechRecognitionCtor
      SpeechRecognition?: SpeechRecognitionCtor
    }

    const RecognitionCtor = win.webkitSpeechRecognition ?? win.SpeechRecognition
    if (!RecognitionCtor) {
      setStatus(tt('इस डिवाइस में voice recognition सपोर्ट नहीं है।', 'Voice recognition is not supported on this device.', 'Is device mein voice recognition supported nahi hai.'))
      return
    }

    const beginRecognition = () => {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }

        const recognition = new RecognitionCtor()
        recognition.lang = language === 'en' ? 'en-IN' : 'hi-IN'
        recognition.continuous = false
        recognition.interimResults = false
        recognition.maxAlternatives = 3

        recognition.onstart = () => {
          setIsListening(true)
          setStatus(tt('सुन रही हूँ... बोलिए', 'Listening... speak now', 'Sun rahi hoon... bolo'))
        }

        recognition.onresult = (event) => {
          let transcript = ''
          const startIndex = event.resultIndex ?? 0
          for (let i = startIndex; i < event.results.length; i += 1) {
            const value = event.results[i]?.[0]?.transcript
            if (value) {
              transcript += `${value} `
            }
          }

          const cleanTranscript = transcript.trim()
          if (!cleanTranscript) {
            setStatus(tt('कुछ सुनाई नहीं दिया।', 'Could not hear anything.', 'Kuch sunai nahi diya.'))
            return
          }

          setCommandInput(cleanTranscript)
          setStatus(tt('Text box में voice आ गई। अब Parse दबाएं।', 'Voice transcription added to text box. Now press Parse.', 'Voice text box mein aa gayi. Ab Parse dabao.'))
        }

        recognition.onerror = (event) => {
          const friendly = event.error === 'not-allowed'
            ? tt('Mic permission allow करें, फिर दोबारा बोलें।', 'Allow microphone permission and try again.', 'Mic permission allow karo, phir dobara bolo.')
            : event.error === 'no-speech'
              ? tt('आवाज़ नहीं मिली, थोड़ा जोर से बोलें।', 'No speech detected. Please speak a little louder.', 'Awaaz detect nahi hui, thoda zor se bolo.')
              : tt('Voice capture fail हुआ। फिर से कोशिश करें।', 'Voice capture failed. Please try again.', 'Voice capture fail hua. Dobara try karo.')

          setStatus(friendly)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = recognition
        recognition.start()
      } catch {
        setIsListening(false)
        setStatus(tt('Mic शुरू नहीं हो पाया।', 'Could not start microphone.', 'Mic start nahi ho paya.'))
      }
    }

    try {
      const mediaDevices = navigator.mediaDevices
      if (!mediaDevices?.getUserMedia) {
        beginRecognition()
        return
      }

      // Prompt mic permission explicitly first for browsers that silently block speech recognition.
      void mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop())
          beginRecognition()
        })
        .catch(() => {
          setStatus(tt('Mic permission चाहिए। Browser settings में allow करें।', 'Microphone permission is required. Please allow it in browser settings.', 'Mic permission chahiye. Browser settings me allow karo.'))
        })
    } catch {
      beginRecognition()
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      height: '100%',
      padding: '18px 16px',
      gap: 14,
      background: 'radial-gradient(ellipse at top, #0b2b3d 0%, #050a0e 72%)',
      overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 520, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setScreen('profile')} className="btn-glass" style={{ padding: '8px 12px', fontSize: 12 }}>
          <ArrowLeft size={14} /> {tt('वापस', 'Back', 'Wapas')}
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: '#38bdf8', fontWeight: 900, fontSize: 18 }}>
            {tt('बचत खाता', 'Savings Account', 'Savings Account')}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
            {tt('Salary + Expense + Interest + Voice Commands', 'Salary + Expense + Interest + Voice Commands', 'Salary + Expense + Interest + Voice Commands')}
          </div>
        </div>
        <button onClick={toggleVoiceMode} className="btn-glass" style={{ padding: '8px 10px' }}>
          {voiceMode ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
      </div>

      <div className="glass" style={{ width: '100%', maxWidth: 520, padding: '10px 12px' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.62)', marginBottom: 7, fontWeight: 700 }}>
          {tt('भाषा चुनें', 'Choose Language', 'Language Choose Karo')}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setLanguage('hi')}
            className="btn-glass"
            style={{
              padding: '8px 10px',
              fontSize: 11,
              borderColor: language === 'hi' ? 'rgba(34,211,238,0.65)' : undefined,
              background: language === 'hi' ? 'rgba(34,211,238,0.18)' : undefined,
            }}
          >
            हिंदी
          </button>
          <button
            onClick={() => setLanguage('en')}
            className="btn-glass"
            style={{
              padding: '8px 10px',
              fontSize: 11,
              borderColor: language === 'en' ? 'rgba(34,211,238,0.65)' : undefined,
              background: language === 'en' ? 'rgba(34,211,238,0.18)' : undefined,
            }}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('hinglish')}
            className="btn-glass"
            style={{
              padding: '8px 10px',
              fontSize: 11,
              borderColor: language === 'hinglish' ? 'rgba(34,211,238,0.65)' : undefined,
              background: language === 'hinglish' ? 'rgba(34,211,238,0.18)' : undefined,
            }}
          >
            Hinglish
          </button>
        </div>
      </div>

      <div className="glass" style={{ width: '100%', maxWidth: 520, padding: '10px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: isOnline ? '#4ade80' : '#fbbf24', marginBottom: 6 }}>
          {isOnline
            ? tt('Online मोड सक्रिय', 'Online mode active', 'Online mode active')
            : tt('Offline मोड सक्रिय', 'Offline mode active', 'Offline mode active')}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.68)', lineHeight: 1.55 }}>
          {tt(
            'यह स्क्रीन मोबाइल PWA के लिए optimized है। Install app करके calculations और saved data offline भी काम करेंगे।',
            'This screen is optimized for mobile PWA. Install the app to keep calculations and saved data working offline too.',
            'Yeh screen mobile PWA ke liye optimized hai. App install karke calculations aur saved data offline bhi chalenge.',
          )}
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.62)' }}>
            {(() => {
              const diag = getVoiceEngineDiagnostics()
              return `TTS: ${diag.provider} | ${diag.reason}`
            })()}
          </div>
          <button
            onClick={() => {
              resetGeminiTtsLock()
              resetAltCloudTtsLock()
              setStatus(tt('Cloud TTS lock reset हो गया। फिर से Play Guide try करें।', 'Cloud TTS lock reset done. Try Play Guide again.', 'Cloud TTS lock reset ho gaya. Play Guide dubara try karo.'))
            }}
            className="btn-glass"
            style={{ padding: '7px 8px', fontSize: 10 }}
          >
            <RotateCcw size={12} /> {tt('TTS Reset', 'TTS Reset', 'TTS Reset')}
          </button>
        </div>
      </div>

      <div className="glass" style={{ width: '100%', maxWidth: 520, padding: '12px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <div style={{ color: '#22d3ee', fontSize: 12, fontWeight: 800 }}>
            {tt('बोली खाता Voice Guide', 'Boli Khata Voice Guide', 'Boli Khata Voice Guide')}
          </div>
          <button onClick={playFullGuide} className="btn-primary" style={{ background: '#0891b2', fontSize: 11, padding: '8px 10px' }}>
            <PlayCircle size={13} /> {tt('पूरा Guide', 'Play Full Guide', 'Full Guide')}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {guideItems.map((item) => (
            <div key={item.id} style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              background: activeGuideId === item.id ? 'rgba(34,211,238,0.12)' : 'rgba(255,255,255,0.04)',
              border: activeGuideId === item.id ? '1px solid rgba(34,211,238,0.45)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              padding: '8px 10px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 800 }}>{item.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 10, marginTop: 2 }}>{item.detail}</div>
              </div>
              <button onClick={() => speakGuide(item.id, `${item.title}. ${item.detail}`)} className="btn-glass" style={{ padding: '7px 9px', fontSize: 10 }}>
                <PlayCircle size={12} /> {tt('Explain', 'Explain', 'Explain')}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 520, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <div className="glass" style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#93c5fd', fontSize: 11, fontWeight: 700 }}><IndianRupee size={13} /> {tt('मासिक Salary', 'Monthly Salary', 'Monthly Salary')}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 6 }}>₹{salary}</div>
        </div>
        <div className="glass" style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fda4af', fontSize: 11, fontWeight: 700 }}><Wallet size={13} /> {tt('कुल खर्च', 'Total Expense', 'Total Expense')}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 6 }}>₹{totalExpenses}</div>
        </div>
        <div className="glass" style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4ade80', fontSize: 11, fontWeight: 700 }}><PiggyBank size={13} /> {tt('बचत बैलेंस', 'Savings Balance', 'Savings Balance')}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 6 }}>₹{savingsBalance}</div>
        </div>
        <div className="glass" style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#facc15', fontSize: 11, fontWeight: 700 }}><TrendingUp size={13} /> {tt('इस महीने बचा', 'Left This Month', 'Left This Month')}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 6 }}>₹{monthlyLeft}</div>
        </div>
      </div>

      <div className="glass" style={{ width: '100%', maxWidth: 520, padding: '12px 12px' }}>
        <div style={{ color: '#67e8f9', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
          {tt('Interest सीखें', 'Learn Interest', 'Interest Seekho')}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginBottom: 8 }}>
          {tt('बैंक ब्याज दर', 'Bank Interest Rate', 'Bank Interest Rate')}: {interestRate.toFixed(1)}% {tt('वार्षिक', 'per year', 'per year')}
        </div>
        <input
          type="range"
          min={3}
          max={12}
          step={0.5}
          value={interestRate}
          onChange={(e) => setInterestRate(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ marginTop: 10, fontSize: 12, color: '#c4b5fd', fontWeight: 700 }}>
          {tt('1 साल बाद अनुमानित रकम', 'Estimated Amount After 1 Year', '1 saal baad estimated amount')}: ₹{projectedYearEnd}
        </div>
      </div>

      <div className="glass" style={{ width: '100%', maxWidth: 520, padding: '12px 12px' }}>
        <div style={{ color: '#fbbf24', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
          {tt('FD / RD Simulator', 'FD / RD Simulator', 'FD / RD Simulator')}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginBottom: 10 }}>
          {tt(
            'देखिए एकमुश्त FD और मासिक RD में कितना फर्क पड़ता है।',
            'Compare one-time FD vs monthly RD to understand compounding.',
            'One-time FD aur monthly RD ka difference dekho.',
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
              {tt('FD राशि', 'FD Principal', 'FD Principal')}: ₹{fdPrincipal}
            </label>
            <input
              type="range"
              min={1000}
              max={100000}
              step={500}
              value={fdPrincipal}
              onChange={(e) => setFdPrincipal(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
              {tt('RD मासिक जमा', 'RD Monthly Deposit', 'RD Monthly Deposit')}: ₹{rdMonthlyDeposit}
            </label>
            <input
              type="range"
              min={100}
              max={10000}
              step={100}
              value={rdMonthlyDeposit}
              onChange={(e) => setRdMonthlyDeposit(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>
            {tt('निवेश अवधि', 'Investment Tenure', 'Investment Tenure')}: {investmentYears} {tt('साल', 'years', 'saal')}
          </label>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={investmentYears}
            onChange={(e) => setInvestmentYears(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <div style={{ border: '1px solid rgba(56,189,248,0.35)', borderRadius: 10, padding: '10px 10px', background: 'rgba(56,189,248,0.08)' }}>
            <div style={{ color: '#7dd3fc', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>FD</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>{tt('जमा', 'Invested', 'Invested')}: ₹{fdProjection.invested}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>{tt('ब्याज', 'Interest', 'Interest')}: ₹{fdProjection.interestEarned}</div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 900, marginTop: 4 }}>{tt('Maturity', 'Maturity', 'Maturity')}: ₹{fdProjection.maturity}</div>
          </div>

          <div style={{ border: '1px solid rgba(74,222,128,0.35)', borderRadius: 10, padding: '10px 10px', background: 'rgba(74,222,128,0.08)' }}>
            <div style={{ color: '#86efac', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>RD</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>{tt('जमा', 'Invested', 'Invested')}: ₹{rdProjection.invested}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>{tt('ब्याज', 'Interest', 'Interest')}: ₹{rdProjection.interestEarned}</div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 900, marginTop: 4 }}>{tt('Maturity', 'Maturity', 'Maturity')}: ₹{rdProjection.maturity}</div>
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 11, color: '#fef08a', fontWeight: 700 }}>
          {tt('सीख:', 'Learning:', 'Learning:')} {tt(
            'लंबे समय और नियमित जमा से compounding तेजी से बढ़ती है।',
            'Longer tenure and consistent deposits amplify compounding.',
            'Long tenure aur regular deposit se compounding fast grow karti hai.',
          )}
        </div>

        <div className="glass" style={{ marginTop: 10, padding: '10px 10px', borderColor: 'rgba(34,211,238,0.35)' }}>
          <div style={{ color: '#22d3ee', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
            {tt('Dynamic FD/RD Voice Guide', 'Dynamic FD/RD Voice Guide', 'Dynamic FD/RD Voice Guide')}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.76)', lineHeight: 1.6 }}>
            {fdRdSmartGuide.summary}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.76)', lineHeight: 1.6, marginTop: 4 }}>
            {fdRdSmartGuide.comparison}
          </div>
          <div style={{ fontSize: 11, color: '#a7f3d0', lineHeight: 1.6, marginTop: 4 }}>
            {fdRdSmartGuide.tip}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={playFdRdSmartGuide} className="btn-primary" style={{ background: '#0891b2', fontSize: 11, padding: '8px 10px' }}>
              <PlayCircle size={13} /> {tt('Guide सुनें', 'Play Guide', 'Guide Suno')}
            </button>
          </div>
        </div>
      </div>

      <div className="glass" style={{ width: '100%', maxWidth: 520, padding: '12px 12px' }}>
        <div style={{ color: '#22d3ee', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
          {tt('Voice Money Command', 'Voice Money Command', 'Voice Money Command')}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginBottom: 8 }}>
          {tt(
            'उदाहरण: "salary 18000 set करो", "2000 किराया खर्च जोड़ो", "इक सौ बीस रुपये बचत में डालो"',
            'Examples: "set salary 18000", "add 2000 rent expense", "save one hundred twenty rupees"',
            'Examples: "salary 18000 set karo", "2000 kiraya expense jodo", "ik soo beees rupey bachat mein daalo"',
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder={tt('कमांड लिखें...', 'Type command...', 'Command type karo...')}
            style={{
              flex: 1,
              padding: '9px 10px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.16)',
              background: 'rgba(255,255,255,0.04)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              outline: 'none',
            }}
          />
          <button
            onClick={() => void applyVoiceCommand(commandInput)}
            className="btn-primary"
            disabled={!commandInput.trim() || isParsing}
            style={{ background: '#0ea5e9', fontSize: 11, opacity: (!commandInput.trim() || isParsing) ? 0.65 : 1 }}
          >
            {isParsing ? <Loader2 size={13} /> : tt('समझो', 'Parse', 'Parse')}
          </button>
          <button
            onClick={() => { void startAudioCapture() }}
            className="btn-primary"
            disabled={isParsing}
            style={{ background: isRecordingAudio || isListening ? '#ef4444' : '#16a34a', fontSize: 11, opacity: isParsing ? 0.75 : 1 }}
          >
            <Mic size={13} /> {isRecordingAudio || isListening ? tt('रोकें', 'Stop', 'Stop') : tt('बोलो', 'Speak', 'Bolo')}
          </button>
        </div>
        {status && (
          <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.82)', fontSize: 11 }}>{status}</div>
        )}
      </div>

      <div className="glass" style={{ width: '100%', maxWidth: 520, padding: '12px 12px' }}>
        <div style={{ color: '#fda4af', fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
          {tt('हाल के खर्च', 'Recent Expenses', 'Recent Expenses')}
        </div>
        {expenses.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
            {tt('अभी तक कोई खर्च दर्ज नहीं है।', 'No expenses recorded yet.', 'Abhi tak koi expense record nahi hai.')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {expenses.map((entry) => (
              <div key={entry.id} style={{
                display: 'flex', justifyContent: 'space-between', gap: 8,
                background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: 11 }}>{entry.note}</span>
                <span style={{ color: '#fda4af', fontWeight: 800, fontSize: 11 }}>₹{entry.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
