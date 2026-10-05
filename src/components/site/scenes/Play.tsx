import { useEffect, useRef } from "react"
import gsap from "gsap"
import { Hand } from "lucide-react"
import { Eyebrow, Scene, useScrub, useSectionRef } from "../scene"
import { commands, useExperience } from "@/experience/store"

const REACTIONS: [number, string][] = [
  [0, "Гравитация включена."],
  [1, "Первый пошёл."],
  [5, "Неплохой бросок."],
  [12, "Вы точно не голодны?"],
  [25, "Чипсы просят пощады."],
  [40, "Ладно. Вы победили гравитацию."],
]

/**
 * 07 · Гравитация. The choreography stops and physics takes over: chips drop
 * onto the bottom of the screen and pile up. Grab one and fling it; tap empty
 * space to kick the whole pile. The Shake button does the same from a keyboard.
 */
export function Play() {
  const ref = useSectionRef()
  const throws = useExperience((s) => s.throws)
  const counter = useRef<HTMLSpanElement>(null)
  const reaction = [...REACTIONS].reverse().find(([n]) => throws >= n)![1]

  useEffect(() => {
    if (!throws || !counter.current) return
    gsap.fromTo(counter.current, { scale: 1.6, rotate: -8 }, { scale: 1, rotate: 0, duration: 0.6, ease: "elastic.out(1,0.4)" })
  }, [throws])

  useScrub(ref, (tl, q) => {
    tl.fromTo(q("[data-drop]"), { yPercent: -120, rotate: -6 }, { yPercent: 0, rotate: 0, stagger: 0.04, duration: 0.14, ease: "bounce.out" }, 0)
  })

  return (
    <Scene id="play" label="Гравитация" drag="play" sectionRef={ref} stageClassName="text-paper">
      <div className="pointer-events-none absolute inset-x-4 top-20 text-center md:top-24">
        <Eyebrow n="07" className="justify-center">
          Гравитация
        </Eyebrow>
        <h2 className="display mt-4 text-[clamp(2.4rem,10vw,6.5rem)]">
          {["Хватай.", "Бросай.", "Повторяй."].map((w) => (
            <span key={w} data-drop className="inline-block px-[0.12em]">
              {w}
            </span>
          ))}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed md:text-lg">
          <span className="hidden pointer-fine:inline">Перетащи чипс и отпусти с размаху. Клик по пустому месту подбросит всё.</span>
          <span className="pointer-fine:hidden">Тяни чипс пальцем и отпускай. Тап по пустому месту подбросит всё.</span>
        </p>
      </div>
      <div className="absolute inset-x-4 top-[46%] flex flex-col items-center gap-3 md:top-[56%]">
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em]" aria-live="polite">
          Брошено: <span ref={counter} className="inline-block text-2xl tabular-nums text-gold">{throws}</span>
          <span className="block pt-1 text-center font-serif text-lg normal-case italic tracking-normal">{reaction}</span>
        </p>
        <button type="button" onClick={() => commands.shake()} className="pill bg-paper text-brand">
          <Hand aria-hidden="true" className="size-4" />
          Встряхнуть
        </button>
      </div>
    </Scene>
  )
}
