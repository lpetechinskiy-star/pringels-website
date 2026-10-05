import * as THREE from "three"
import { CHIP_A, CHIP_B } from "./chip"
import { CAN_H, CAN_R } from "./can"

/**
 * Every scene is a formation: a function from (chip, scroll progress) to a
 * target pose. The director blends neighbouring formations while the page
 * scrolls between scenes, and springs chase the result — so the scroll
 * decides where every chip should be and physics decides how it gets there.
 */

export type Pose = { p: THREE.Vector3; q: THREE.Quaternion; s: number; shadow: number }

export type HeroState = {
  a: number
  b: number
  adv: number
  intro: "stack" | "pop" | "done"
  popAt: number
  rise: number
  squash: number
  mx: number
  my: number
}

export type Ctx = {
  N: number
  W: number
  H: number
  /** Base chip scale. A chip at scale S is 2S long. */
  S: number
  C: number
  mobile: boolean
  time: number
  R: number[][]
  hero: HeroState
  flavorB: number
  canScale: number
  finale: { open: boolean; popAt: number; spin: number }
  towers: { j: number; k: number; max: number; T: number }[]
  physics: { x: number; y: number; z: number; q: THREE.Quaternion }[]
}

export const DEG = Math.PI / 180
const _e = new THREE.Euler()
const _q = new THREE.Quaternion()
const _q2 = new THREE.Quaternion()
const _qt = new THREE.Quaternion()
const _v = new THREE.Vector3()
const X = new THREE.Vector3(1, 0, 0)
const Y = new THREE.Vector3(0, 1, 0)
const Z = new THREE.Vector3(0, 0, 1)

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const mod = (a: number, n: number) => ((a % n) + n) % n
export function smooth(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

/** Rz(z)·Ry(y)·Rx(x), then a roll about the chip's own normal. */
export function rot(q: THREE.Quaternion, x: number, y: number, z: number, roll = 0) {
  q.setFromEuler(_e.set(x, y, z, "ZYX"))
  if (roll) q.multiply(_q.setFromAxisAngle(Z, roll))
  return q
}

/** A chip lying flat (normal up), spun about the vertical and tipped toward the camera. */
export function flat(q: THREE.Quaternion, spin: number, tip: number) {
  q.setFromAxisAngle(X, tip)
  q.multiply(_q.setFromAxisAngle(Y, spin))
  q.multiply(_q2.setFromAxisAngle(X, -Math.PI / 2))
  return q
}

function tumble(q: THREE.Quaternion, r: number[], k: number) {
  return rot(q, r[3] * 6 + k * (0.6 + r[4]), r[4] * 6 + k * (0.4 + r[5] * 0.5), r[5] * 6 + k * (r[6] > 0.5 ? 0.7 : -0.7))
}

// ---- 0 · Hero: the stream ----------------------------------------------------------------
const HERO_DESK = { sp: 0.62, rise: 0.25, depth: 0.5, cx: 0.06, cy: -0.05, tx: 2.2, ty: 0.7, ahead: 5 }
const HERO_MOB = { sp: 0.24, rise: 0.5, depth: 0.45, cx: 0, cy: -0.07, tx: 0.6, ty: 1.4, ahead: 4 }

export function heroAhead(c: Ctx) {
  return c.mobile ? HERO_MOB.ahead : HERO_DESK.ahead
}

/** The intro column: chips nested flat, rising from below and spinning. */
function column(i: number, c: Ctx, o: Pose) {
  const h = c.hero
  const gap = c.S * 0.105 * (1 - 0.45 * h.squash)
  o.p.set(0, (i - c.N / 2) * gap + h.rise, 0.6)
  flat(o.q, c.time * 2.4, 0.42)
  o.s = c.S * 0.95
  o.shadow = 0.6
}

/**
 * The reference's cascade, as an endless stream. Slot offset d runs from deep
 * in the background (negative) to past the camera (positive). Position follows
 * the line spring `a`; depth, turn and roll follow the trailing spring `b`, so
 * the chips swing into place a beat late — exactly the disc carousel's motion.
 */
export function hero(i: number, _t: number, c: Ctx, o: Pose) {
  const h = c.hero
  if (h.intro === "stack" || (h.intro === "pop" && c.time < h.popAt + c.R[i][0] * 0.22)) return column(i, c, o)
  const L = c.mobile ? HERO_MOB : HERO_DESK
  const N = c.N
  const C = c.C
  const d = mod(i - (h.a + h.adv), N) - (N - L.ahead)
  let db = mod(i - (h.b + h.adv), N) - (N - L.ahead)
  if (db - d > N / 2) db -= N
  else if (d - db > N / 2) db += N

  let x: number, y: number, z: number
  if (d >= -3) {
    x = d * L.sp * C
    y = d * L.rise * C
  } else {
    const e = -3 - d
    const k = 1 - Math.exp(-e / 5)
    x = -3 * L.sp * C - L.tx * C * k - e * 0.04 * C
    y = -3 * L.rise * C - L.ty * C * k + Math.sin(e * 0.8 + c.time * 0.9) * 0.12 * C * Math.min(1, e)
  }
  z = db >= -3 ? Math.min(db, 2.2) * L.depth * C : -3 * L.depth * C - (-3 - db) * 1.25 * C
  y += Math.sin(c.time * 1.2 + i * 1.7) * 0.03 * C
  o.p.set(x + L.cx * c.W, y + L.cy * c.H, z)

  const act = Math.max(0, 1 - Math.abs(db))
  rot(o.q, -0.55 + h.my * 0.35 * act, (22 + db * -10) * DEG + h.mx * 0.45 * act, -6 * DEG, db * 110 * DEG)
  const near = 1 - smooth(L.ahead - 0.9, L.ahead, d)
  const far = 1 - smooth(N - L.ahead - 3, N - L.ahead - 0.6, -d)
  o.s = c.S * (1 + 0.12 * act) * near * far
  o.shadow = clamp(1 + z / 7)
}

// ---- 1 · Story: a tunnel you fly through -------------------------------------------------
export function story(i: number, t: number, c: Ctx, o: Pose) {
  const r = c.R[i]
  const L = 64
  const zr = mod(r[0] * L + t * L * 1.4 + c.time * 1.1, L)
  const z = zr - (L - 10)
  const ang = r[1] * Math.PI * 2 + t * 1.6 + zr * 0.02
  const rad = 0.55 + r[2] * 0.6
  o.p.set(Math.cos(ang) * rad * c.W * 0.5, Math.sin(ang) * rad * c.H * 0.5, z)
  tumble(o.q, r, t * 5 + c.time * 0.4)
  o.s = c.S * 0.85 * (1 - smooth(7, 10, z)) * smooth(L * -1 + 10, L * -1 + 20, z)
  o.shadow = 0
}

// ---- 2 · Shape: one chip, three views ------------------------------------------------------
const VIEWS = [
  [-0.35, 0.55, -0.2],
  [-1.42, 0.02, 0.0],
  [-0.1, 1.45, 0.06],
  [-0.7, -0.45, 0.35],
].map(([x, y, z]) => rot(new THREE.Quaternion(), x, y, z))

export function shape(i: number, t: number, c: Ctx, o: Pose) {
  const cx = c.mobile ? 0 : 0.2 * c.W
  const cy = c.mobile ? 0.04 * c.H : -0.02 * c.H
  if (i === 0) {
    o.p.set(cx, cy + Math.sin(c.time * 0.8) * 0.06, c.mobile ? 1 : 1.2)
    const seg = clamp(t * 1.1 - 0.02) * 3
    const k = Math.min(2, Math.floor(seg))
    o.q.copy(VIEWS[k]).slerp(VIEWS[k + 1], smooth(0.25, 0.85, seg - k))
    o.q.multiply(_q.setFromAxisAngle(Y, Math.sin(c.time * 0.5) * 0.05))
    o.s = c.mobile ? Math.min(c.S * 2.0, c.W * 0.4) : c.S * 2.7
    o.shadow = 1
    return
  }
  const r = c.R[i]
  const th = (Math.PI * 2 * (i - 1)) / (c.N - 1) + t * Math.PI * 1.2 + c.time * 0.12
  const R = c.mobile ? c.W * 0.62 : c.W * 0.4
  o.p.set(cx + Math.cos(th) * R, cy + Math.sin(th) * R * 0.32 + (r[0] - 0.5) * 0.6, -3.5 + Math.sin(th) * 4.5)
  rot(o.q, th * 2 + r[1] * 6, th + r[2] * 6, th * 0.5)
  o.s = c.S * 0.55
  o.shadow = 0.5
}

// ---- 3 · Stack: the shape explains itself --------------------------------------------------
export function stackArrive(i: number, t: number, N: number) {
  const s = (i / N) * 0.85
  return smooth(s, s + 0.12, t * 1.08)
}

export function stack(i: number, t: number, c: Ctx, o: Pose) {
  const r = c.R[i]
  const a = stackArrive(i, t, c.N)
  const cx = c.mobile ? 0 : -0.2 * c.W
  const base = c.mobile ? -0.38 * c.H : -0.3 * c.H
  const gap = c.S * (c.mobile ? 0.12 : 0.1)
  // waiting cloud
  const th = i * 2.399 + c.time * 0.35
  const ccx = c.mobile ? 0 : -0.24 * c.W
  const ccy = c.mobile ? 0.04 * c.H : 0.2 * c.H
  const rx = c.mobile ? 0.42 * c.W : 0.2 * c.W
  const ry = c.mobile ? 0.2 * c.H : 0.2 * c.H
  _v.set(ccx + Math.cos(th) * rx * (0.5 + r[0] * 0.5), ccy + Math.sin(th) * ry * (0.5 + r[1] * 0.5), -2 + r[2] * 4)
  o.p.set(cx, base + i * gap, 0.3)
  o.p.lerpVectors(_v, o.p, a)
  const arc = Math.sin(Math.PI * a)
  o.p.y += arc * c.C * 0.9
  o.p.z += arc * 1.5
  tumble(_qt, r, c.time * 0.5)
  flat(o.q, t * Math.PI * 1.2 + 0.4, 0.42)
  o.q.copy(_qt.slerp(o.q, a))
  o.s = c.S * 0.9
  o.shadow = 0.5 + a * 0.5
}

// ---- 4 · Ingredients: a ring that threads the words ----------------------------------------
const RING_DESK = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.32, 0, -0.18, "ZYX"))
const RING_MOB = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.32, 0, Math.PI / 2 - 0.25, "ZYX"))

