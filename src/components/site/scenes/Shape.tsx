import { Eyebrow, Scene, useScrub, useSectionRef } from "../scene"

const VIEWS = [
  { n: "1/3", title: "Сверху — овал.", text: "Одинаковый у каждого чипса. Да, у каждого. Мы проверяли." },
  { n: "2/3", title: "Сбоку — улыбка.", text: "Края поднимаются вверх. Чипс держит соус и настроение." },
  { n: "3/3", title: "Спереди — мостик.", text: "Середина прогибается вниз, и чипс не ломается в тубе." },
]

/**
 * 02 · Форма. One chip, huge, turned by the scroll through three views while
 * the rest orbit it; the formula types itself in and the captions swap.
 */
export function Shape() {
  const ref = useSectionRef()

  useScrub(ref, (tl, q) => {
    tl.fromTo(q("[data-formula]"), { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.16 }, 0.02)
    const cards = q("[data-view]")
    cards.forEach((card, i) => {
      const at = 0.08 + i * 0.3
      tl.fromTo(card, { autoAlpha: 0, xPercent: 18, rotate: 4 }, { autoAlpha: 1, xPercent: 0, rotate: 0, duration: 0.08, ease: "power3.out" }, at)
      if (i < cards.length - 1) tl.to(card, { autoAlpha: 0, xPercent: -18, rotate: -4, duration: 0.07, ease: "power2.in" }, at + 0.23)
    })
    tl.fromTo(q("[data-grid]"), { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0)
  })

  return (
    <Scene id="shape" label="Форма" sectionRef={ref} stageClassName="text-ink">
      {/* blueprint grid */}
      <div
        data-grid
        aria-hidden="true"
        className="absolute inset-0 opacity-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(26 15 10 / .08) 1px, transparent 1px), linear-gradient(to bottom, rgb(26 15 10 / .08) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="absolute inset-x-4 top-20 md:left-8 md:right-auto md:top-24 md:max-w-[44vw]">
        <Eyebrow n="02">Форма</Eyebrow>
        <h2 data-formula className="display mt-4 w-max whitespace-nowrap pr-[0.1em] text-[clamp(2.4rem,min(12vw,15svh),7.5rem)] normal-case">
          z = x² − y²
        </h2>
        <p className="mt-4 max-w-md font-serif text-[clamp(1.1rem,2.2vw,1.6rem)] italic leading-snug short:max-w-xs short:text-base">
          Гиперболический параболоид. Звучит как диагноз. Хрустит как праздник.
        </p>
      </div>

      <div className="absolute inset-x-4 bottom-6 h-44 md:bottom-12 md:left-8 md:right-auto md:w-[min(26rem,38vw)] short:bottom-4 short:h-28">
        {VIEWS.map((v) => (
          <article key={v.n} data-view className="invisible absolute inset-x-0 bottom-0 rounded-[28px] bg-ink p-6 text-cream shadow-2xl short:p-4">
            <p className="eyebrow text-crisp">Вид {v.n}</p>
            <h3 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.03em]">{v.title}</h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-cream/80 short:hidden">{v.text}</p>
          </article>
        ))}
      </div>
    </Scene>
  )
}
