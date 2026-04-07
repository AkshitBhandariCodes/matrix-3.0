export interface ShgScheme {
  id: string
  color: string
  url: string
  title: {
    hi: string
    en: string
    hinglish: string
  }
  summary: {
    hi: string
    en: string
    hinglish: string
  }
  steps: {
    hi: string
    en: string
    hinglish: string
  }
}

export const shgSchemes: ShgScheme[] = [
  {
    id: 'day-nrlm',
    color: '#22c55e',
    url: 'https://aajeevika.gov.in/',
    title: {
      hi: 'DAY-NRLM',
      en: 'DAY-NRLM',
      hinglish: 'DAY-NRLM',
    },
    summary: {
      hi: 'Yeh self help groups ko training, bookkeeping aur livelihood support se strong banata hai.',
      en: 'This strengthens self-help groups with training, bookkeeping, and livelihood support.',
      hinglish: 'Yeh SHG ko training, bookkeeping aur livelihood support dekar strong banata hai.',
    },
    steps: {
      hi: 'Gram sangathan, block mission ya panchayat se jankari lekar group ko link karna shuru karein.',
      en: 'Start by checking with the panchayat or block mission office and linking your group properly.',
      hinglish: 'Panchayat ya block mission office se jankari lekar group ko formally link karna shuru karo.',
    },
  },
  {
    id: 'mudra',
    color: '#f59e0b',
    url: 'https://www.mudra.org.in/',
    title: {
      hi: 'PM Mudra',
      en: 'PM Mudra',
      hinglish: 'PM Mudra',
    },
    summary: {
      hi: 'Chhote business ke liye collateral-free loan support mil sakta hai.',
      en: 'It offers collateral-free loan support for small businesses.',
      hinglish: 'Chhote business ke liye collateral-free loan support mil sakta hai.',
    },
    steps: {
      hi: 'Business idea, basic documents aur repayment capacity ke saath bank branch mein apply karein.',
      en: 'Apply through a bank branch with your business idea, basic documents, and repayment plan.',
      hinglish: 'Business idea, basic documents aur repayment plan ke saath bank branch mein apply karo.',
    },
  },
  {
    id: 'jan-dhan',
    color: '#3b82f6',
    url: 'https://pmjdy.gov.in/',
    title: {
      hi: 'Jan Dhan Account',
      en: 'Jan Dhan Account',
      hinglish: 'Jan Dhan Account',
    },
    summary: {
      hi: 'Isse bank account, DBT access aur financial identity strong hoti hai.',
      en: 'It improves banking access, DBT benefits, and financial identity.',
      hinglish: 'Isse bank account access, DBT benefits aur financial identity strong hoti hai.',
    },
    steps: {
      hi: 'Nazdeeki bank ya Bank Mitra ke paas basic KYC ke saath account khulwa sakte hain.',
      en: 'You can open it through the nearest bank or Bank Mitra with basic KYC documents.',
      hinglish: 'Nearest bank ya Bank Mitra ke paas basic KYC ke saath account khulwao.',
    },
  },
  {
    id: 'pmay',
    color: '#a855f7',
    url: 'https://pmayg.dord.gov.in/',
    title: {
      hi: 'PMAY-Gramin',
      en: 'PMAY-Gramin',
      hinglish: 'PMAY-Gramin',
    },
    summary: {
      hi: 'Yeh eligible parivaron ko pakka ghar banane mein support karta hai.',
      en: 'It supports eligible families in building a permanent house.',
      hinglish: 'Yeh eligible families ko pakka ghar banane mein support karta hai.',
    },
    steps: {
      hi: 'Gram Panchayat ya block office mein eligibility check karke application process samjhein.',
      en: 'Check eligibility with the Gram Panchayat or block office and follow the application process.',
      hinglish: 'Gram Panchayat ya block office mein eligibility check karke application process samjho.',
    },
  },
  {
    id: 'ayushman',
    color: '#ef4444',
    url: 'https://beneficiary.nha.gov.in/',
    title: {
      hi: 'Ayushman Bharat',
      en: 'Ayushman Bharat',
      hinglish: 'Ayushman Bharat',
    },
    summary: {
      hi: 'Yeh eligible parivaron ko badi bimari ke treatment mein protection deta hai.',
      en: 'It helps eligible families with protection during major medical treatment.',
      hinglish: 'Yeh eligible families ko major treatment ke time health protection deta hai.',
    },
    steps: {
      hi: 'Eligibility check karke card ya beneficiary status government channel se verify karein.',
      en: 'Check eligibility and verify your card or beneficiary status through official channels.',
      hinglish: 'Eligibility check karo aur official channel se card ya beneficiary status verify karo.',
    },
  },
]
