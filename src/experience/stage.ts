import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { createChipGeometry, createChipMaterial, createChipTextures, createShadowMaterial } from "./chip"
import { createCan, createLabelTexture, type CanParts } from "./can"
import { FLAVORS } from "@/data/flavors"

export const CAM_Z = 14

type Layer = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  chips: THREE.InstancedMesh
  shadows?: THREE.InstancedMesh
  /** Rendered last frame with nothing in it: skip until something arrives. */
  empty: boolean
}

/**
 * Two transparent WebGL canvases sandwich the page's typography: the back one
 * under the text, the front one over it. A chip is drawn on whichever side of
 * the text plane (z = 0) it is on, so it can fly behind a headline and come out
 * in front of it. Both share geometry, materials and the camera.
 */
export class Stage {
  camera: THREE.PerspectiveCamera
  back: Layer
  front: Layer
  flavorCans: CanParts[] = []
  finaleCan: CanParts
  labelTextures: THREE.Texture[] = []
  /** World size of the z = 0 plane. */
  W = 10
  H = 6
  width = 1
  height = 1
  mobile = false
  N: number
  private geo: THREE.BufferGeometry
  private mat: THREE.Material
  private lastW = 0

  constructor(backCanvas: HTMLCanvasElement, frontCanvas: HTMLCanvasElement, N: number, lowPower: boolean) {
    this.N = N
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120)
    this.camera.position.set(0, 0, CAM_Z)

    this.geo = createChipGeometry(lowPower ? "low" : "high")
    const tex = createChipTextures(lowPower ? 256 : 512)
    this.mat = createChipMaterial(tex)

    this.back = this.makeLayer(backCanvas, true, lowPower)
    this.front = this.makeLayer(frontCanvas, false, lowPower)

    FLAVORS.forEach((f, i) => {
      const t = createLabelTexture(f, i)
      this.labelTextures.push(t)
      const can = createCan(t)
      can.group.visible = false
      this.front.scene.add(can.group)
      this.flavorCans.push(can)
    })
    this.finaleCan = createCan(this.labelTextures[0])
    this.finaleCan.group.visible = false
    this.front.scene.add(this.finaleCan.group)

    this.resize()
  }

  private makeLayer(canvas: HTMLCanvasElement, withShadows: boolean, lowPower: boolean): Layer {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !lowPower && window.devicePixelRatio < 2,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
    })
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.95
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.55
    pmrem.dispose()

    scene.add(new THREE.HemisphereLight("#fff1d6", "#7a4a1c", 0.85))
    const key = new THREE.DirectionalLight("#fff0d2", 2.4)
    key.position.set(-4, 6, 8)
    scene.add(key)
    const rim = new THREE.DirectionalLight("#ffd29a", 1.4)
    rim.position.set(6, 2, -6)
    scene.add(rim)

    const chips = new THREE.InstancedMesh(this.geo, this.mat, this.N)
    chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    chips.frustumCulled = false
    const white = new THREE.Color("#fff3d9")
    for (let i = 0; i < this.N; i++) chips.setColorAt(i, white)
    chips.count = 0
    scene.add(chips)

    let shadows: THREE.InstancedMesh | undefined
    if (withShadows) {
      shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), createShadowMaterial(), this.N)
      shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      shadows.frustumCulled = false
      shadows.renderOrder = -1
      for (let i = 0; i < this.N; i++) shadows.setColorAt(i, new THREE.Color(0, 0, 0))
      scene.add(shadows)
    }
    return { renderer, scene, chips, shadows, empty: false }
  }

  setLabel(can: CanParts, flavor: number) {
    if (can.label.map !== this.labelTextures[flavor]) {
      can.label.map = this.labelTextures[flavor]
      can.label.needsUpdate = true
    }
  }

  resize() {
    const w = window.innerWidth
    // Phones resize the viewport as the URL bar slides; keep the tall size so the scene doesn't jump.
    const touch = window.matchMedia("(pointer: coarse)").matches
    const h = touch && w === this.lastW ? Math.max(this.height, window.innerHeight) : window.innerHeight
    this.lastW = w
    this.width = w
    this.height = h
    this.mobile = w < 768 || w / h < 0.8
    const dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.6 : 1.8)
    for (const l of [this.back, this.front]) {
      l.renderer.setPixelRatio(dpr)
      l.renderer.setSize(w, h, false)
      l.empty = false
    }
    this.camera.aspect = w / h
    this.camera.fov = this.mobile ? 40 : 32
    this.camera.updateProjectionMatrix()
    this.H = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))
    this.W = this.H * this.camera.aspect
  }

  render() {
    for (const l of [this.back, this.front]) {
      const anything = l.chips.count > 0 || (l === this.front && this.anyCanVisible())
      if (!anything && l.empty) continue
      l.renderer.render(l.scene, this.camera)
      l.empty = !anything
    }
  }

  private anyCanVisible() {
    return this.finaleCan.group.visible || this.flavorCans.some((c) => c.group.visible)
  }

  dispose() {
    for (const l of [this.back, this.front]) {
      l.renderer.dispose()
      l.scene.environment?.dispose()
    }
    this.geo.dispose()
    this.mat.dispose()
    this.labelTextures.forEach((t) => t.dispose())
  }
}
