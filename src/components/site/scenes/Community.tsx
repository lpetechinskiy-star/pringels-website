import { Eyebrow, Scene, useScrub, useSectionRef } from "../scene"
import { cn } from "@/lib/utils"

const TOWERS = [
  { who: "@хрустик_маша", n: 47, q: "Строила, пока не чихнула." },
  { who: "@paprika.dad", n: 39, q: "Дети помогали. Съели основание." },
  { who: "@olya_crunch", n: 52, q: "Уровень: геометрия." },
  { who: "@tower_tima", n: 31, q: "Первая попытка. Не последняя." },
  { who: "@vkus_lab", n: 44, q: "Сыр и лук держат лучше." },
]

/**
 * 08 · Башни. Chips fall from the sky into towers of different heights, each
 * one "built" by someone in the community. The cards land under them with a
 * bounce, a beat after their tower tops out.
 */
export function Community() {
  const ref = useSectionRef()

  useScrub(ref, (tl, q) => {
    tl.fromTo(q("[data-head]"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.1 }, 0)
    q("[data-card]").forEach((c, i) =>
      tl.fromTo(c, { y: 120, rotate: i % 2 ? 9 : -9, opacity: 0 }, { y: 0, rotate: 0, opacity: 1, duration: 0.12, ease: "back.out(2)" }, 0.3 + i * 0.08),
    )
  })

  return (
    <Scene id="community" label="Башни сообщества" sectionRef={ref} stageClassName="text-ink">
      <div data-head className="absolute inset-x-4 top-20 md:left-8 md:right-auto md:top-24 md:max-w-xl">
        <Eyebrow n="08">Сообщество</Eyebrow>
        <h2 className="display mt-3 text-[clamp(2.2rem,7vw,5.5rem)]">Башни наших людей</h2>
        <p className="mt-3 hidden max-w-md text-lg leading-relaxed md:block">
          Каждую неделю кто-то строит стопку выше, чем вчера. Рекорд пока держится. Выложи свою с тегом{" "}
          <b className="font-display">#ГиперболаВкуса</b>.
        </p>
      </div>
      <ul className="absolute inset-x-0 bottom-6 h-36 md:bottom-10 md:h-40">
        {TOWERS.map((t, i) => {
          // columns sit under the towers: 5 on desktop, the first 3 on phones
          const desk = 16 + i * 17
          const mob = 20 + i * 30
          return (
            <li
              key={t.who}
              data-card
              className={cn(
                "absolute bottom-0 left-[var(--xm)] w-[30vw] md:left-[var(--xd)] -translate-x-1/2 rounded-[22px] bg-ink p-3 text-cream shadow-xl md:w-[15vw] md:max-w-60 md:p-4",
                i > 2 && "hidden md:block",
              )}
              style={{ ["--xm" as string]: `${mob}%`, ["--xd" as string]: `${desk}%` }}
            >
              <p className="truncate text-xs font-semibold text-crisp md:text-sm">{t.who}</p>
              <p className="font-display text-2xl font-black tabular-nums md:text-3xl">
                {t.n}
                <span className="ml-1 text-[0.55em] font-semibold">шт.</span>
              </p>
              <p className="mt-1 hidden font-serif text-sm italic leading-snug md:block">«{t.q}»</p>
            </li>
          )
        })}
      </ul>
    </Scene>
  )
}
