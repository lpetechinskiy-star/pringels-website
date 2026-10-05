/** Scroll scenes, in page order. `vh` is the section's scroll length; the scene sticks for vh − 100. */
export type Chapter = {
  id: SceneId
  label: string
  /** Background colour of the scene. "flavor" follows the chosen flavour. */
  bg: string
  /** Text colour that goes with `bg`. */
  ink: string
  vh: number
  vhMobile?: number
}

export type SceneId =
  | "hero"
  | "story"
  | "shape"
  | "stack"
  | "ingredients"
  | "flavors"
  | "history"
  | "play"
  | "community"
  | "finale"

export const CHAPTERS: Chapter[] = [
  { id: "hero", label: "Поток", bg: "#d4102b", ink: "#fff6e3", vh: 210 },
  { id: "story", label: "Полёт", bg: "#140b07", ink: "#fff6e3", vh: 280, vhMobile: 260 },
  { id: "shape", label: "Форма", bg: "#fff1d6", ink: "#1a0f0a", vh: 300, vhMobile: 280 },
  { id: "stack", label: "Стопка", bg: "#ffc21a", ink: "#1a0f0a", vh: 250 },
  { id: "ingredients", label: "Состав", bg: "#1a0f0a", ink: "#fff1d6", vh: 300, vhMobile: 280 },
  { id: "flavors", label: "Вкусы", bg: "flavor", ink: "flavor", vh: 220, vhMobile: 200 },
  { id: "history", label: "История", bg: "#fff1d6", ink: "#1a0f0a", vh: 380 },
  { id: "play", label: "Гравитация", bg: "#d4102b", ink: "#fff6e3", vh: 220 },
  { id: "community", label: "Башни", bg: "#ffc21a", ink: "#1a0f0a", vh: 240 },
  { id: "finale", label: "Финал", bg: "flavor", ink: "flavor", vh: 240 },
]
