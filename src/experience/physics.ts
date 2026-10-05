import * as THREE from "three"
import { rot } from "./formations"

export type Body = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  ang: number
  va: number
  tx: number
  ty: number
  q: THREE.Quaternion
}

/**
 * A tiny 2D world on the z = 0 plane: gravity, walls, a floor, round-ish
 * bodies that shove each other apart, and one body at a time can be held by a
 * pointer and thrown. Cheap enough to run every frame on a phone (N ≤ 32).
 */
export class Physics {
  bodies: Body[] = []
  active = false
  grabbed = -1
  private gx = 0
  private gy = 0

  constructor(N: number, rand: number[][]) {
    for (let i = 0; i < N; i++) {
      const r = rand[i]
      this.bodies.push({
        x: 0, y: 0, z: (r[2] - 0.5) * 1.6,
        vx: 0, vy: 0, ang: r[3] * 6, va: 0,
        tx: -0.5 + r[4] * 0.6, ty: (r[5] - 0.5) * 1.2,
        q: new THREE.Quaternion(),
      })
    }
  }

  /** Take over from wherever the chips are, keeping their momentum. */
  start(pos: THREE.Vector3[], vel: THREE.Vector3[]) {
    this.active = true
    this.bodies.forEach((b, i) => {
      b.x = pos[i].x
      b.y = pos[i].y
      b.vx = vel[i].x * 0.6
      b.vy = vel[i].y * 0.6
    })
  }

  stop() {
    this.active = false
    this.grabbed = -1
  }

  pick(x: number, y: number, radius: number) {
    let best = -1
    let bd = radius * radius * 1.4
    this.bodies.forEach((b, i) => {
      const d = (b.x - x) ** 2 + (b.y - y) ** 2
      if (d < bd) {
        bd = d
        best = i
      }
    })
    return best
  }

  grab(i: number, x: number, y: number) {
    this.grabbed = i
    this.gx = x
    this.gy = y
  }

  moveGrab(x: number, y: number) {
    this.gx = x
    this.gy = y
  }

  /** Let go; returns the throw speed. */
  release() {
    const b = this.bodies[this.grabbed]
    this.grabbed = -1
    return b ? Math.hypot(b.vx, b.vy) : 0
  }

  /** A shove outward from a point — a tap on empty space, or the Shake button from the floor. */
  blast(x: number, y: number, power: number) {
    for (const b of this.bodies) {
      const dx = b.x - x
      const dy = b.y - y
      const d = Math.max(0.6, Math.hypot(dx, dy))
      const f = power / (d * 0.6 + 0.8)
      b.vx += (dx / d) * f
      b.vy += (dy / d) * f + power * 0.35
      b.va += (Math.random() - 0.5) * 20
    }
  }

  step(dt: number, W: number, H: number, r: number) {
    if (!this.active) return
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)))
    const h = dt / steps
    const floor = -H / 2 + r * 0.72
    const wall = W / 2 - r * 0.7
    for (let s = 0; s < steps; s++) {
      this.bodies.forEach((b, i) => {
        if (i === this.grabbed) {
          b.vx = Math.max(-40, Math.min(40, (this.gx - b.x) * 20))
          b.vy = Math.max(-40, Math.min(40, (this.gy - b.y) * 20))
          b.va *= 0.9
        } else {
          b.vy -= 22 * h
          b.vx *= 1 - 0.15 * h
          b.va *= 1 - 0.6 * h
        }
        b.x += b.vx * h
        b.y += b.vy * h
        b.ang += b.va * h
        if (b.y < floor) {
          b.y = floor
          if (b.vy < 0) b.vy = -b.vy * 0.32
          b.vx *= 1 - 4 * h
          b.va = b.va * 0.7 + (-b.vx / r) * 0.3
        }
        if (b.x < -wall) {
          b.x = -wall
          b.vx = Math.abs(b.vx) * 0.45
        } else if (b.x > wall) {
          b.x = wall
          b.vx = -Math.abs(b.vx) * 0.45
        }
        if (b.y > H * 1.2) b.vy = Math.min(b.vy, 0)
      })
      // pairwise shove
      const min = r * 1.25
      for (let i = 0; i < this.bodies.length; i++) {
        const a = this.bodies[i]
        for (let j = i + 1; j < this.bodies.length; j++) {
          const b = this.bodies[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const d2 = dx * dx + dy * dy
          if (d2 >= min * min || d2 < 1e-8) continue
          const d = Math.sqrt(d2)
          const nx = dx / d
          const ny = dy / d
          const push = (min - d) * 0.5
          const ka = i === this.grabbed ? 0 : 1
          const kb = j === this.grabbed ? 0 : 1
          const kt = ka + kb || 1
          a.x -= (nx * push * 2 * ka) / kt
          a.y -= (ny * push * 2 * ka) / kt
          b.x += (nx * push * 2 * kb) / kt
          b.y += (ny * push * 2 * kb) / kt
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
          if (rv < 0) {
            const imp = (-(1 + 0.3) * rv) / 2
            a.vx -= imp * nx * ka
            a.vy -= imp * ny * ka
            b.vx += imp * nx * kb
            b.vy += imp * ny * kb
            a.va += imp * 0.8
            b.va -= imp * 0.8
          }
        }
      }
    }
    for (const b of this.bodies) rot(b.q, b.tx + b.vy * 0.015, b.ty - b.vx * 0.015, 0, b.ang)
  }
}
