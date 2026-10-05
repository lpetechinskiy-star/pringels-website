import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Lenis from "lenis"
import { Stage } from "./stage"
import { Director } from "./director"
import { store } from "./store"

gsap.registerPlugin(ScrollTrigger)

export let lenis: Lenis | null = null

/** Scroll to an element, smoothly when Lenis is running. */
export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { duration: 1.6 })
  else el.scrollIntoView({ behavior: store.get().reduced ? "auto" : "smooth" })
}

function chipCount() {
  const mobile = window.innerWidth < 768
  const cores = navigator.hardwareConcurrency || 4
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  const low = cores <= 4 || mem <= 3
  return { N: mobile ? (low ? 16 : 22) : low ? 24 : 32, low }
}

/**
 * The fixed layers behind and in front of the page: colour blocks, the back
 * WebGL canvas, (the page content sits here), the front WebGL canvas.
 */
export function Experience() {
  const back = useRef<HTMLCanvasElement>(null)
  const front = useRef<HTMLCanvasElement>(null)
  const bgBase = useRef<HTMLDivElement>(null)
  const bgNext = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let director: Director | null = null
    let stage: Stage | null = null
    let disposed = false
    const reduced = store.get().reduced

    if (!reduced) {
      lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9 })
      lenis.on("scroll", ScrollTrigger.update)
    }
    ScrollTrigger.config({ ignoreMobileResize: true })

    const tick = (_t: number, deltaMs: number) => {
      lenis?.raf(performance.now())
      if (director && !document.hidden) director.tick(deltaMs / 1000)
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const boot = async () => {
      // labels on the cans are drawn with the brand fonts, so wait for them (briefly)
      await Promise.race([
        Promise.all([
          document.fonts.load('900 64px "Unbounded Variable"'),
          document.fonts.load('600 32px "Onest Variable"'),
        ]),
        new Promise((r) => setTimeout(r, 1500)),
      ]).catch(() => {})
      if (disposed || !back.current || !front.current || !bgBase.current || !bgNext.current) return
      try {
        const { N, low } = chipCount()
        store.set({ chips: N })
        stage = new Stage(back.current, front.current, N, low)
        director = new Director(stage, bgBase.current, bgNext.current)
        if (location.search.includes("debug")) (window as unknown as { __lit: Director }).__lit = director
      } catch (err) {
        console.warn("WebGL unavailable, showing the page without the 3D layer", err)
        store.set({ noGL: true, ready: true })
        return
      }
      ScrollTrigger.refresh()
      director.measure()
      director.intro(() => store.set({ ready: true }))
    }
    boot()

    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        director?.resize()
        ScrollTrigger.refresh()
      })
    }
    window.addEventListener("resize", onResize)
    const ro = new ResizeObserver(onResize)
    ro.observe(document.body)

    const unsub = store.subscribe(() => {
      const r = store.get().reduced
      director?.setReduced(r)
      if (r && lenis) {
        lenis.destroy()
        lenis = null
      }
    })

    return () => {
      disposed = true
      unsub()
      gsap.ticker.remove(tick)
      window.removeEventListener("resize", onResize)
      ro.disconnect()
      director?.dispose()
      stage?.dispose()
      lenis?.destroy()
      lenis = null
    }
  }, [])

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div ref={bgBase} className="absolute inset-0" style={{ backgroundColor: "#d4102b" }} />
        <div
          ref={bgNext}
          className="absolute inset-x-0 top-0 h-lvh rounded-t-[56px] will-change-transform md:rounded-t-[120px]"
          style={{ transform: "translate3d(0,101%,0)" }}
        />
        <div className="grain absolute inset-0 opacity-[0.07] mix-blend-overlay" />
      </div>
      <canvas ref={back} aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[1] h-lvh w-full" />
      <canvas ref={front} aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[30] h-lvh w-full" />
    </>
  )
}
