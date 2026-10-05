import { Eyebrow, Scene, useScrub, useSectionRef } from "../scene"

const ITEMS = [
  { word: "Картофель", note: "Сушёные хлопья, собранные заново — ровным листом." },
  { word: "Масло", note: "Растительное. Ровно столько, чтобы блестел." },
  { word: "Мука", note: "Рисовая и пшеничная. Отвечают за хруст." },
  { word: "Соль", note: "Щепотка. Дальше работает вкус." },
  { word: "Изгиб", note: "Секретный ингредиент. Отдельно не продаётся." },
]

/**
 * 04 · Состав. A tilted ring of chips threads through giant words: the near
 * half passes in front of the type, the far half behind it. Each word wipes
 * up from a mask as the ring turns.
 */
export function Ingredients() {
  const ref = useSectionRef()

  useScrub(ref, (tl, q) => {
    const words = q("[data-word]")
    const notes = q("[data-note]")
    const counter = q("[data-count]")
    words.forEach((w, i) => {
      const at = 0.04 + i * 0.19
      tl.fromTo(w, { yPercent: 110, skewY: 8 }, { yPercent: 0, skewY: 0, duration: 0.07, ease: "power4.out" }, at)
      tl.fromTo(notes[i], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.05 }, at + 0.03)
      tl.set(counter, { textContent: "0" + (i + 1) }, at)
      if (i < words.length - 1) {
        tl.to(w, { yPercent: -110, skewY: -8, duration: 0.06, ease: "power3.in" }, at + 0.15)
        tl.to(notes[i], { opacity: 0, duration: 0.04 }, at + 0.15)
      }
    })
  })

  return (
    <Scene id="ingredients" label="Состав" sectionRef={ref} stageClassName="text-cream">
      <Eyebrow n="04" className="absolute left-4 top-20 md:left-8 md:top-24">
        Состав
      </Eyebrow>
      <p className="eyebrow absolute right-4 top-20 tabular-nums md:right-16 md:top-24" aria-hidden="true">
        <span data-count>01</span> / 05
      </p>
      <h2 className="sr-only">Из чего сделан Litenergles</h2>
      <ul className="absolute inset-0">
        {ITEMS.map((it, i) => (
          <li key={it.word} className="absolute inset-0 grid place-items-center">
            <span className="block overflow-hidden px-2 pb-[0.08em]">
              <span
                data-word
                className={
                  "display block text-[11vw] md:text-[min(10.5vw,13rem)] " + (i % 2 ? "outline-text text-crisp" : "")
                }
              >
                {it.word}
              </span>
            </span>
            <span
              data-note
              className="absolute inset-x-6 top-[22%] text-center font-serif text-[clamp(1.1rem,2.4vw,1.8rem)] italic opacity-0"
            >
              {it.note}
            </span>
          </li>
        ))}
      </ul>
    </Scene>
  )
}
