import { useSyncExternalStore } from "react"

/** The few things the WebGL director and the React UI both need to know. */
export type ExperienceState = {
  /** WebGL stage is up and the intro has started. */
  ready: boolean
  /** WebGL failed; the page falls back to plain colour blocks. */
  noGL: boolean
  /** Index into CHAPTERS of the scene that owns the screen. */
  chapter: number
  /** Chosen flavour, carried through the rest of the page. */
  flavor: number
  /** Chips thrown in the gravity scene. */
  throws: number
  /** Chips that have landed in the stack scene. */
  stacked: number
  /** User or OS asked for less motion. */
  reduced: boolean
  /** The finale can is open. */
  canOpen: boolean
  /** How many chips are on stage. */
  chips: number
  /** The flavour cans page through on their own. */
  autoplay: boolean
}

type Listener = () => void

function createStore(initial: ExperienceState) {
  let state = initial
  const listeners = new Set<Listener>()
  return {
    get: () => state,
    set(patch: Partial<ExperienceState>) {
      let changed = false
      for (const k in patch) {
        const key = k as keyof ExperienceState
        if (state[key] !== patch[key]) {
          changed = true
          break
        }
      }
      if (!changed) return
      state = { ...state, ...patch }
      listeners.forEach((l) => l())
    },
    subscribe(l: Listener) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

const prefersReduced =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

export const store = createStore({
  ready: false,
  noGL: false,
  chapter: 0,
  flavor: 0,
  throws: 0,
  stacked: 0,
  reduced: prefersReduced,
  canOpen: false,
  chips: 32,
  autoplay: !prefersReduced,
})

export function useExperience<T>(select: (s: ExperienceState) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.get()))
}

/** Commands the UI sends to the director. Filled in when the stage boots. */
export const commands = {
  flavorStep: (_by: number) => {},
  flavorGo: (_i: number) => {},
  flavorAuto: (_on: boolean) => {},
  heroStep: (_by: number) => {},
  shake: () => {},
  popCan: () => {},
  spinCan: (_by: number) => {},
}
