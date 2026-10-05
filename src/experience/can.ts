import * as THREE from "three"
import type { Flavor } from "@/data/flavors"
import { rng } from "@/components/ui/disc-cascade-carousel"

export const CAN_R = 0.62
export const CAN_H = 2.5

const DISPLAY = '"Unbounded Variable", "Unbounded", system-ui, sans-serif'
const SANS = '"Onest Variable", "Onest", system-ui, sans-serif'

function fitFont(c: CanvasRenderingContext2D, text: string, weight: number, family: string, max: number, room: number) {
  let fs = max
  c.font = `${weight} ${fs}px ${family}`
  const w = c.measureText(text).width
  if (w > room) fs = Math.floor((fs * room) / w)
  c.font = `${weight} ${fs}px ${family}`
  return fs
}

/** The original "Изгиб" mascot: an oval face whose grin is a chip's saddle curve. */
function mascot(c: CanvasRenderingContext2D, x: number, y: number, s: number, f: Flavor) {
  c.save()
  c.translate(x, y)
  c.fillStyle = "rgba(0,0,0,.18)"
  c.beginPath()
  c.ellipse(6, 10, 150 * s, 112 * s, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = "#fffaf0"
  c.strokeStyle = "#241000"
  c.lineWidth = 9 * s
  c.beginPath()
  c.ellipse(0, 0, 150 * s, 112 * s, 0, 0, Math.PI * 2)
  c.fill()
  c.stroke()
  // eyes
  c.fillStyle = "#241000"
  for (const ex of [-46, 46]) {
    c.beginPath()
    c.ellipse(ex * s, -30 * s, 13 * s, 19 * s, 0, 0, Math.PI * 2)
    c.fill()
  }
  // brows lifted like the chip's long edges
  c.lineWidth = 8 * s
  c.lineCap = "round"
  c.beginPath()
  c.moveTo(-72 * s, -62 * s)
  c.quadraticCurveTo(-46 * s, -78 * s, -22 * s, -66 * s)
  c.moveTo(22 * s, -66 * s)
  c.quadraticCurveTo(46 * s, -78 * s, 72 * s, -62 * s)
  c.stroke()
  // the grin: a golden chip seen from the side
  const g = c.createLinearGradient(0, 10 * s, 0, 80 * s)
  g.addColorStop(0, "#ffd36b")
  g.addColorStop(1, "#d88a22")
  c.fillStyle = g
  c.beginPath()
  c.moveTo(-96 * s, 18 * s)
  c.quadraticCurveTo(0, 70 * s, 96 * s, 18 * s)
  c.quadraticCurveTo(0, 104 * s, -96 * s, 18 * s)
  c.fill()
  c.lineWidth = 7 * s
  c.stroke()
  // bow tie in the flavour's accent
  c.fillStyle = f.accent === "#fff3c4" || f.accent === "#eaf5ff" ? f.dark : f.accent
  c.beginPath()
  c.moveTo(0, 128 * s)
  c.lineTo(-44 * s, 108 * s)
  c.lineTo(-44 * s, 150 * s)
  c.closePath()
  c.moveTo(0, 128 * s)
  c.lineTo(44 * s, 108 * s)
  c.lineTo(44 * s, 150 * s)
  c.closePath()
  c.fill()
  c.lineWidth = 5 * s
  c.stroke()
  c.restore()
}

function chipDrawing(c: CanvasRenderingContext2D, x: number, y: number, w: number, rot: number) {
  c.save()
  c.translate(x, y)
  c.rotate(rot)
  c.fillStyle = "rgba(0,0,0,.22)"
  c.beginPath()
  c.ellipse(10, 16, w, w * 0.42, 0, 0, Math.PI * 2)
  c.fill()
  const g = c.createLinearGradient(-w, -w * 0.4, w, w * 0.4)
  g.addColorStop(0, "#ffe08a")
  g.addColorStop(0.5, "#f2b54f")
  g.addColorStop(1, "#c9781f")
  c.fillStyle = g
  c.beginPath()
  c.moveTo(-w, -w * 0.08)
  c.bezierCurveTo(-w * 0.6, -w * 0.62, w * 0.6, -w * 0.62, w, -w * 0.08)
  c.bezierCurveTo(w * 0.7, w * 0.22, w * 0.2, w * 0.5, 0, w * 0.32)
  c.bezierCurveTo(-w * 0.2, w * 0.5, -w * 0.7, w * 0.22, -w, -w * 0.08)
  c.fill()
  c.fillStyle = "rgba(255,255,255,.45)"
  c.beginPath()
  c.ellipse(-w * 0.2, -w * 0.2, w * 0.35, w * 0.07, -0.2, 0, Math.PI * 2)
  c.fill()
  c.restore()
}

/** The wrap-around label. u = 0.5 faces the viewer; the back carries the fine print. */
export function createLabelTexture(f: Flavor, index: number) {
  const W = 1600
  const H = 1024
  const cv = document.createElement("canvas")
  cv.width = W
  cv.height = H
  const c = cv.getContext("2d")!
  const r = rng(7 + index * 13)

  const bg = c.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, f.base)
  bg.addColorStop(0.62, f.base)
  bg.addColorStop(1, f.dark)
  c.fillStyle = bg
  c.fillRect(0, 0, W, H)

  // a burst of light behind the hero chip
  const glow = c.createRadialGradient(W / 2, 760, 10, W / 2, 760, 520)
  glow.addColorStop(0, "rgba(255,255,255,.42)")
  glow.addColorStop(1, "rgba(255,255,255,0)")
  c.fillStyle = glow
  c.fillRect(0, 0, W, H)
  c.save()
  c.translate(W / 2, 760)
  c.fillStyle = "rgba(255,255,255,.07)"
  for (let k = 0; k < 18; k++) {
    c.rotate((Math.PI * 2) / 18)
    c.beginPath()
    c.moveTo(0, 0)
    c.lineTo(-40, -700)
    c.lineTo(40, -700)
    c.fill()
  }
  c.restore()
  for (let i = 0; i < 90; i++) {
    c.fillStyle = "rgba(255,255,255," + (0.15 + r() * 0.5).toFixed(2) + ")"
    c.beginPath()
    c.arc(400 + r() * 800, r() * H, 1 + r() * 3, 0, Math.PI * 2)
    c.fill()
  }

  mascot(c, W / 2, 190, 0.92, f)

  // wordmark
  c.save()
  c.translate(W / 2, 430)
  c.rotate(-0.06)
  c.textAlign = "center"
  c.textBaseline = "middle"
  fitFont(c, "litenergles", 900, DISPLAY, 120, 560)
  c.lineJoin = "round"
  c.lineWidth = 22
  c.strokeStyle = "#2a1300"
  c.strokeText("litenergles", 0, 0)
  c.fillStyle = "#ffd23f"
  c.fillText("litenergles", 0, 0)
  c.restore()

  // flavour tag
  const name = f.name.toUpperCase()
  c.font = `800 10px ${DISPLAY}`
  const fs = fitFont(c, name, 800, DISPLAY, 62, 420)
  const tw = c.measureText(name).width + 70
  c.save()
  c.translate(W / 2, 560)
  c.rotate(0.03)
  c.fillStyle = f.accent
  c.strokeStyle = "#2a1300"
  c.lineWidth = 6
  c.beginPath()
  c.roundRect(-tw / 2, -fs * 0.95, tw, fs * 1.9, 16)
  c.fill()
  c.stroke()
  c.fillStyle = f.accent === "#ffd23f" || f.accent === "#f6e14b" || f.accent === "#fff3c4" || f.accent === "#eaf5ff" ? "#2a1300" : "#fff"
  c.textAlign = "center"
  c.textBaseline = "middle"
  c.fillText(name, 0, 4)
  c.restore()

  chipDrawing(c, W / 2 - 40, 780, 190, -0.18)
  chipDrawing(c, W / 2 + 60, 860, 160, 0.12)

  c.fillStyle = f.ink === "#231100" ? "#231100" : "#ffffff"
  c.font = `600 34px ${SANS}`
  c.textAlign = "left"
  c.fillText("165 г", 520, 990)
  c.textAlign = "right"
  c.fillText("гипербола вкуса", 1080, 990)

  // back: fine print running round the can
  c.save()
  c.globalAlpha = 0.85
  c.textAlign = "center"
  for (const bx of [170, 1430]) {
    c.font = `800 46px ${DISPLAY}`
    c.fillText("litenergles", bx, 140)
    c.font = `500 26px ${SANS}`
    const lines = [
      "Пищевая ценность на 100 г",
      "Энергия — много",
      "Хруст — максимальный",
      "Изгиб — 1 шт.",
      "",
      "Хранить в стопке.",
      "Открывать осторожно:",
      "остановиться сложно.",
      "",
      "Вымышленный бренд.",
      "Концепт для портфолио.",
    ]
    lines.forEach((l, k) => c.fillText(l, bx, 230 + k * 44))
    c.strokeStyle = "rgba(255,255,255,.5)"
    c.lineWidth = 2
    c.strokeRect(bx - 150, 190, 300, 210)
  }
  c.restore()

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export type CanParts = {
  group: THREE.Group
  body: THREE.Mesh
  lid: THREE.Mesh
  label: THREE.MeshStandardMaterial
}

const shared: { body?: THREE.CylinderGeometry; lid?: THREE.CylinderGeometry; rim?: THREE.TorusGeometry; metal?: THREE.MeshStandardMaterial; plastic?: THREE.MeshStandardMaterial } = {}

/** A can: printed side, metal ends, a clear-ish plastic lid that can pop off. */
export function createCan(map: THREE.Texture): CanParts {
  shared.body ??= new THREE.CylinderGeometry(CAN_R, CAN_R, CAN_H, 72, 1, false, Math.PI)
  shared.lid ??= new THREE.CylinderGeometry(CAN_R * 1.04, CAN_R * 1.04, 0.13, 72)
  shared.rim ??= new THREE.TorusGeometry(CAN_R * 1.005, 0.03, 8, 72)
  shared.metal ??= new THREE.MeshStandardMaterial({ color: "#d8dce1", metalness: 1, roughness: 0.28 })
  shared.plastic ??= new THREE.MeshStandardMaterial({ color: "#f4efe4", metalness: 0, roughness: 0.38 })
  const label = new THREE.MeshStandardMaterial({ map, roughness: 0.3, metalness: 0.1 })
  const body = new THREE.Mesh(shared.body, [label, shared.metal, shared.metal])
  const lid = new THREE.Mesh(shared.lid, shared.plastic)
  lid.position.y = CAN_H / 2 + 0.06
  const rim = new THREE.Mesh(shared.rim, shared.metal)
  rim.rotation.x = Math.PI / 2
  rim.position.y = -CAN_H / 2
  const group = new THREE.Group()
  group.add(body, lid, rim)
  return { group, body, lid, label }
}
