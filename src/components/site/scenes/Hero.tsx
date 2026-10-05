import { useEffect, useRef } from "react"
import gsap from "gsap"
import { SplitText } from "gsap/SplitText"
import { ArrowDown, ArrowLeft, ArrowRight } from "lucide-react"
import { Scene, useScrub, useSectionRef } from "../scene"
import { commands, useExperience } from "@/experience/store"

gsap.registerPlugin(SplitText)

/**
 * 00 · Поток. The hook: a column of chips shoots up and bursts into an endless
 * stream that climbs out of the page toward you — the disc cascade, as a river
 * of chips. Drag or swipe it sideways; it springs, rolls and swings.
 */
export function Hero() {
  const ref = useSectionRef()
  const title = useRef<HTMLHeadingElement>(null)
  const ready = useExperience((s) => s.ready)
  const reduced = useExperience((s) => s.reduced)

  // letters flip up like chips landing, the moment the stack bursts
  useEffect(() => {
    const el = title.current
    if (!el || !ready) return
    const split = SplitText.create(el.querySelectorAll("[data-line]"), { type: "chars", charsClass: "inline-block" })
    const ctx = gsap.context(() => {
      gsap.set(el, { autoAlpha: 1 })
      if (reduced) return
      gsap.from(split.chars, {
        yPercent: 120,
        rotationX: -100,
        rotationZ: () => gsap.utils.random(-25, 25),
        transformOrigin: "50% 100%",
        opacity: 0,
        duration: 1.1,
        ease: "back.out(2.2)",
        stagger: { each: 0.045, from: "center" },
      })
      gsap.from("[data-fade]", { opacity: 0, y: 24, duration: 0.9, delay: 0.7, stagger: 0.12, ease: "expo.out" })
    }, ref.current!)
    return () => {
      ctx.revert()
      split.revert()
    }
  }, [ready, reduced, ref])

  // scrolling away: the headline is pushed back and spread apart
  useScrub(ref, (tl, q) => {
    tl.to(q("[data-title]"), { scale: 1.35, letterSpacing: "0.04em", opacity: 0, yPercent: -12, duration: 0.55 }, 0.45)
    tl.to(q("[data-fade]"), { opacity: 0, y: -30, duration: 0.3 }, 0.4)
  })

  return (
    <Scene
      id="hero"
      label="Поток чипсов"
      drag="hero"
      sectionRef={ref}
      stageClassName="text-paper"
      stageProps={{
        tabIndex: 0,
        role: "group",
        "aria-roledescription": "интерактивная сцена",
        "aria-label": "Поток чипсов. Стрелки влево и вправо двигают поток.",
      }}
    >
      <div className="absolute inset-x-4 top-20 md:inset-x-8 md:top-24" data-fade>
        <p className="eyebrow">Litenergles · кампания №1</p>
      </div>

      <div className="absolute inset-0 grid place-items-center px-2" data-title>
        <h1
          ref={title}
          className="display invisible select-none text-center text-[clamp(3.6rem,19vw,9rem)] md:whitespace-nowrap md:text-[min(11.4vw,20rem,30svh)]"
          style={{ perspective: "600px" }}
        >
          <span className="sr-only">Гипербола — Litenergles</span>
          <span aria-hidden="true" className="block md:inline" data-line>
            Гипер
          </span>
          <span aria-hidden="true" className="block md:inline" data-line>
            бола
          </span>
        </h1>
      </div>

      <p
        data-fade
        className="absolute inset-x-4 bottom-[22%] text-center font-serif text-[clamp(1.25rem,4.6vw,2.2rem)] italic leading-tight md:bottom-[17%] short:bottom-[24%] short:text-lg"
      >
        Мы не преувеличиваем.
        <br />
        Мы так изогнуты.
      </p>

      <div data-fade className="absolute inset-x-4 bottom-5 flex items-end justify-between gap-4 md:inset-x-8 md:bottom-8">
        <div className="flex items-center gap-3">
          <button type="button" className="round-btn" aria-label="Поток назад" onClick={() => commands.heroStep(-1)}>
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
          <button type="button" className="round-btn" aria-label="Поток вперёд" onClick={() => commands.heroStep(1)}>
            <ArrowRight aria-hidden="true" className="size-5" />
          </button>
          <span className="eyebrow hidden max-w-[12rem] leading-relaxed sm:block">
            <span className="hidden pointer-fine:inline">Тяни поток мышью</span>
            <span className="pointer-fine:hidden">Свайпни поток</span>
          </span>
        </div>
        <span className="eyebrow flex items-center gap-2">
          Листай
          <ArrowDown aria-hidden="true" className="size-4 animate-bounce" />
        </span>
      </div>
    </Scene>
  )
}
