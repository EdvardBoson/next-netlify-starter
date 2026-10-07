import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createSeed } from './seed.mjs'

// Datalagret sparar i webbläsarens localStorage så att MVP:n fungerar utan server.
// Byt ut load/save mot anrop till ett API (t.ex. Netlify Functions + databas)
// när plattformen ska användas av flera personer samtidigt.
const KEY = 'arena-data-v1'

const StoreContext = createContext(null)

function load() {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    // Trasig eller blockerad lagring – börja om med exempeldata.
  }
  return createSeed()
}

function save(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    // Lagringen kan vara full eller avstängd; appen fungerar ändå under sessionen.
  }
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => setState(load()), [])
  useEffect(() => {
    if (state) save(state)
  }, [state])
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Kör en ren logikfunktion och visar fel/meddelanden som toast.
  const run = useCallback(
    (fn, successMessage) => {
      const result = fn(state)
      if (result.error) {
        setToast({ type: 'error', text: result.error })
        return result
      }
      if (result.state) setState(result.state)
      const msg = typeof successMessage === 'function' ? successMessage(result) : successMessage
      if (msg) setToast({ type: 'success', text: msg })
      return result
    },
    [state]
  )

  const notify = useCallback((text, type = 'success') => setToast({ type, text }), [])
  const reset = useCallback(() => setState(createSeed()), [])

  return (
    <StoreContext.Provider value={{ state, setState, run, notify, reset, toast }}>{children}</StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)

export function downloadFile(filename, content, type = 'text/csv;charset=utf-8') {
  // BOM gör att Excel läser å, ä och ö korrekt i CSV-filer.
  const bom = type.startsWith('text/csv') ? '﻿' : ''
  const blob = new Blob([bom + content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
