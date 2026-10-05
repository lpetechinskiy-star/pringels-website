import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, ArrowUp, MapPin, Sparkles } from "lucide-react"
import { Eyebrow, Scene, useScrub, useSectionRef } from "../scene"
import { FLAVORS } from "@/data/flavors"
import { commands, useExperience } from "@/experience/store"
import { scrollToId } from "@/experience/Experience"
import { Privacy } from "../Privacy"

/**
 * 09 · Финал. Every chip spirals back into a column, the can drops over them
 * in your chosen flavour, and the last move is yours: spin it, then pop it.
 */
export function Finale() {
  const ref = useSectionRef()
  const flavor = useExperience((s) => s.flavor)
  const open = useExperience((s) => s.canOpen)
  const f = FLAVORS[flavor]
  const [note, setNote] = useState("")

  useScrub(ref, (tl, q) => {
    tl.fromTo(q("[data-head]"), { scale: 0.6, opacity: 0, letterSpacing: "0.2em" }, { scale: 1, opacity: 1, letterSpacing: "-0.045em", duration: 0.3, ease: "power3.out" }, 0.05)
    tl.fromTo(q("[data-cta]"), { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.15 }, 0.6)
  })

  return (
    <Scene id="finale" label="Финал" drag="finale" sectionRef={ref}>
      <div className="absolute inset-0 transition-colors duration-700" style={{ color: f.ink }}>
        <div className="pointer-events-none absolute inset-x-4 top-20 text-center md:top-24">
          <Eyebrow n="09" className="justify-center">
            Финал
          </Eyebrow>
          <h2 data-head className="display mt-3 text-[clamp(2.4rem,8.5vw,7.5rem)]">
            Открыл — дальше сам.
          </h2>
          <p data-cta className="mx-auto mt-3 max-w-md font-serif text-lg italic leading-snug md:text-xl">
            Банка твоего вкуса: «{f.name}». Одна банка, ни одного шанса остановиться.
          </p>
        </div>

        <div className="absolute inset-x-4 bottom-6 flex flex-col items-center gap-3 md:bottom-10">
          <div data-cta className="flex items-center gap-3">
            <button type="button" className="round-btn" aria-label="Повернуть банку влево" onClick={() => commands.spinCan(-1)}>
              <ArrowLeft aria-hidden="true" className="size-5" />
            </button>
            <span className="eyebrow">Крути банку</span>
            <button type="button" className="round-btn" aria-label="Повернуть банку вправо" onClick={() => commands.spinCan(1)}>
              <ArrowRight aria-hidden="true" className="size-5" />
            </button>
          </div>
          <div data-cta className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => commands.popCan()}
              disabled={open}
              className="pill text-base shadow-[0_10px_0_-2px_rgb(0_0_0/0.3)] disabled:opacity-70"
              style={{ backgroundColor: f.ink, color: f.base }}
            >
              <Sparkles aria-hidden="true" className="size-4" />
              {open ? "Поп!" : "Открыть банку"}
            </button>
            <button
              type="button"
              onClick={() => setNote("Это концепт: магазина нет, но мысль вы поняли.")}
              className="pill border-2"
              style={{ borderColor: f.ink }}
            >
              <MapPin aria-hidden="true" className="size-4" />
              Найти в магазине
            </button>
            <button type="button" onClick={() => scrollToId("hero")} className="pill border-2" style={{ borderColor: f.ink }}>
              <ArrowUp aria-hidden="true" className="size-4" />
              С начала
            </button>
          </div>
          <p className="min-h-6 text-sm font-semibold" role="status">
            {note}
          </p>
        </div>
      </div>
    </Scene>
  )
}

export function Footer() {
  const [privacy, setPrivacy] = useState(() => typeof location !== "undefined" && location.hash === "#privacy")

  useEffect(() => {
    const onHash = () => setPrivacy(location.hash === "#privacy")
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  const close = () => {
    setPrivacy(false)
    if (location.hash === "#privacy") history.replaceState(null, "", location.pathname + location.search)
  }

  return (
    <footer className="relative z-10 bg-night px-4 pb-8 pt-14 text-paper md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="display text-[clamp(2.4rem,9vw,6rem)] lowercase text-crisp">litenergles</p>
          <p className="mt-2 font-serif text-xl italic">Гипербола вкуса.</p>
        </div>
        <div className="max-w-md space-y-2 text-sm leading-relaxed text-paper/70">
          <p>
            Litenergles — вымышленный бренд. Это концепт интерактивной кампании для портфолио, а не реклама реального
            продукта. Все персонажи, башни и рекорды выдуманы.
          </p>
          <p>Сделано на Three.js, GSAP и любопытстве.</p>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col-reverse gap-3 border-t border-paper/15 pt-6 text-sm text-paper/60 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Litenergles</p>
        <a
          href="#privacy"
          onClick={(e) => {
            e.preventDefault()
            setPrivacy(true)
          }}
          className="-mx-2 inline-flex min-h-11 items-center rounded-md px-2 font-semibold text-paper underline decoration-paper/40 underline-offset-4 transition-colors hover:text-crisp hover:decoration-crisp"
        >
          Политика конфиденциальности
        </a>
      </div>
      <Privacy open={privacy} onClose={close} />
    </footer>
  )
}
