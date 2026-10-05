import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { X } from "lucide-react"
import { CHAPTERS } from "@/data/chapters"
import { FLAVORS } from "@/data/flavors"
import { store, useExperience } from "@/experience/store"
import { scrollToId } from "@/experience/Experience"
import { cn } from "@/lib/utils"

const pad = (n: number) => (n < 10 ? "0" + n : "" + n)

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-[1.05rem] font-black lowercase tracking-[-0.06em]", className)}>
      <svg aria-hidden="true" viewBox="0 0 64 44" className="h-[1.1em] w-auto">
        <ellipse cx="32" cy="22" rx="29" ry="19" fill="currentColor" />
        <path d="M8 18q24 18 48 0" fill="none" stroke="var(--nav-cut, #000)" strokeWidth="5" strokeLinecap="round" />
      </svg>
      litenergles
    </span>
  )
}

/**
 * Minimal chrome that reads on any colour block (difference blending): the
 * wordmark, the current chapter, a menu, and on desktop a rail of chip-shaped
 * chapter markers down the right edge.
 */
export function Nav() {
  const chapter = useExperience((s) => s.chapter)
  const reduced = useExperience((s) => s.reduced)
  const flavor = useExperience((s) => s.flavor)
  const ch = CHAPTERS[chapter] ?? CHAPTERS[0]
  const ink = ch.ink === "flavor" ? FLAVORS[flavor].ink : ch.ink
  const bg = ch.bg === "flavor" ? FLAVORS[flavor].base : ch.bg
  const tone = { color: ink, ["--nav-cut" as string]: bg } as React.CSSProperties
  const [open, setOpen] = useState(false)
  const bar = useRef<HTMLDivElement>(null)
  const menuBtn = useRef<HTMLButtonElement>(null)
  const firstLink = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (s) => gsap.set(bar.current, { scaleX: s.progress }),
    })
    return () => st.kill()
  }, [])

  useEffect(() => {
    if (!open) return
    firstLink.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.documentElement.style.overflow = ""
      menuBtn.current?.focus()
    }
  }, [open])

  const go = (id: string) => {
    setOpen(false)
    requestAnimationFrame(() => scrollToId(id))
  }

  return (
    <>
      <a
        href="#flavors"
        onClick={(e) => {
          e.preventDefault()
          go("flavors")
        }}
        className="sr-only-focusable fixed left-4 top-4 z-[60] rounded-full bg-paper px-5 py-3 font-display text-sm font-bold text-ink"
      >
        Перейти к выбору вкуса
      </a>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 transition-colors duration-500" style={tone}>
        <div ref={bar} className="h-[3px] origin-left scale-x-0 bg-current" />
        <div className="flex items-center justify-between gap-4 px-4 pt-3 md:px-8 md:pt-5">
          <button
            type="button"
            onClick={() => go("hero")}
            className="pointer-events-auto -m-2 p-2"
            aria-label="Litenergles — в начало"
          >
            <Wordmark />
          </button>
          <p className="eyebrow hidden tabular-nums sm:block" aria-live="polite">
            {pad(chapter)} / {pad(CHAPTERS.length - 1)} · {CHAPTERS[chapter]?.label}
          </p>
          <button
            ref={menuBtn}
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="eyebrow pointer-events-auto flex min-h-11 items-center gap-2 rounded-full border-2 border-current px-4"
          >
            <span className="tabular-nums sm:hidden">{pad(chapter)}</span>
            Меню
          </button>
        </div>
      </header>

      <nav aria-label="Главы" className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1 transition-colors duration-500 lg:flex" style={tone}>
        {CHAPTERS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => go(c.id)}
            aria-label={`${pad(i)} — ${c.label}`}
            aria-current={i === chapter ? "step" : undefined}
            className="group flex h-6 w-10 items-center justify-end"
          >
            <span className="eyebrow pointer-events-none mr-3 whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {c.label}
            </span>
            <span
              className={cn(
                "block h-2.5 rounded-[50%] bg-current transition-all duration-500 ease-[var(--ease-spring)]",
                i === chapter ? "w-7" : "w-2.5 opacity-50",
              )}
            />
          </button>
        ))}
      </nav>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Меню"
          className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-night px-4 pb-8 pt-4 text-paper md:px-10"
        >
          <div className="flex items-center justify-between">
            <Wordmark className="text-crisp" />
            <button type="button" onClick={() => setOpen(false)} className="round-btn border-paper/50" aria-label="Закрыть меню">
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <ol className="mt-8 grid flex-1 content-center gap-1 md:grid-cols-2 md:gap-x-16">
            {CHAPTERS.map((c, i) => (
              <li key={c.id}>
                <button
                  ref={i === 0 ? firstLink : undefined}
                  type="button"
                  onClick={() => go(c.id)}
                  className={cn(
                    "group flex w-full items-baseline gap-4 py-2 text-left transition-colors hover:text-crisp",
                    i === chapter && "text-crisp",
                  )}
                >
                  <span className="eyebrow tabular-nums opacity-60">{pad(i)}</span>
                  <span className="display text-[clamp(2rem,6vw,4.5rem)] transition-transform duration-500 ease-[var(--ease-spring)] group-hover:translate-x-3">
                    {c.label}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-paper/20 pt-5">
            <button
              type="button"
              role="switch"
              aria-checked={reduced}
              onClick={() => store.set({ reduced: !reduced })}
              className="pill border-2 border-paper/40"
            >
              <span className={cn("block size-3 rounded-full", reduced ? "bg-crisp" : "bg-paper/30")} aria-hidden="true" />
              Меньше движения
            </button>
            <p className="max-w-sm text-sm text-paper/60">
              Litenergles — вымышленный бренд. Концепт интерактивной кампании для портфолио.
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}
