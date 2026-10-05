import * as THREE from "three"
import {
  indexAt,
  poseOf,
  releaseTarget,
  rng,
  rubber,
  springOf,
  springStep,
  type PoseConfig,
} from "@/components/ui/disc-cascade-carousel"
import { CHAPTERS } from "@/data/chapters"
import { FLAVORS } from "@/data/flavors"
import { CAN_H, CAN_R } from "./can"
import {
  DEG,
  FORMATIONS,
  clamp,
  finaleCenter,
  flavorCenter,
  lerp,
  rot,
  smooth,
  stackArrive,
  type Ctx,
  type Pose,
} from "./formations"
import { Physics } from "./physics"
import { CAM_Z, Stage } from "./stage"
import { commands, store } from "./store"

type Chip = {
  p: THREE.Vector3
  v: THREE.Vector3
  q: THREE.Quaternion
  w: THREE.Vector3
  s: number
  vs: number
  front: boolean
  last: THREE.Vector3
  off: THREE.Vector3
  offV: THREE.Vector3
  omega: number
  zeta: number
}

type Drag = { id: number; x0: number; y0: number; pos0: number; moved: boolean; samples: { t: number; x: number }[] }

type Section = { top: number; h: number }

const SCENE = Object.fromEntries(CHAPTERS.map((c, i) => [c.id, i])) as Record<(typeof CHAPTERS)[number]["id"], number>
const DARK_SCENES = new Set([SCENE.story, SCENE.ingredients])
const SPRING = springOf(0.22, 0.9)

const newPose = (): Pose => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 0, shadow: 0 })

/**
 * Runs the show: reads the scroll position, works out which formation (or pair
 * of formations) owns the screen, springs every chip toward its target, routes
 * each chip to the canvas in front of or behind the text, and handles every
 * drag, flick, tap and key the scenes accept.
 */
export class Director {
  stage: Stage
  N: number
  chips: Chip[] = []
  R: number[][] = []
  ctx: Ctx
  physics: Physics
  private sections: Section[] = []
  private vh = 1
  private time = 0
  private reduced = store.get().reduced
  private finePointer = window.matchMedia("(pointer: fine)").matches
  private mouse = { x: 9, y: 9, seen: 0 }
  private camOff = { x: 0, y: 0, vx: 0, vy: 0 }
  private wind = { x: 0, v: 0, lastY: window.scrollY }
  private heroEng = { a: 0, va: 0, b: 0, vb: 0, target: 0, drag: null as Drag | null, interacted: -10, nextAuto: 4.5 }
  private flavorEng = { a: 0, va: 0, b: 0, vb: 0, target: 0, drag: null as Drag | null, last: 0 }
  private canSpin = { ang: 0, vel: 0, drag: null as Drag | null, ang0: 0 }
  private lid = { y: 0, v: 0, r: 0, vr: 0 }
  private season = new THREE.Color(FLAVORS[0].season)
  private seasonTarget = new THREE.Color(FLAVORS[0].season)
  private flavorColor = new THREE.Color(FLAVORS[0].base)
  private bgBase: HTMLElement
  private bgNext: HTMLElement
  private bgCache = { base: "", next: "", y: "" }
  private A = newPose()
  private B = newPose()
  private T = newPose()
  private M = new THREE.Matrix4()
  private M2 = new THREE.Matrix4()
  private P = new THREE.Vector3()
  private SC = new THREE.Vector3()
  private V = new THREE.Vector3()
  private Q = new THREE.Quaternion()
  private Q2 = new THREE.Quaternion()
  private ID = new THREE.Quaternion()
  private C0 = new THREE.Color()
  private raycaster = new THREE.Raycaster()
  private cleanup: (() => void)[] = []
  private physicsWas = false
  private playTap: { x: number; y: number; t: number } | null = null
  private lastScene = -1
  /** World units the whole scene has scrolled up past the last chapter, into the footer. */
  private tail = 0

  constructor(stage: Stage, bgBase: HTMLElement, bgNext: HTMLElement) {
    this.stage = stage
    this.N = stage.N
    this.bgBase = bgBase
    this.bgNext = bgNext
    for (let i = 0; i < this.N; i++) {
      const r = rng(i * 7919 + 3)
      this.R.push(Array.from({ length: 8 }, () => r()))
      this.chips.push({
        p: new THREE.Vector3(0, -40, 0),
        v: new THREE.Vector3(),
        q: new THREE.Quaternion(),
        w: new THREE.Vector3(),
        s: 0,
        vs: 0,
        front: false,
        last: new THREE.Vector3(),
        off: new THREE.Vector3(),
        offV: new THREE.Vector3(),
        omega: (2 * Math.PI) / (0.62 + this.R[i][6] * 0.38),
        zeta: 0.62 + this.R[i][5] * 0.16,
      })
    }
    this.physics = new Physics(this.N, this.R)
    this.ctx = {
      N: this.N,
      W: 10,
      H: 6,
      S: 1,
      C: 2,
      mobile: false,
      time: 0,
      R: this.R,
      hero: { a: 0, b: 0, adv: 0, intro: this.reduced ? "done" : "stack", popAt: 0, rise: -20, squash: 0, mx: 0, my: 0 },
      flavorB: 0,
      canScale: 1,
      finale: { open: false, popAt: -10, spin: 0 },
      towers: [],
      physics: this.physics.bodies,
    }
    this.resize()
    this.bindInput()
    this.bindCommands()
  }