export function ingredients(i: number, t: number, c: Ctx, o: Pose) {
  const R = c.mobile ? c.W * 0.46 : c.W * 0.34
  const th = (Math.PI * 2 * i) / c.N + t * Math.PI * 2 * 0.8 + c.time * 0.12
  const ring = c.mobile ? RING_MOB : RING_DESK
  o.p.set(Math.cos(th) * R, 0, Math.sin(th) * R).applyQuaternion(ring)
  if (!c.mobile) o.p.y -= 0.02 * c.H
  o.q.copy(ring)
  o.q.multiply(_q.setFromAxisAngle(Y, -th + Math.PI / 2))
  o.q.multiply(_q2.setFromAxisAngle(X, 0.6))
  o.q.multiply(_q2.setFromAxisAngle(Z, th * 3 + c.R[i][0] * 6))
  o.s = c.S * 0.85
  o.shadow = 0.4
}

// ---- 5 · Flavours: a vortex round the chosen can -------------------------------------------
export function flavorCenter(c: Ctx, out: THREE.Vector3) {
  return out.set(c.mobile ? 0 : 0.17 * c.W, c.mobile ? 0.02 * c.H : -0.03 * c.H, 0)
}

export function flavors(i: number, _t: number, c: Ctx, o: Pose) {
  const r = c.R[i]
  flavorCenter(c, _v)
  const th = i * 2.399 + c.time * (0.45 + r[0] * 0.4) + c.flavorB * 1.4
  const rad = CAN_R * c.canScale * (c.mobile ? 1.35 : 1.7) * (0.85 + r[1] * 0.6)
  const y = (i / c.N - 0.5) * c.H * (c.mobile ? 0.62 : 0.9) + Math.sin(c.time * 0.6 + i) * 0.15
  o.p.set(_v.x + Math.cos(th) * rad, _v.y + y, Math.sin(th) * rad)
  tumble(o.q, r, c.time * 0.8)
  o.s = c.S * (c.mobile ? 0.55 : 0.58)
  o.shadow = 0.6
}

