import { useRef } from "react"
import gsap from "gsap"
import { SplitText } from "gsap/SplitText"
import { Eyebrow, Scene, useScrub, useSectionRef } from "../scene"

gsap.registerPlugin(SplitText)

const LINES = [
  "Плоский чипс — это картошка, которая сдалась.",
  "Наш решил иначе.",
  "Выгнулся вверх по одной оси",
  "и вниз — по другой.",
  "Теперь у него есть характер. И траектория.",
]

/**
 * 01 · Полёт. Darkness, and a tunnel of chips you fly through as you scroll.
 * The copy lights up word by word, karaoke-style, scrubbed by the scroll.
 */
export function Story() {
  const ref = useSectionRef()
  const text = useRef<HTMLDivElement>(null)

  useScrub(ref, (tl) => {
    const split = SplitText.create(text.current!.querySelectorAll("p"), { type: "words", wordsClass: "inline-block" })
    tl.fromTo(split.words, { opacity: 0.12 }, { opacity: 1, stagger: 0.75 / split.words.length, duration: 0.08 }, 0.06)
    tl.fromTo(text.current, { scale: 0.92 }, { scale: 1.04, duration: 1 }, 0)
  })

  return (
    <Scene id="story" label="Полёт" sectionRef={ref} stageClassName="text-paper">
      <Eyebrow n="01" className="absolute left-4 top-20 md:left-8 md:top-24">
        Полёт
      </Eyebrow>
      <div ref={text} className="absolute inset-0 grid place-content-center gap-[0.35em] px-5 text-center md:px-[12vw] short:gap-[0.2em] short:pb-2 short:pt-24">
        {LINES.map((l, i) => (
          <p
            key={i}
            className={
              i === 1
                ? "font-serif text-[clamp(1.6rem,min(7vw,11svh),5.5rem)] italic leading-none text-crisp"
                : "font-display text-[clamp(1.1rem,min(4.4vw,6.4svh),3.6rem)] font-bold leading-[1.08] tracking-[-0.03em]"
            }
          >
            {l}
          </p>
        ))}
      </div>
    </Scene>
  )
}