  // ---- layout ---------------------------------------------------------------------------
  resize() {
    this.stage.resize()
    const c = this.ctx
    c.W = this.stage.W
    c.H = this.stage.H
    c.mobile = this.stage.mobile
    c.S = c.mobile ? Math.min(c.W * 0.165, c.H * 0.08) : Math.min(c.H * 0.11, c.W * 0.07)
    c.C = c.S * 2
    c.canScale = c.mobile
      ? Math.min((c.H * 0.32) / CAN_H, (c.W * 0.4) / (2 * CAN_R))
      : Math.min((c.H * 0.5) / CAN_H, (c.W * 0.2) / (2 * CAN_R))
    // towers: split the chips into T stacks of uneven height
    const T = c.mobile ? 3 : 5
    const weights = [9, 6, 8, 5, 7].slice(0, T)
    const sum = weights.reduce((a, b) => a + b, 0)
    const counts = weights.map((w) => Math.max(1, Math.round((w / sum) * this.N)))
    let diff = this.N - counts.reduce((a, b) => a + b, 0)
    for (let j = 0; diff !== 0; j = (j + 1) % T) {
      counts[j] += Math.sign(diff)
      diff -= Math.sign(diff)
    }
    c.towers = []
    counts.forEach((n, j) => {
      for (let k = 0; k < n; k++) c.towers.push({ j, k, max: n, T })
    })
    this.measure()
  }

  measure() {
    this.vh = window.innerHeight
    this.sections = CHAPTERS.map((ch) => {
      const el = document.querySelector<HTMLElement>(`[data-scene="${ch.id}"]`)
      if (!el) return { top: 0, h: this.vh }
      const r = el.getBoundingClientRect()
      return { top: r.top + window.scrollY, h: r.height }
    })
  }

  private resolve(y: number) {
    const S = this.sections
    let k = 0
    for (let i = 0; i < S.length; i++) if (y >= S[i].top - 1) k = i
    const s = S[k]
    const t = clamp((y - s.top) / Math.max(1, s.h - this.vh))
    const next = S[k + 1]
    const w = next ? clamp((y - (next.top - this.vh)) / this.vh) : 0
    return { k, t, w }
  }

  // ---- intro ----------------------------------------------------------------------------
  /** The hook: a column of chips shoots up, squeezes, and bursts into the stream. */
  intro(onPop: () => void) {
    const h = this.ctx.hero
    if (this.reduced) {
      h.intro = "done"
      onPop()
      return
    }
    h.intro = "stack"
    h.rise = -this.ctx.H * 1.1
    this.chips.forEach((ch, i) => {
      ch.p.set(0, -this.ctx.H * 1.1 + (i - this.N / 2) * this.ctx.S * 0.1, 0.6)
      ch.s = this.ctx.S
    })
    const t0 = this.time
    const timeline = [
      { at: 0.05, run: () => (this.riseTo = 0) },
      { at: 1.25, run: () => (this.squashTo = 1) },
      {
        at: 1.55,
        run: () => {
          h.intro = "pop"
          h.popAt = this.time
          this.squashTo = 0
          this.chips.forEach((ch, i) => {
            const r = this.R[i]
            const a = r[0] * Math.PI * 2
            ch.v.set(Math.cos(a) * (5 + r[1] * 8), 4 + Math.sin(a) * 6 + r[2] * 6, 3 + r[3] * 8)
            ch.w.set((r[4] - 0.5) * 30, (r[5] - 0.5) * 30, (r[6] - 0.5) * 30)
          })
          onPop()
        },
      },
      { at: 3.2, run: () => (h.intro = "done") },
    ]
    this.introQueue = timeline.map((e) => ({ at: t0 + e.at, run: e.run }))
  }
  private introQueue: { at: number; run: () => void }[] = []
  private riseTo = -20
  private squashTo = 0

  // ---- input ----------------------------------------------------------------------------
  private on<K extends keyof HTMLElementEventMap>(
    el: HTMLElement | Window | Document,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
    opts?: AddEventListenerOptions,
  ) {
    el.addEventListener(type, fn as EventListener, opts)
    this.cleanup.push(() => el.removeEventListener(type, fn as EventListener, opts))
  }

