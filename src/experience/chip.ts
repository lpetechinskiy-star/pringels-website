import * as THREE from "three"
import { rng } from "@/components/ui/disc-cascade-carousel"

/** Half-length and half-width of a chip at scale 1. */
export const CHIP_A = 1
export const CHIP_B = 0.72

/**
 * A potato chip is a hyperbolic paraboloid cut to an oval: z = x² − y².
 * The mesh is a thin closed shell — top, bottom and a rounded rim — with a
 * slightly wobbly outline and soft surface ripples so no two highlights match.
 */
export function createChipGeometry(detail: "high" | "low" = "high"): THREE.BufferGeometry {
  const RS = detail === "high" ? 14 : 9
  const AS = detail === "high" ? 64 : 40
  const T = 0.03
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []

  const ripple = (x: number, y: number) =>
    Math.sin(x * 7.1 + 0.6) * Math.sin(y * 9.3 + 1.1) * 0.6 + Math.sin(x * 13.7 - y * 5.2) * 0.4

  const vert = (r: number, th: number, side: 1 | -1) => {
    const wob = 1 + 0.024 * Math.sin(th * 5 + 1.3) + 0.014 * Math.sin(th * 11 + 0.4) + 0.008 * Math.sin(th * 17 + 2)
    const rr = r * (1 + (wob - 1) * r * r)
    const x = CHIP_A * rr * Math.cos(th)
    const y = CHIP_B * rr * Math.sin(th)
    const z = 0.36 * (x / CHIP_A) ** 2 - 0.3 * (y / CHIP_B) ** 2 + ripple(x, y) * 0.012 - 0.03
    // thinner toward the rim, like a real fried edge
    const t = T * (1 - 0.55 * r * r)
    pos.push(x, y, z + (side * t) / 2)
    uv.push((x / CHIP_A + 1) / 2, (y / CHIP_B + 1) / 2)
  }

  const surface = (side: 1 | -1) => {
    const base = pos.length / 3
    vert(0, 0, side)
    for (let k = 1; k <= RS; k++) for (let j = 0; j < AS; j++) vert(k / RS, (j / AS) * Math.PI * 2, side)
    const ring = (k: number, j: number) => base + 1 + (k - 1) * AS + (j % AS)
    for (let j = 0; j < AS; j++) {
      if (side > 0) idx.push(base, ring(1, j), ring(1, j + 1))
      else idx.push(base, ring(1, j + 1), ring(1, j))
    }
    for (let k = 2; k <= RS; k++)
      for (let j = 0; j < AS; j++) {
        const a = ring(k - 1, j)
        const b = ring(k, j)
        const c = ring(k, j + 1)
        const d = ring(k - 1, j + 1)
        if (side > 0) idx.push(a, b, c, a, c, d)
        else idx.push(a, c, b, a, d, c)
      }
    return (j: number) => ring(RS, j)
  }

  const top = surface(1)
  const bot = surface(-1)
  for (let j = 0; j < AS; j++) {
    const t0 = top(j)
    const t1 = top(j + 1)
    const b0 = bot(j)
    const b1 = bot(j + 1)
    idx.push(t0, b0, b1, t0, b1, t1)
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

function canvas(size: number) {
  const c = document.createElement("canvas")
  c.width = c.height = size
  return [c, c.getContext("2d")!] as const
}

/** Golden fried surface: toasted rim, blisters, a little grain. Plus a bump map and a seasoning mask. */
export function createChipTextures(size = 512) {
  const r = rng(42)
  const [cc, c] = canvas(size)
  const g = c.createRadialGradient(size * 0.48, size * 0.46, size * 0.05, size / 2, size / 2, size * 0.56)
  g.addColorStop(0, "#f7c560")
  g.addColorStop(0.55, "#eba63e")
  g.addColorStop(0.85, "#d4872a")
  g.addColorStop(1, "#a9601c")
  c.fillStyle = g
  c.fillRect(0, 0, size, size)

  const [bc, b] = canvas(size)
  b.fillStyle = "#808080"
  b.fillRect(0, 0, size, size)

  const blob = (ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, inner: string, outer: string) => {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, rad)
    gr.addColorStop(0, inner)
    gr.addColorStop(1, outer)
    ctx.fillStyle = gr
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
  }

  // blisters: lighter, raised bubbles with a darker toasted ring
  for (let i = 0; i < 140; i++) {
    const x = r() * size
    const y = r() * size
    const rad = 4 + r() * r() * 26
    blob(c, x, y, rad * 1.25, "rgba(160,92,24,0.18)", "rgba(160,92,24,0)")
    blob(c, x, y, rad, "rgba(255,226,150,0.35)", "rgba(255,226,150,0)")
    blob(b, x, y, rad, "rgba(255,255,255,0.55)", "rgba(255,255,255,0)")
  }
  // toasted spots
  for (let i = 0; i < 60; i++) {
    const x = r() * size
    const y = r() * size
    blob(c, x, y, 3 + r() * 10, "rgba(150,80,20,0.28)", "rgba(150,80,20,0)")
    blob(b, x, y, 3 + r() * 8, "rgba(0,0,0,0.25)", "rgba(0,0,0,0)")
  }
  // grain
  const img = c.getImageData(0, 0, size, size)
  const bim = b.getImageData(0, 0, size, size)
  for (let p = 0; p < img.data.length; p += 4) {
    const n = (r() - 0.5) * 16
    img.data[p] += n
    img.data[p + 1] += n
    img.data[p + 2] += n * 0.6
    bim.data[p] = bim.data[p + 1] = bim.data[p + 2] = bim.data[p] + (r() - 0.5) * 40
  }
  c.putImageData(img, 0, 0)
  b.putImageData(bim, 0, 0)

  // seasoning: white specks on black, clustered a little
  const [sc, s] = canvas(size)
  s.fillStyle = "#000"
  s.fillRect(0, 0, size, size)
  for (let k = 0; k < 26; k++) {
    const cx = r() * size
    const cy = r() * size
    const n = 20 + r() * 40
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2
      const d = r() * r() * 60
      const rad = 0.5 + r() * r() * 1.8
      s.fillStyle = "rgba(255,255,255," + (0.55 + r() * 0.45).toFixed(2) + ")"
      s.beginPath()
      s.arc(cx + Math.cos(a) * d * 0.7, cy + Math.sin(a) * d * 0.7, rad, 0, Math.PI * 2)
      s.fill()
    }
  }
  for (let i = 0; i < 700; i++) {
    s.fillStyle = "rgba(255,255,255," + (0.4 + r() * 0.6).toFixed(2) + ")"
    s.beginPath()
    s.arc(r() * size, r() * size, 0.4 + r() * 0.9, 0, Math.PI * 2)
    s.fill()
  }

  const map = new THREE.CanvasTexture(cc)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  const bump = new THREE.CanvasTexture(bc)
  const speck = new THREE.CanvasTexture(sc)
  return { map, bump, speck }
}

