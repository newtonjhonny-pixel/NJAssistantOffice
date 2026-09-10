"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error"

interface Options {
  /** Atraso antes de gravar. Evita um request por tecla. */
  delay?: number
}

/**
 * Autosave com debounce e estado explícito.
 *
 * Nunca aparenta ter salvo sem que o backend tenha confirmado: `saved` só é
 * definido depois que a promise de gravação resolve.
 */
export function useAutosave(
  save: (payload: Record<string, unknown>) => Promise<boolean>,
  { delay = 1200 }: Options = {},
) {
  const [state, setState]     = useState<SaveState>("idle")
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const pending  = useRef<Record<string, unknown>>({})
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(false)
  const saveRef  = useRef(save)

  useEffect(() => { saveRef.current = save }, [save])

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const payload = pending.current
    if (!Object.keys(payload).length || inFlight.current) return

    pending.current = {}
    inFlight.current = true
    setState("saving")
    try {
      const ok = await saveRef.current(payload)
      if (ok) {
        setState("saved"); setSavedAt(new Date()); setError(null)
      } else {
        // devolve o payload para não perder a alteração
        pending.current = { ...payload, ...pending.current }
        setState("error"); setError("Não foi possível salvar.")
      }
    } catch (e) {
      pending.current = { ...payload, ...pending.current }
      setState("error")
      setError(e instanceof Error ? e.message : "Não foi possível salvar.")
    } finally {
      inFlight.current = false
    }
  }, [])

  /** Registra alteração e agenda a gravação. */
  const push = useCallback((patch: Record<string, unknown>) => {
    pending.current = { ...pending.current, ...patch }
    setState("dirty")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, delay)
  }, [delay, flush])

  const isDirty = state === "dirty" || state === "saving" || state === "error"

  // Avisa antes de sair caso exista alteração ainda não persistida.
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = "Existem alterações ainda não salvas."
      return e.returnValue
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  // Grava o que estiver pendente ao desmontar.
  useEffect(() => () => { void flush() }, [flush])

  return { state, savedAt, error, push, flush, isDirty }
}

export function saveLabel(state: SaveState, savedAt: Date | null): string {
  if (state === "saving") return "Salvando…"
  if (state === "dirty")  return "Alterações não salvas"
  if (state === "error")  return "Erro ao salvar"
  if (state === "saved" && savedAt)
    return `Salvo às ${savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
  return "Tudo salvo"
}