// ---- 6 · History: chips roll along the floor like wheels -----------------------------------
export function history(i: number, t: number, c: Ctx, o: Pose) {
  const r = c.R[i]
  const row = i % 3
  const z = [-5, -1.8, 1.2][row]
  const k = (14 - z) / 14
  const span = c.W * k * 1.5
  const per = Math.ceil(c.N / 3)
  const travel = t * c.W * 2.6 * (1 + row * 0.15) + c.time * 0.35
  const x = mod((Math.floor(i / 3) * span) / per + r[0] * 0.3 - travel, span) - span / 2
  const s = c.S * 0.72
  const ang = x / (s * (CHIP_A + CHIP_B) * 0.5)
  const hgt = s * Math.sqrt((CHIP_A * Math.sin(ang)) ** 2 + (CHIP_B * Math.cos(ang)) ** 2)
  const floor = -c.H * 0.5 * k + (c.mobile ? 0.1 : 0.07) * c.H * k
  o.p.set(x, floor + hgt, z)
  rot(o.q, -0.15, 0.35, 0, ang)
  o.s = s
  o.shadow = 0.8
}

// ---- 7 · Gravity: the physics owns them ----------------------------------------------------
export function play(i: number, _t: number, c: Ctx, o: Pose) {
  const b = c.physics[i]
  o.p.set(b.x, b.y, b.z)
  o.q.copy(b.q)
  o.s = c.S * (c.mobile ? 0.8 : 0.85)
  o.shadow = 0.7
}