/**
 * Standard material with one change: the per-instance colour is the seasoning,
 * dusted through the speck mask instead of tinting the whole chip.
 */
export function createChipMaterial(tex: ReturnType<typeof createChipTextures>) {
  const m = new THREE.MeshStandardMaterial({
    map: tex.map,
    bumpMap: tex.bump,
    bumpScale: 2.2,
    roughness: 0.46,
    metalness: 0,
  })
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSpeck = { value: tex.speck }
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uSpeck;")
      .replace(
        "#include <color_fragment>",
        `#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
          float sp = texture2D( uSpeck, vMapUv ).r;
          diffuseColor.rgb *= mix( vec3( 1.0 ), vColor.rgb, 0.16 );
          diffuseColor.rgb = mix( diffuseColor.rgb, vColor.rgb, sp * 0.8 );
        #endif`,
      )
  }
  m.customProgramCacheKey = () => "chip-speck"
  return m
}

/** Soft, round contact shadow; instance colour .r carries its strength. */
export function createShadowMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color("#2a0f02") } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vStrength;
      void main() {
        vUv = uv;
        vStrength = 1.0;
        #ifdef USE_INSTANCING_COLOR
          vStrength = instanceColor.r;
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vStrength;
      void main() {
        float d = length( vUv - 0.5 ) * 2.0;
        float a = pow( clamp( 1.0 - d, 0.0, 1.0 ), 1.8 ) * vStrength;
        gl_FragColor = vec4( uColor, a );
      }
    `,
  })
}
