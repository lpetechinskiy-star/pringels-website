import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { CHAPTERS, type SceneId } from "@/data/chapters"
import { store } from "@/experience/store"
import { cn } from "@/lib/utils"

gsap.registerPlugin(ScrollTrigger)

type SceneProps = {
  id: SceneId
  label: string
  /** Pointer gestures the director listens for on the stage. */
  drag?: "hero" | "flavors" | "play" | "finale"
  className?: string
  stageClassName?: string
  stageProps?: React.HTMLAttributes<HTMLDivElement>
  children: ReactNode
  sectionRef?: RefObject<HTMLElement | null>
}

/** A scroll chapter: a tall track with a sticky, full-screen stage the chips perform on. */
export function Scene({ id, label, drag, className, stageClassName, stageProps, children, sectionRef }: SceneProps) {
  const ch = CHAPTERS.find((c) => c.id === id)!
  return (
    <section
      ref={sectionRef as RefObject<HTMLElement>}
      id={id}
      data-scene={id}
      aria-label={label}
      className={cn("scene h-[var(--hm)] md:h-[var(--hd)]", className)}
      style={{ "--hd": ch.vh + "svh", "--hm": (ch.vhMobile ?? ch.vh) + "svh" } as CSSProperties}
    >
      <div data-drag={drag} className={cn("scene-stage", drag && "grab", stageClassName)} {...stageProps}>
        {children}
      </div>
    </section>
  )
}

/**
 * A timeline scrubbed by the section's own scroll: 0 when its stage sticks,
 * 1 when it lets go. Build it in 0…1 time units.
 */
export function useScrub(
  ref: RefObject<HTMLElement | null>,
  build: (tl: gsap.core.Timeline, q: (s: string) => HTMLElement[]) => void,
  deps: unknown[] = [],
) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "bottom bottom",
          scrub: store.get().reduced ? true : 0.5,
          invalidateOnRefresh: true,
        },
      })
      build(tl, gsap.utils.selector(el) as (s: string) => HTMLElement[])
      tl.set({}, {}, 1)
    }, el)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export function useSectionRef() {
  return useRef<HTMLElement | null>(null)
}

export function Eyebrow({ n, children, className }: { n: string; children: ReactNode; className?: string }) {
  return (
    <p className={cn("eyebrow flex items-center gap-3", className)}>
      <span className="tabular-nums">{n}</span>
      <span aria-hidden="true" className="h-px w-8 bg-current opacity-60" />
      <span>{children}</span>
    </p>
  )
}