// ---- 8 · Community: towers built by the crowd ----------------------------------------------
export function community(i: number, t: number, c: Ctx, o: Pose) {
  const r = c.R[i]
  const tw = c.towers[i]
  const span = c.mobile ? 0.3 : 0.34
  const tx = tw.T === 1 ? 0 : lerp(-span, span, tw.j / (tw.T - 1)) * c.W
  const base = c.mobile ? -0.04 * c.H : -0.14 * c.H
  const s = c.S * 0.72
  const gap = s * 0.2
  const start = (tw.k / Math.max(1, tw.max)) * 0.72 + tw.j * 0.04
  const a = smooth(start, start + 0.14, t * 1.15)
  _v.set(tx + (r[0] - 0.5) * 0.8, c.H * 0.75 + tw.k * 0.5, (r[1] - 0.5) * 2)
  o.p.set(tx, base + tw.k * gap, 0)
  o.p.lerpVectors(_v, o.p, a)
  tumble(_qt, r, c.time * 0.6)
  flat(o.q, tw.j * 0.7 + t * 0.8, 0.45)
  o.q.copy(_qt.slerp(o.q, a))
  o.s = s
  o.shadow = a
}

// ---- 9 · Finale: back into the can, then out again -----------------------------------------
export function finaleCenter(c: Ctx, out: THREE.Vector3) {
  return out.set(0, c.mobile ? -0.03 * c.H : -0.04 * c.H, 0)
}

export function finale(i: number, t: number, c: Ctx, o: Pose) {
  const r = c.R[i]
  finaleCenter(c, _v)
  const cs = c.canScale
  const sIn = ((CAN_R * cs * 0.86) / CHIP_A) * 1
  const gap = sIn * 0.075
  const base = _v.y - CAN_H * cs * 0.42
  const start = (i / c.N) * 0.4
  const a = smooth(start, start + 0.12, t)
  const f = c.finale
  const tau = c.time - f.popAt
  if (f.open && tau < 2.4) {
    const d = Math.max(0, tau - r[4] * 0.3)
    const phi = r[0] * Math.PI * 2
    const sp = 1.8 + r[2] * 3
    o.p.set(
      _v.x + Math.cos(phi) * sp * d * (c.mobile ? 0.6 : 1),
      _v.y + CAN_H * cs * 0.5 + (3 + r[3] * 3.2) * d - 3.25 * d * d,
      Math.sin(phi) * sp * d * 0.8,
    )
    o.p.y = Math.max(o.p.y, -c.H * 0.45)
    tumble(o.q, r, d * 7)
    o.s = c.S * 0.9
    o.shadow = 0.6
    return
  }
  const th = i * 2.399 + t * 7 + c.time * 0.3
  const rad = (1.4 + r[0] * 1.5) * c.C * (1 - t)
  const sx = _v.x + Math.cos(th) * rad
  const sy = _v.y + (r[1] - 0.5) * c.H * 0.7 * (1 - t)
  const sz = Math.sin(th) * rad
  o.p.set(sx + (_v.x - sx) * a, sy + (base + i * gap - sy) * a, sz * (1 - a))
  o.p.y += Math.sin(Math.PI * a) * c.C * 0.8
  tumble(_qt, r, t * 6)
  flat(o.q, f.spin, 0)
  o.q.copy(_qt.slerp(o.q, a))
  o.s = lerp(c.S * 0.8, sIn, a)
  o.shadow = 1 - a
}

export const FORMATIONS = [hero, story, shape, stack, ingredients, flavors, history, play, community, finale]
