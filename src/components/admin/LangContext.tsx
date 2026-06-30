'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import { t, Lang } from '@/lib/i18n'

type Tr = typeof t['fr'] | typeof t['en']
const LangCtx = createContext<{ lang: Lang; tr: Tr; setLang: (l: Lang) => void }>({
  lang: 'en',
  tr: t.en,
  setLang: () => {},
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  return (
    <LangCtx.Provider value={{ lang, tr: t[lang], setLang }}>
      {children}
    </LangCtx.Provider>
  )
}

export const useLang = () => useContext(LangCtx) as { lang: Lang; tr: typeof t['fr']; setLang: (l: Lang) => void }