  private toWorld(cx: number, cy: number, out: THREE.Vector3) {
    return out.set((cx / this.stage.width - 0.5) * this.ctx.W, -(cy / this.stage.height - 0.5) * this.ctx.H, 0)
  }

  /** Horizontal drag with a 6px threshold; a vertical start on touch is left to the page scroll. */
  private dragStart(e: PointerEvent, pos: number): Drag | null {
    if (e.button !== 0) return null
    return { id: e.pointerId, x0: e.clientX, y0: e.clientY, pos0: pos, moved: false, samples: [{ t: e.timeStamp, x: e.clientX }] }
  }

  private dragMove(d: Drag | null, e: PointerEvent, el: HTMLElement): boolean {
    if (!d || d.id !== e.pointerId) return false
    const dx = e.clientX - d.x0
    const dy = e.clientY - d.y0
    if (!d.moved) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return false
      if (Math.abs(dy) > Math.abs(dx)) {
        d.id = -1
        return false
      }
      d.moved = true
      d.x0 = e.clientX
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* pointer already gone */
      }
    }
    d.samples.push({ t: e.timeStamp, x: e.clientX })
    if (d.samples.length > 6) d.samples.shift()
    return true
  }

  /** px/ms over the last few samples. */
  private dragVelocity(d: Drag, e: PointerEvent) {
    if (e.type === "pointercancel") return 0
    const a = d.samples[0]
    const b = d.samples[d.samples.length - 1]
    return (b.x - a.x) / Math.max(b.t - a.t, 1)
  }

  private heroSlotPx() {
    const sp = this.ctx.mobile ? 0.24 : 0.62
    return Math.max(70, sp * this.ctx.C * (this.stage.width / this.ctx.W))
  }

  private flavorSlotPx() {
    return Math.max(90, this.flavorCfg().spacing * this.canUnit() * (this.stage.width / this.ctx.W))
  }

  private bindInput() {
    this.on(window, "pointermove", (e) => {
      if (e.pointerType !== "mouse") return
      this.mouse.x = (e.clientX / this.stage.width) * 2 - 1
      this.mouse.y = -((e.clientY / this.stage.height) * 2 - 1)
      this.mouse.seen = this.time
    })
    this.on(document, "pointerleave", () => {
      this.mouse.x = this.mouse.y = 9
    })
    // a touch anywhere nudges the chips under the finger
    this.on(window, "pointerdown", (e) => {
      if (e.pointerType === "mouse" || this.reduced) return
      const nx = (e.clientX / this.stage.width) * 2 - 1
      const ny = -((e.clientY / this.stage.height) * 2 - 1)
      for (const ch of this.chips) {
        this.V.copy(ch.p).project(this.stage.camera)
        const dx = (this.V.x - nx) * this.stage.camera.aspect
        const dy = this.V.y - ny
        const d = Math.hypot(dx, dy)
        if (d < 0.45 && d > 1e-3) {
          const f = (1 - d / 0.45) * 7
          ch.v.x += (dx / d) * f
          ch.v.y += (dy / d) * f
          ch.w.z += (Math.random() - 0.5) * 12
        }
      }
    })
    this.on(window, "scroll", () => {}, { passive: true })

    const hero = document.querySelector<HTMLElement>('[data-drag="hero"]')
    if (hero) {
      const E = this.heroEng
      this.on(hero, "pointerdown", (e) => {
        if ((e.target as Element).closest("button,a")) return
        E.drag = this.dragStart(e, E.a)
      })
      this.on(hero, "pointermove", (e) => {
        if (!this.dragMove(E.drag, e, hero)) return
        const d = E.drag!
        E.a = d.pos0 - (e.clientX - d.x0) / this.heroSlotPx()
        E.interacted = this.time
      })
      const up = (e: PointerEvent) => {
        const d = E.drag
        if (!d || d.id !== e.pointerId) return (E.drag = null)
        E.drag = null
        if (!d.moved) return
        const v = (-this.dragVelocity(d, e) / this.heroSlotPx()) * 1000
        E.va = v
        E.target = releaseTarget(E.a, v, this.N, true)
        E.interacted = this.time
      }
      this.on(hero, "pointerup", up)
      this.on(hero, "pointercancel", up)
      this.on(hero, "keydown", (e) => {
        if (e.key === "ArrowRight") commands.heroStep(1)
        else if (e.key === "ArrowLeft") commands.heroStep(-1)
        else return
        e.preventDefault()
      })
    }

    const fl = document.querySelector<HTMLElement>('[data-drag="flavors"]')
    if (fl) {
      const E = this.flavorEng
      this.on(fl, "pointerdown", (e) => {
        if ((e.target as Element).closest("button,a")) return
        E.drag = this.dragStart(e, E.a)
      })
      this.on(fl, "pointermove", (e) => {
        if (!this.dragMove(E.drag, e, fl)) return
        const d = E.drag!
        E.a = rubber(d.pos0 - (e.clientX - d.x0) / this.flavorSlotPx(), FLAVORS.length)
        this.setFlavor(indexAt(E.a, FLAVORS.length, false))
      })
      const up = (e: PointerEvent) => {
        const d = E.drag
        E.drag = null
        if (!d || d.id !== e.pointerId) return
        if (!d.moved) {
          // a click on a can that isn't chosen brings it forward
          const hit = this.pickCan(e.clientX, e.clientY)
          if (hit >= 0) this.flavorGo(hit)
          return
        }
        const v = (-this.dragVelocity(d, e) / this.flavorSlotPx()) * 1000
        E.va = v
        this.flavorTarget(releaseTarget(E.a, v, FLAVORS.length, false))
      }
      this.on(fl, "pointerup", up)
      this.on(fl, "pointercancel", up)
    }

    const play = document.querySelector<HTMLElement>('[data-drag="play"]')
    if (play) {
      this.on(play, "pointerdown", (e) => {
        if ((e.target as Element).closest("button,a") || !this.physics.active) return
        this.toWorld(e.clientX, e.clientY, this.V)
        const i = this.physics.pick(this.V.x, this.V.y, this.ctx.S * 1.1)
        if (i >= 0) {
          this.physics.grab(i, this.V.x, this.V.y)
          try {
            play.setPointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
          this.playTap = null
        } else this.playTap = { x: e.clientX, y: e.clientY, t: this.time }
      })
      this.on(play, "pointermove", (e) => {
        if (this.physics.grabbed < 0) return
        this.toWorld(e.clientX, e.clientY, this.V)
        this.physics.moveGrab(this.V.x, this.V.y)
      })
      const up = (e: PointerEvent) => {
        if (this.physics.grabbed >= 0) {
          const speed = this.physics.release()
          if (speed > 6 && e.type !== "pointercancel") store.set({ throws: store.get().throws + 1 })
          return
        }
        const tap = this.playTap
        this.playTap = null
        if (tap && e.type === "pointerup" && this.time - tap.t < 0.35 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10) {
          this.toWorld(e.clientX, e.clientY, this.V)
          this.physics.blast(this.V.x, this.V.y, 9)
        }
      }
      this.on(play, "pointerup", up)
      this.on(play, "pointercancel", up)
      // a finger on a chip holds the chip, not the page
      this.on(play, "touchstart", (e) => {
        if (this.physics.grabbed >= 0) e.preventDefault()
      }, { passive: false })
      this.on(play, "touchmove", (e) => {
        if (this.physics.grabbed >= 0) e.preventDefault()
      }, { passive: false })
    }

    const fin = document.querySelector<HTMLElement>('[data-drag="finale"]')
    if (fin) {
      const S = this.canSpin
      this.on(fin, "pointerdown", (e) => {
        if ((e.target as Element).closest("button,a")) return
        S.drag = this.dragStart(e, 0)
        S.ang0 = S.ang
      })
      this.on(fin, "pointermove", (e) => {
        if (!this.dragMove(S.drag, e, fin)) return
        S.ang = S.ang0 + (e.clientX - S.drag!.x0) * 0.012
        S.vel = 0
      })
      const up = (e: PointerEvent) => {
        const d = S.drag
        S.drag = null
        if (!d || d.id !== e.pointerId || !d.moved) return
        S.vel = this.dragVelocity(d, e) * 12
      }
      this.on(fin, "pointerup", up)
      this.on(fin, "pointercancel", up)
    }
  }

  private bindCommands() {
    commands.heroStep = (by: number) => {
      const E = this.heroEng
      E.target = Math.round(E.target) - by
      E.interacted = this.time
    }
    commands.flavorStep = (by: number) => this.flavorTarget(Math.round(this.flavorEng.target) + by)
    commands.flavorGo = (i: number) => this.flavorGo(i)
    commands.shake = () => {
      if (!this.physics.active) return
      this.physics.blast(0, -this.ctx.H * 0.6, 16)
      store.set({ throws: store.get().throws + 1 })
    }
    commands.popCan = () => this.popCan()
    commands.spinCan = (by: number) => {
      this.canSpin.vel += by * 6
    }
  }

  private flavorGo(i: number) {
    this.flavorTarget(i)
  }

  private flavorTarget(t: number) {
    const n = FLAVORS.length
    this.flavorEng.target = Math.min(Math.max(t, 0), n - 1)
    this.setFlavor(indexAt(this.flavorEng.target, n, false))
  }

  private setFlavor(i: number) {
    if (store.get().flavor === i) return
    store.set({ flavor: i })
    this.seasonTarget.set(FLAVORS[i].season)
    this.stage.setLabel(this.stage.finaleCan, i)
    // the vortex flinches outward and spins up
    flavorCenter(this.ctx, this.V)
    for (const ch of this.chips) {
      const dx = ch.p.x - this.V.x
      const dz = ch.p.z - this.V.z
      const d = Math.max(0.3, Math.hypot(dx, dz))
      ch.v.x += (dx / d) * 7
      ch.v.z += (dz / d) * 7
      ch.v.y += (Math.random() - 0.3) * 4
      ch.w.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18)
    }
  }

  private popCan() {
    const f = this.ctx.finale
    if (f.open) return
    f.open = true
    f.popAt = this.time
    store.set({ canOpen: true })
    this.lid.v = 9
    this.lid.vr = 8
    window.setTimeout(() => {
      f.open = false
      store.set({ canOpen: false })
    }, 3300)
  }

  private canUnit() {
    return 2 * CAN_R * this.ctx.canScale
  }

  private flavorCfg(): PoseConfig {
    return this.ctx.mobile
      ? { spacing: 1.0, rise: 0.5, depth: 0.45, yaw: -14, fan: -10, roll: 110 }
      : { spacing: 1.3, rise: 0.34, depth: 0.95, yaw: -14, fan: -10, roll: 110 }
  }

  private pickCan(cx: number, cy: number) {
    const ndc = new THREE.Vector2((cx / this.stage.width) * 2 - 1, -((cy / this.stage.height) * 2 - 1))
    this.raycaster.setFromCamera(ndc, this.stage.camera)
    let best = -1
    let bd = Infinity
    this.stage.flavorCans.forEach((can, j) => {
      if (!can.group.visible) return
      const hit = this.raycaster.intersectObject(can.group, true)[0]
      if (hit && hit.distance < bd) {
        bd = hit.distance
        best = j
      }
    })
    return best
  }

  setReduced(on: boolean) {
    this.reduced = on
    if (on) this.ctx.hero.intro = "done"
  }

  // ---- frame ----------------------------------------------------------------------------
  tick(dtRaw: number) {
    const dt = Math.min(Math.max(dtRaw, 0), 1 / 20)
    this.time += dt
    const c = this.ctx
    c.time = this.reduced ? 0 : this.time
    while (this.introQueue.length && this.introQueue[0].at <= this.time) this.introQueue.shift()!.run()

    const y = window.scrollY
    const { k, t, w } = this.resolve(y)
    const last = this.sections[this.sections.length - 1]
    this.tail = last ? (Math.max(0, y - (last.top + last.h - this.vh)) * c.H) / this.stage.height : 0
    const chapter = w > 0.5 ? k + 1 : k
    if (chapter !== store.get().chapter) store.set({ chapter })

    // scroll "wind": chips lean into fast scrolling
    const sv = (y - this.wind.lastY) / Math.max(dt, 1e-3)
    this.wind.lastY = y
    ;[this.wind.x, this.wind.v] = springStep(this.wind.x, this.wind.v, this.reduced ? 0 : clamp(sv / 2600, -1, 1), 9, 0.7, dt)

    // ---- engines ----
    const h = c.hero
    const HE = this.heroEng
    if (!this.reduced && k === 0 && h.intro === "done" && !HE.drag && this.time - HE.interacted > 5 && this.time > HE.nextAuto) {
      HE.target -= 1
      HE.nextAuto = this.time + 2.6
    }
    if (!HE.drag) [HE.a, HE.va] = springStep(HE.a, HE.va, HE.target, SPRING.omega, SPRING.slide, dt)
    ;[HE.b, HE.vb] = springStep(HE.b, HE.vb, HE.a, SPRING.omega * 1.05, SPRING.tilt, dt)
    if (this.reduced) HE.b = HE.a
    h.a = HE.a
    h.b = HE.b
    h.adv = -(k === 0 ? t : 1) * 3
    ;[h.rise] = springStep(h.rise, 0, this.riseTo, 7, 1, dt)
    h.squash = lerp(h.squash, this.squashTo, 1 - Math.exp(-dt * 18))
    const mouseOn = this.finePointer && !this.reduced && Math.abs(this.mouse.x) <= 1 && Math.abs(this.mouse.y) <= 1
    h.mx = lerp(h.mx, mouseOn ? this.mouse.x : 0, 1 - Math.exp(-dt * 6))
    h.my = lerp(h.my, mouseOn ? this.mouse.y : 0, 1 - Math.exp(-dt * 6))

    const FE = this.flavorEng
    if (this.reduced && !FE.drag) {
      FE.a = FE.b = FE.target
    } else {
      if (!FE.drag) [FE.a, FE.va] = springStep(FE.a, FE.va, FE.target, SPRING.omega, SPRING.slide, dt)
      ;[FE.b, FE.vb] = springStep(FE.b, FE.vb, FE.a, SPRING.omega * 1.05, SPRING.tilt, dt)
    }
    c.flavorB = FE.b

    const CS = this.canSpin
    if (!CS.drag) {
      CS.vel *= Math.exp(-dt * 1.6)
      CS.ang += (CS.vel + (this.reduced ? 0 : 0.35)) * dt
    }
    c.finale.spin = CS.ang

    // ---- physics owns the chips around the gravity scene ----
    const physicsOn = k === SCENE.play || (k === SCENE.play - 1 && w > 0)
    if (physicsOn && !this.physicsWas) {
      this.physics.start(
        this.chips.map((ch) => ch.p),
        this.chips.map((ch) => ch.v),
      )
    } else if (!physicsOn && this.physicsWas) this.physics.stop()
    this.physicsWas = physicsOn
    this.physics.step(dt, c.W, c.H, c.S * (c.mobile ? 0.8 : 0.85))

    if (k === SCENE.stack) {
      let n = 0
      for (let i = 0; i < this.N; i++) if (stackArrive(i, t, this.N) > 0.9) n++
      if (n !== store.get().stacked) store.set({ stacked: n })
    }

    // seasoning follows the chosen flavour
    this.season.lerp(this.seasonTarget, 1 - Math.exp(-dt * 4))
    this.flavorColor.lerp(this.C0.set(FLAVORS[store.get().flavor].base), 1 - Math.exp(-dt * 5))
    this.writeColors()

    // camera drifts with the mouse
    const camTX = mouseOn && k !== SCENE.play ? this.mouse.x * 0.35 : 0
    const camTY = mouseOn && k !== SCENE.play ? this.mouse.y * 0.22 : 0
    ;[this.camOff.x, this.camOff.vx] = springStep(this.camOff.x, this.camOff.vx, camTX, 5, 0.9, dt)
    ;[this.camOff.y, this.camOff.vy] = springStep(this.camOff.y, this.camOff.vy, camTY, 5, 0.9, dt)
    this.stage.camera.position.set(this.camOff.x, this.camOff.y, CAM_Z)
    this.stage.camera.lookAt(0, 0, 0)
    this.stage.camera.updateMatrixWorld()

    this.updateChips(k, t, w, dt, mouseOn)
    this.updateCans(k, t, w, dt)
    this.updateBackground(k, w)
    this.lastScene = k
    this.stage.render()
  }

  private target(i: number, k: number, t: number, w: number, out: Pose) {
    const c = this.ctx
    const A = this.A
    FORMATIONS[k](i, t, c, A)
    if (w <= 0 || k + 1 >= FORMATIONS.length) {
      out.p.copy(A.p)
      out.q.copy(A.q)
      out.s = A.s
      out.shadow = A.shadow
      return
    }
    const B = this.B
    FORMATIONS[k + 1](i, 0, c, B)
    const r = this.R[i]
    const wi = smooth(0, 1, (w - r[7] * 0.35) / 0.65)
    out.p.lerpVectors(A.p, B.p, wi)
    // travel on a curve, not a straight line
    const arc = Math.sin(Math.PI * wi) * c.C * (0.6 + r[2])
    out.p.x += (r[0] - 0.5) * arc
    out.p.y += (0.4 + r[1] * 0.6) * arc
    out.p.z += (r[3] - 0.3) * arc * 1.4
    out.q.copy(A.q).slerp(B.q, wi)
    out.q.multiply(this.Q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 2 * wi * (r[4] > 0.5 ? 1 : -1)))
    out.s = lerp(A.s, B.s, wi)
    out.shadow = lerp(A.shadow, B.shadow, wi)
  }

  private updateChips(k: number, t: number, w: number, dt: number, mouseOn: boolean) {
    const c = this.ctx
    const T = this.T
    const cam = this.stage.camera
    const back = this.stage.back
    const front = this.stage.front
    let nb = 0
    let nf = 0
    let ns = 0
    const shadowMul = DARK_SCENES.has(k) && w < 0.5 ? 0 : DARK_SCENES.has(k + 1) && w >= 0.5 ? 0 : 0.34
    const sceneJump = this.lastScene !== -1 && Math.abs(k - this.lastScene) > 1
    const popping = c.hero.intro === "pop"
    const physicsScene = k === SCENE.play

    for (let i = 0; i < this.N; i++) {
      const ch = this.chips[i]
      this.target(i, k, t, w, T)

      // wind: lean with the scroll
      if (!physicsScene && this.wind.x) {
        T.q.premultiply(this.Q.setFromAxisAngle(this.V.set(1, 0, 0), this.wind.x * 0.55 * (0.6 + this.R[i][2] * 0.8)))
        T.p.y -= this.wind.x * c.C * 0.12
      }

      // cursor: chips near the pointer duck away and tilt
      let offT = 0
      if (mouseOn && !physicsScene) {
        this.V.copy(T.p).project(cam)
        const dx = (this.V.x - this.mouse.x) * cam.aspect
        const dy = this.V.y - this.mouse.y
        const d = Math.hypot(dx, dy)
        if (d < 0.38 && d > 1e-4) {
          const f = (1 - d / 0.38) ** 2
          const k2 = ((CAM_Z - T.p.z) / CAM_Z) * c.C * 0.75 * f
          this.P.set((dx / d) * k2, (dy / d) * k2, f * 0.8)
          T.q.premultiply(this.Q.setFromAxisAngle(this.V.set(-dy / d, dx / d, 0), f * 0.7))
          offT = 1
        }
      }
      if (!offT) this.P.set(0, 0, 0)
      for (const ax of ["x", "y", "z"] as const) {
        ;[ch.off[ax], ch.offV[ax]] = springStep(ch.off[ax], ch.offV[ax], this.P[ax], 13, 0.45, dt)
      }

      // springs: position, rotation, scale
      const jump = ch.last.distanceToSquared(T.p) > (c.C * 3) ** 2
      ch.last.copy(T.p)
      if (this.reduced || (jump && !popping) || sceneJump) {
        ch.p.copy(T.p)
        ch.v.set(0, 0, 0)
        ch.q.copy(T.q)
        ch.w.set(0, 0, 0)
        ch.s = T.s
        ch.vs = 0
      } else {
        const om = physicsScene ? ch.omega * 2.2 : ch.omega
        const ze = popping ? 0.42 : ch.zeta
        this.springVec(ch.p, ch.v, T.p, om, ze, dt)
        this.springQuat(ch, T.q, om * 0.9, Math.min(1, ze + 0.1), dt)
        ;[ch.s, ch.vs] = springStep(ch.s, ch.vs, T.s, om * 1.1, 0.8, dt)
      }

      const s = Math.max(0, ch.s)
      if (s < 0.004) continue
      this.P.copy(ch.p).add(ch.off)
      this.P.y += this.tail
      // in front of the text plane or behind it, with a little hysteresis
      if (this.P.z > 0.3) ch.front = true
      else if (this.P.z < -0.05) ch.front = false
      this.M.compose(this.P, ch.q, this.SC.set(s, s, s))
      if (ch.front) front.chips.setMatrixAt(nf++, this.M)
      else back.chips.setMatrixAt(nb++, this.M)

      const sh = T.shadow * shadowMul * clamp(1 - Math.max(0, this.P.z) / 9)
      if (sh > 0.01 && back.shadows) {
        const zp = Math.max(0, this.P.z)
        this.V.set(this.P.x + s * 0.3 + zp * 0.05, this.P.y - s * 0.5 - zp * 0.1, this.P.z - 1 - zp * 0.3)
        this.M2.compose(this.V, this.ID, this.SC.set(s * 2.4, s * 1.7, 1))
        back.shadows.setMatrixAt(ns, this.M2)
        back.shadows.setColorAt(ns, this.C0.setRGB(sh, 0, 0))
        ns++
      }
    }
    back.chips.count = nb
    front.chips.count = nf
    back.chips.instanceMatrix.needsUpdate = true
    front.chips.instanceMatrix.needsUpdate = true
    if (back.shadows) {
      back.shadows.count = ns
      back.shadows.instanceMatrix.needsUpdate = true
      if (back.shadows.instanceColor) back.shadows.instanceColor.needsUpdate = true
    }
  }

  private springVec(x: THREE.Vector3, v: THREE.Vector3, to: THREE.Vector3, omega: number, zeta: number, dt: number) {
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
    const h = dt / steps
    const k = omega * omega
    const d = 2 * zeta * omega
    for (let s = 0; s < steps; s++) {
      v.x += (-k * (x.x - to.x) - d * v.x) * h
      v.y += (-k * (x.y - to.y) - d * v.y) * h
      v.z += (-k * (x.z - to.z) - d * v.z) * h
      x.x += v.x * h
      x.y += v.y * h
      x.z += v.z * h
    }
  }

  /** Angular spring: torque toward the target orientation, integrated as an angular velocity. */
  private springQuat(ch: Chip, to: THREE.Quaternion, omega: number, zeta: number, dt: number) {
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
    const h = dt / steps
    const e = this.Q2
    for (let s = 0; s < steps; s++) {
      e.copy(ch.q).invert().premultiply(to)
      if (e.w < 0) e.set(-e.x, -e.y, -e.z, -e.w)
      const ang = 2 * Math.acos(Math.min(1, e.w))
      const sn = Math.sqrt(Math.max(0, 1 - e.w * e.w))
      const ex = sn > 1e-5 ? (e.x / sn) * ang : 0
      const ey = sn > 1e-5 ? (e.y / sn) * ang : 0
      const ez = sn > 1e-5 ? (e.z / sn) * ang : 0
      ch.w.x += (omega * omega * ex - 2 * zeta * omega * ch.w.x) * h
      ch.w.y += (omega * omega * ey - 2 * zeta * omega * ch.w.y) * h
      ch.w.z += (omega * omega * ez - 2 * zeta * omega * ch.w.z) * h
      const wl = ch.w.length()
      if (wl > 1e-6) {
        this.Q.setFromAxisAngle(this.V.copy(ch.w).divideScalar(wl), wl * h)
        ch.q.premultiply(this.Q).normalize()
      }
    }
  }

  private seasonCache = ""
  private writeColors() {
    const key = this.season.getHexString()
    if (key === this.seasonCache) return
    this.seasonCache = key
    for (const l of [this.stage.back, this.stage.front]) {
      for (let i = 0; i < this.N; i++) l.chips.setColorAt(i, this.season)
      if (l.chips.instanceColor) l.chips.instanceColor.needsUpdate = true
    }
  }

  private updateCans(k: number, t: number, w: number, dt: number) {
    const c = this.ctx
    const cs = c.canScale
    const D = this.canUnit()
    // flavour cans: the reference cascade, verbatim maths, cans for discs
    const visRaw = k === SCENE.flavors ? 1 - w : k === SCENE.flavors - 1 ? w : 0
    const vis = smooth(0, 1, visRaw)
    const cfg = this.flavorCfg()
    flavorCenter(c, this.V)
    const cx = this.V.x
    const cy = this.V.y
    this.stage.flavorCans.forEach((can, j) => {
      const p = poseOf(j - this.flavorEng.a, j - this.flavorEng.b, cfg)
      const g = can.group
      g.visible = vis > 0.01 && !p.hidden && p.opacity > 0.02
      if (!g.visible) return
      const enter = 1 - vis
      g.position.set(cx + p.x * D, cy - p.y * D - enter * c.H * 1.2, p.z * D)
      rot(g.quaternion, 0.12, (p.yaw + p.roll) * DEG + enter * Math.PI * 1.5, (-7 + (j - this.flavorEng.b) * 1.5) * DEG)
      g.scale.setScalar(cs * p.opacity)
      can.lid.position.y = CAN_H / 2 + 0.06
      can.lid.rotation.set(0, 0, 0)
    })

    // finale can: drops over the stack, spins, pops
    const fc = this.stage.finaleCan
    const tf = k === SCENE.finale ? t : 0
    fc.group.visible = k === SCENE.finale
    if (!fc.group.visible) return
    finaleCenter(c, this.V)
    const drop = 1 - smooth(0.32, 0.7, tf)
    fc.group.position.set(this.V.x, this.V.y + drop * c.H * 1.15 + this.tail, 0)
    rot(fc.group.quaternion, 0.1, this.canSpin.ang - 0.3, -4 * DEG)
    fc.group.scale.setScalar(cs)
    const L = this.lid
    const open = c.finale.open
    ;[L.y, L.v] = springStep(L.y, L.v, open ? 0.75 : 0, 9, open ? 0.35 : 0.6, dt)
    ;[L.r, L.vr] = springStep(L.r, L.vr, open ? 0.9 : 0, 7, 0.4, dt)
    fc.lid.position.y = CAN_H / 2 + 0.06 + Math.max(0, L.y)
    fc.lid.rotation.set(L.r, 0, L.r * 0.4)
  }

  private updateBackground(k: number, w: number) {
    const col = (i: number) => {
      const bg = CHAPTERS[i]?.bg ?? CHAPTERS[CHAPTERS.length - 1].bg
      return bg === "flavor" ? "#" + this.flavorColor.getHexString() : bg
    }
    const base = col(k)
    const next = col(Math.min(k + 1, CHAPTERS.length - 1))
    const ty = (w > 0 ? (1 - w) * 100 : 101).toFixed(2)
    if (base !== this.bgCache.base) this.bgBase.style.backgroundColor = this.bgCache.base = base
    if (next !== this.bgCache.next) this.bgNext.style.backgroundColor = this.bgCache.next = next
    if (ty !== this.bgCache.y) {
      this.bgNext.style.transform = `translate3d(0, ${ty}%, 0)`
      this.bgCache.y = ty
    }
  }

  dispose() {
    this.cleanup.forEach((f) => f())
    this.cleanup = []
  }
}
