import { useEffect, useRef } from "react"
import gsap from "gsap"
import { Eyebrow, Scene, useScrub, useSectionRef } from "../scene"
import { useExperience } from "@/experience/store"

/** Digits roll like an odometer when the count changes. */
function Odometer({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)
  useEffect(() => {
    const el = ref.current
    if (!el || prev.current === value) return
    gsap.fromTo(el, { yPercent: value > prev.current ? 60 : -60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, ease: "back.out(2)" })
    prev.current = value
  }, [value])
  return (
    <span className="inline-block overflow-hidden align-bottom">
      <span ref={ref} className="inline-block tabular-nums">
        {value < 10 ? "0" + value : value}
      </span>
    </span>
  )
}

/**
 * 03 · Стопка. Scroll pulls chips out of a waiting cloud along curved paths
 * and nests them one by one into a spinning stack — the shape explaining itself.
 */
export function Stack() {
  const ref = useSectionRef()
  const stacked = useExperience((s) => s.stacked)
  const total = useExperience((s) => s.chips)

  useScrub(ref, (tl, q) => {
    tl.fromTo(q("[data-line]"), { yPercent: 105 }, { yPercent: 0, stagger: 0.05, duration: 0.12, ease: "power3.out" }, 0.02)
    tl.fromTo(q("[data-body]"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.1 }, 0.16)
  })

  return (
    <Scene id="stack" label="Стопка" sectionRef={ref} stageClassName="text-ink">
      <div className="absolute inset-x-4 top-20 md:left-auto md:right-[6vw] md:top-1/2 md:w-[min(34rem,42vw)] md:-translate-y-1/2">
        <Eyebrow n="03">Стопка</Eyebrow>
        <h2 className="display mt-4 text-[clamp(2rem,min(10vw,9svh),5rem)] lg:text-[clamp(2rem,min(5.4vw,10svh),5.6rem)]">
          {["Изгиб", "ложится", "в изгиб."].map((w) => (
            <span key={w} className="block overflow-hidden pb-[0.06em]">
              <span data-line className="block">
                {w}
              </span>
            </span>
          ))}
        </h2>
        <p data-body className="mt-5 hidden max-w-md text-lg leading-relaxed md:block short:hidden">
          Никакой магии — только геометрия. Каждый чипс повторяет соседа, поэтому стопка собирается сама и не шуршит по
          пустякам.
        </p>
        <p data-body className="mt-4 font-display text-[clamp(1.6rem,min(6vw,9svh),4rem)] font-black tracking-[-0.04em] md:mt-8 short:mt-3" aria-live="off">
          <Odometer value={stacked} />
          <span className="text-ink/40"> / {total}</span>
          <span className="eyebrow ml-3 align-middle">в стопке</span>
        </p>
      </div>
    </Scene>
  )
}
