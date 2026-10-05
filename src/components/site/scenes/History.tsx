import { useRef } from "react"
import { Eyebrow, Scene, useScrub, useSectionRef } from "../scene"

const YEARS = [
  { y: "Год 0", t: "Плоско.", d: "Картофель узнаёт, что может быть плоским. Радуется недолго." },
  { y: "Год 1", t: "Хрусь.", d: "Плоские ломаются в пакете. Кто-то в лаборатории берёт карандаш и рисует седло." },
  { y: "Год 2", t: "Стопка.", d: "Седло ложится в седло. Стопку убирают в тубу. Пакет обижается." },
  { y: "Год 3", t: "Вечеринка.", d: "Тубу открывают при гостях. Остановиться не может никто. Это не баг." },
  { y: "Сегодня", t: "Вы здесь.", d: "Листаете сайт про чипсы и смотрите, как они катятся. Изгиб работает." },
]

/**
 * 06 · История. Vertical scroll becomes a sideways journey: the timeline
 * slides left while chips roll along the floor like wheels — no swiping
 * needed on a phone, the page scroll drives it all.
 */
export function History() {
  const ref = useSectionRef()
  const track = useRef<HTMLOListElement>(null)

  useScrub(ref, (tl, q) => {
    tl.to(track.current, { x: () => -(track.current!.scrollWidth - window.innerWidth), duration: 0.94 }, 0.03)
    q("[data-year]").forEach((el, i) => tl.fromTo(el, { xPercent: 40 }, { xPercent: -20, duration: 0.5 }, i * 0.16))
  })

  return (
    <Scene id="history" label="История" sectionRef={ref} stageClassName="text-ink">
      <Eyebrow n="06" className="absolute left-4 top-20 z-10 md:left-8 md:top-24">
        История изгиба
      </Eyebrow>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-[7%] h-[2px] bg-ink/25 md:bottom-[5%]" />
      <ol
        ref={track}
        className="absolute left-0 top-[18%] flex h-[52%] w-max items-stretch gap-[6vw] pl-4 pr-[10vw] will-change-transform md:top-[20%] md:pl-[8vw] short:top-[34%] short:h-[56%]"
      >
        {YEARS.map((y, i) => (
          <li key={y.y} className="relative flex w-[78vw] flex-col justify-between border-l-2 border-ink pl-5 md:w-[38vw] md:pl-8">
            <span data-year className="display outline-text block text-[clamp(2.4rem,min(9vw,15svh),7rem)] text-brand">
              {y.y}
            </span>
            <div>
              <h3 className="font-display text-[clamp(1.3rem,min(3.6vw,7svh),3rem)] font-extrabold tracking-[-0.04em]">{y.t}</h3>
              <p className="mt-2 max-w-sm text-[1.05rem] leading-relaxed md:text-lg short:text-sm short:leading-snug">{y.d}</p>
            </div>
            <span className="eyebrow absolute -left-[7px] top-0 size-3 rounded-full bg-ink" aria-hidden="true" />
            <span className="sr-only">{i + 1} из {YEARS.length}</span>
          </li>
        ))}
      </ol>
    </Scene>
  )
}
