import { useEffect, useRef } from "react"
import gsap from "gsap"
import { SplitText } from "gsap/SplitText"
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react"
import { Eyebrow, Scene, useScrub, useSectionRef } from "../scene"
import { FLAVORS } from "@/data/flavors"
import { commands, useExperience } from "@/experience/store"
import { cn } from "@/lib/utils"

gsap.registerPlugin(SplitText)

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="eyebrow w-28 opacity-80">{label}</span>
      <span className="flex gap-1.5" role="img" aria-label={`${label}: ${value} из 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className="block h-3 w-5 rounded-[50%] border-2 transition-colors duration-500"
            style={{ borderColor: color, backgroundColor: i < value ? color : "transparent" }}
          />
        ))}
      </span>
    </div>
  )
}

/**
 * 05 · Вкусы. The reference mechanic, almost verbatim: five cans on a slanted
 * line that climbs toward you, driven by the same two springs, drag and flick.
 * Choosing a flavour recolours the world, re-seasons every chip and sends the
 * vortex around the can flying outward.
 */
export function Flavors() {
  const ref = useSectionRef()
  const flavor = useExperience((s) => s.flavor)
  const autoplay = useExperience((s) => s.autoplay)
  const f = FLAVORS[flavor]
  const name = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const el = name.current
    if (!el) return
    const split = SplitText.create(el, { type: "chars", charsClass: "inline-block" })
    const tw = gsap.from(split.chars, {
      rotationY: -90,
      yPercent: 40,
      opacity: 0,
      transformOrigin: "0% 50% -20px",
      duration: 0.7,
      ease: "back.out(1.8)",
      stagger: 0.03,
    })
    gsap.fromTo("[data-flavor-copy]", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: "expo.out" })
    return () => {
      tw.kill()
      split.revert()
    }
  }, [flavor])

  useScrub(ref, (tl, q) => {
    tl.fromTo(q("[data-in]"), { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.03, duration: 0.12, ease: "power3.out" }, 0)
  })

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") commands.flavorStep(1)
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") commands.flavorStep(-1)
    else if (e.key === "Home") commands.flavorGo(0)
    else if (e.key === "End") commands.flavorGo(FLAVORS.length - 1)
    else return
    e.preventDefault()
  }

  return (
    <Scene id="flavors" label="Вкусы" drag="flavors" sectionRef={ref}>
      <div className="absolute inset-0 transition-colors duration-700" style={{ color: f.ink }}>
        <div className="absolute inset-x-4 top-20 md:left-8 md:right-auto md:top-24 md:w-[min(40rem,46vw)]">
          <Eyebrow n="05">
            Вкусы
          </Eyebrow>
          <h2
            ref={name}
            key={f.id}
            className="display mt-3 text-[clamp(1.9rem,8.2vw,4rem)] [perspective:600px] md:text-[clamp(2rem,3.6vw,3.6rem)]"
            aria-live={autoplay ? "off" : "polite"}
          >
            {f.name}
          </h2>
          <p data-flavor-copy className="mt-4 hidden max-w-sm font-serif text-xl italic leading-snug md:block short:text-base">
            {f.tagline}
          </p>
          <div data-flavor-copy className="mt-6 hidden space-y-2 md:block short:hidden">
            <Meter label="Солёность" value={f.salt} color={f.ink} />
            <Meter label="Дерзость" value={f.nerve} color={f.ink} />
          </div>
          <ul data-flavor-copy className="mt-6 hidden flex-wrap gap-2 md:flex short:hidden">
            {f.notes.map((n) => (
              <li key={n} className="rounded-full border-2 px-3 py-1 text-sm font-semibold" style={{ borderColor: f.ink }}>
                {n}
              </li>
            ))}
          </ul>
        </div>

        <p
          data-flavor-copy
          className="absolute inset-x-6 bottom-36 text-center font-serif text-lg italic leading-snug md:hidden"
        >
          {f.tagline}
        </p>

        <div data-in className="absolute inset-x-4 bottom-6 flex flex-col items-center gap-4 md:inset-x-8 md:bottom-10 md:flex-row md:justify-between">
          <div
            role="radiogroup"
            aria-label="Выбор вкуса"
            onKeyDown={onKey}
            className="flex flex-wrap justify-center gap-2"
          >
            {FLAVORS.map((x, i) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={i === flavor}
                tabIndex={i === flavor ? 0 : -1}
                onClick={() => commands.flavorGo(i)}
                className={cn(
                  "pill min-w-12 border-2 px-3 md:px-4",
                  i === flavor ? "shadow-[0_8px_0_-2px_rgb(0_0_0/0.25)]" : "opacity-80 hover:opacity-100",
                )}
                style={{
                  borderColor: f.ink,
                  backgroundColor: i === flavor ? f.ink : "transparent",
                  color: i === flavor ? f.base : f.ink,
                }}
              >
                <span
                  aria-hidden="true"
                  className="block size-4 rounded-full border-2"
                  style={{ backgroundColor: x.base, borderColor: i === flavor ? f.base : f.ink }}
                />
                <span className="sr-only xl:not-sr-only">{x.name}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="eyebrow hidden opacity-80 2xl:inline">Тяни банки · ← →</span>
            <button
              type="button"
              className="round-btn"
              aria-label={autoplay ? "Остановить движение банок" : "Запустить движение банок"}
              aria-pressed={!autoplay}
              onClick={() => commands.flavorAuto(!autoplay)}
            >
              {autoplay ? <Pause aria-hidden="true" className="size-5" /> : <Play aria-hidden="true" className="size-5" />}
            </button>
            <button
              type="button"
              className="round-btn"
              aria-label="Предыдущий вкус"
              onClick={() => commands.flavorStep(-1)}
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </button>
            <span className="eyebrow whitespace-nowrap text-center tabular-nums" aria-hidden="true">
              0{flavor + 1} / 0{FLAVORS.length}
            </span>
            <button
              type="button"
              className="round-btn"
              aria-label="Следующий вкус"
              onClick={() => commands.flavorStep(1)}
            >
              <ArrowRight aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </Scene>
  )
}
